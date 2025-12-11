const Product = require('../models/product');
const ProductVariant = require('../models/productVariant');
const redisClient = require('../config/redis');
const { DatabaseError } = require('../utils/errors/AppError');
const logger = require('../config/logger');

class ProductService {
    constructor() {
        this.cacheTTL = 3600; // 1 hour
    }

    /**
     * Create product with variants (transactional)
     */
    async createProductWithVariants(productData, variantsData, files, userId) {
        const session = await Product.startSession();
        
        try {
            session.startTransaction();

            // Step 1: Create base product
            const product = await this.createBaseProduct(productData, files.mainImage, userId, session);

            // Step 2: Process variants in parallel with controlled concurrency
            const variants = await this.processVariants(
                variantsData,
                files.variants,
                product._id,
                session
            );

            // Step 3: Update product with variant data
            await this.updateProductVariants(product, variants, session);

            // Step 4: Generate searchable text
            product.searchableText = this.generateSearchableText(product, variants);
            await product.save({ session });

            // Commit transaction
            await session.commitTransaction();

            // Invalidate cache
            await this.invalidateProductCache(product._id);

            return this.enrichProductResponse(product, variants);

        } catch (error) {
            await session.abortTransaction();
            logger.error('Product creation failed:', error);
            throw new DatabaseError('Failed to create product');
        } finally {
            session.endSession();
        }
    }

    /**
     * Update product with variants
     */
    async updateProductWithVariants(productId, updateData, variantsData, files, userId) {
        const session = await Product.startSession();

        try {
            session.startTransaction();

            // Get existing product with variants
            const [product, existingVariants] = await Promise.all([
                Product.findById(productId).session(session),
                ProductVariant.find({ productId }).session(session)
            ]);

            if (!product) {
                throw new AppError('Product not found', 404);
            }

            // Update base product
            await this.updateBaseProduct(product, updateData, files.mainImage, userId, session);

            // Process variants (update/create/delete)
            const updatedVariants = await this.processVariantUpdates(
                variantsData,
                files.variants,
                productId,
                existingVariants,
                session
            );

            // Update product with new variant data
            await this.updateProductVariants(product, updatedVariants, session);

            // Update searchable text
            product.searchableText = this.generateSearchableText(product, updatedVariants);
            product.updatedBy = userId;
            await product.save({ session });

            await session.commitTransaction();

            // Invalidate cache
            await this.invalidateProductCache(productId);

            return this.enrichProductResponse(product, updatedVariants);

        } catch (error) {
            await session.abortTransaction();
            logger.error('Product update failed:', error);
            throw error instanceof AppError ? error : new DatabaseError('Failed to update product');
        } finally {
            session.endSession();
        }
    }

    /**
     * Get product with caching
     */
    async getProductById(productId) {
        // const cacheKey = `product:${productId}`;

        try {
            // Try cache first
            // const cached = await redisClient.get(cacheKey);
            // if (cached) {
                // return JSON.parse(cached);
            // }

            // Get from database with optimized query
            const product = await Product.findById(productId)
                .populate({
                    path: 'variants',
                    select: '-__v -createdAt -updatedAt',
                    options: { lean: true }
                })
                .populate({
                    path: 'productType',
                    select: 'name slug'
                })
                .lean();

            if (!product) {
                throw new AppError('Product not found', 404);
            }

            // Cache the result
            // await redisClient.setex(cacheKey, this.cacheTTL, JSON.stringify(product));

            return product;
        } catch (error) {
            throw error instanceof AppError ? error : new DatabaseError('Failed to fetch product');
        }
    }

    /**
     * Helper: Create base product
     */
    async createBaseProduct(data, mainImage, userId, session) {
        const productData = {
            ...data,
            createdBy: userId,
            updatedBy: userId
        };

        if (mainImage) {
            // Handle main image upload if needed
            productData.mainImage = mainImage.url;
        }

        const product = new Product(productData);
        await product.save({ session });
        return product;
    }

    /**
     * Helper: Process variants with concurrency control
     */
    async processVariants(variantsData, variantFiles, productId, session) {
        const maxConcurrent = 3;
        const results = [];

        for (let i = 0; i < variantsData.length; i += maxConcurrent) {
            const chunk = variantsData.slice(i, i + maxConcurrent);
            const chunkFiles = variantFiles || {};

            const chunkPromises = chunk.map(async (variant, index) => {
                const globalIndex = i + index;
                const files = chunkFiles[globalIndex] || { images: [] };
                
                return this.createVariant(
                    variant,
                    files.images,
                    productId,
                    globalIndex === 0, // First variant is default
                    session
                );
            });

            const chunkResults = await Promise.all(chunkPromises);
            results.push(...chunkResults);
        }

        return results;
    }

    /**
     * Helper: Create single variant
     */
    async createVariant(variantData, images, productId, isDefault, session) {
        const variant = new ProductVariant({
            productId,
            color: variantData.color,
            sizes: variantData.sizes,
            images,
            isDefault,
            sku: variantData.sku || SKUHelper.generateSKU(
                variantData.title || 'PROD',
                variantData.color?.name,
                variantData.sizes?.[0]?.size
            )
        });

        await variant.save({ session });
        return variant;
    }

    /**
     * Helper: Update product with variant info
     */
    async updateProductVariants(product, variants, session) {
        product.variants = variants.map(v => v._id);
        product.numVariants = variants.length;
        product.totalStock = variants.reduce((total, variant) => {
            return total + variant.sizes.reduce((sum, size) => sum + size.stock, 0);
        }, 0);
        product.colors = variants.map(v => ({
            name: v.color.name,
            value: v.color.value,
            image: v.images[0]?.url || null
        }));

        await product.save({ session });
    }

    /**
     * Helper: Generate searchable text
     */
    generateSearchableText(product, variants) {
        const colorNames = variants.map(v => v.color.name).join(' ');
        const sizeNames = variants
            .flatMap(v => v.sizes.map(s => s.size))
            .join(' ');

        return `${product.title} ${product.description} ${colorNames} ${sizeNames}`
            .toLowerCase()
            .trim();
    }

    /**
     * Helper: Enrich product response
     */
    enrichProductResponse(product, variants) {
        return {
            ...product.toObject(),
            variants,
            analytics: {
                totalStock: product.totalStock,
                numVariants: product.numVariants,
                availableColors: product.colors.length
            }
        };
    }

    /**
     * Invalidate product cache
     */
    async invalidateProductCache(productId) {
        const patterns = [
            `product:${productId}`,
            'products:list:*'
        ];

        const deletePromises = patterns.map(pattern =>
            redisClient.keys(pattern).then(keys => {
                if (keys.length) {
                    return redisClient.del(...keys);
                }
            })
        );

        await Promise.all(deletePromises);
    }
}

module.exports = new ProductService();