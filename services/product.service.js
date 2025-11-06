const Product = require("../models/product");
const ProductVariant = require("../models/productVariant");
const { uploadImage } = require("../utils/file.utils");
const mongoose = require("mongoose");
const ApiError = require("../utils/ApiError");

/**
 * Upload variant images in parallel
 * @param {Array<Express.Multer.File>} variantImages - Array of variant images
 * @param {string} productTitle - Product title (for Cloudinary folder path)
 * @param {string} colorName - Variant color name (for alt text)
 * @returns {Promise<Array<{url: string, publicId: string, alt: string}>>}
 */
const uploadVariantImages = async (variantImages, productTitle, colorName) => {
  if (!variantImages || variantImages.length === 0) {
    return [];
  }

  const sanitizedTitle = productTitle
    .replace(/[^a-zA-Z0-9]/g, "-")
    .toLowerCase()
    .substring(0, 50);

  return Promise.all(
    variantImages.map(async (img) => {
      try {
        const uploadResult = await uploadImage(
          img.buffer,
          `products/variants/${sanitizedTitle}`
        );
        return {
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          alt: colorName || "product image",
        };
      } catch (error) {
        console.error(`Failed to upload image for variant ${colorName}:`, error);
        throw new ApiError(`Failed to upload image: ${error.message}`, 500);
      }
    })
  );
};

/**
 * Create ProductVariants and link them to the Product
 * @param {ObjectId} productId - Product ID
 * @param {Array} variants - Variants with image data already added
 * @param {mongoose.Session} session - MongoDB session
 * @returns {Promise<Array<ObjectId>>} - Array of ProductVariant ObjectIds
 */
const createProductVariants = async (productId, variants, session) => {
  if (!variants || variants.length === 0) {
    throw new ApiError("At least one variant is required", 400);
  }

  // Ensure exactly one default variant
  const defaultVariants = variants.filter((v) => v.isDefault);
  if (defaultVariants.length === 0) {
    // Mark first variant as default if none is marked
    variants[0].isDefault = true;
  } else if (defaultVariants.length > 1) {
    throw new ApiError("Exactly one variant must be marked as default", 400);
  }

  const variantDocs = variants.map((v, index) => ({
    productId,
    sku: v.sku || null,
    color: {
      name: v.color.name.trim(),
      value: v.color.value.trim().toLowerCase(),
    },
    sizes: v.sizes.map((size) => ({
      size: size.size.trim().toUpperCase(),
      stock: Math.max(0, Number(size.stock) || 0),
    })),
    images: v.images || [],
    isDefault: index === 0 ? true : !!v.isDefault, // First variant is default if none specified
  }));

  const createdVariants = await ProductVariant.insertMany(variantDocs, {
    session,
  });

  return createdVariants.map((v) => v._id);
};

/**
 * Main logic for creating a product with variants
 * @param {Object} productData - Product data (without variants)
 * @param {Array} variants - Variants data
 * @param {Object<string, Array<Express.Multer.File>>} filesByField - Files grouped by fieldname
 * @returns {Promise<ObjectId>} - Created product ObjectId
 */
exports.createProductAndVariants = async (
  productData,
  variants,
  filesByField
) => {
  if (!variants || variants.length === 0) {
    throw new ApiError("At least one variant is required", 400);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1️⃣ Create product first (without variants) to get productId
    const [product] = await Product.create(
      [
        {
          ...productData,
          variants: [], // Will be populated after variants are created
        },
      ],
      { session }
    );
    const productId = product._id;

    // 2️⃣ Upload images for each variant in parallel
    for (let i = 0; i < variants.length; i++) {
      const fieldKey = `variantImages_${i}`;
      const variantImages = filesByField[fieldKey] || [];

      if (variantImages.length === 0) {
        throw new ApiError(
          `No images provided for variant ${i + 1} (${variants[i].color?.name || "unknown"})`,
          400
        );
      }

      // Upload images for this variant
      variants[i].images = await uploadVariantImages(
        variantImages,
        productData.title,
        variants[i].color?.name || "product"
      );
    }

    // 3️⃣ Create ProductVariants
    const variantIds = await createProductVariants(
      productId,
      variants,
      session
    );

    // 4️⃣ Update Product with variant ObjectIds
    await Product.findByIdAndUpdate(
      productId,
      { $set: { variants: variantIds } },
      { session }
    );

    // 5️⃣ Recalculate aggregates (stock, colors, images, etc.)
    await Product.recalcAggregates(productId);

    // ✅ Commit transaction
    await session.commitTransaction();
    session.endSession();

    return productId;
  } catch (error) {
    // Rollback transaction on error
    await session.abortTransaction();
    session.endSession();

    // Re-throw the error to be handled by the controller
    if (error instanceof ApiError) {
      throw error;
    }
    console.error("❌ Error creating product and variants:", error);
    throw new ApiError(
      `Failed to create product: ${error.message}`,
      500
    );
  }
};

/**
 * Delete variant images from Cloudinary
 * @param {Array<{publicId: string}>} images - Array of image objects with publicId
 * @returns {Promise<void>}
 */
const deleteVariantImages = async (images) => {
  if (!images || images.length === 0) {
    return;
  }

  const { deleteImage } = require("../utils/file.utils");
  
  // Delete images in parallel (don't fail if one fails)
  await Promise.allSettled(
    images
      .filter((img) => img && img.publicId)
      .map((img) => deleteImage(img.publicId))
  );
};

/**
 * Update product and variants with retry logic for write conflicts
 * @param {ObjectId|string} productId - Product ID
 * @param {Object} productData - Product data (without variants)
 * @param {Array} variants - Variants data (optional)
 * @param {Object<string, Array<Express.Multer.File>>} filesByField - Files grouped by fieldname (optional)
 * @param {number} retryCount - Current retry count (internal use)
 * @returns {Promise<ObjectId>} - Updated product ObjectId
 */
exports.updateProductAndVariants = async (
  productId,
  productData,
  variants,
  filesByField = {},
  retryCount = 0
) => {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 100; // milliseconds

  // For simple updates (no variants, no file uploads), use simpler approach without transaction
  const isSimpleUpdate = (!variants || variants.length === 0) && 
                         (!filesByField || Object.keys(filesByField).length === 0);

  if (isSimpleUpdate) {
    try {
      // 1️⃣ Check if product exists
      const existingProduct = await Product.findById(productId);
      if (!existingProduct) {
        throw new ApiError("Product not found", 404);
      }

      // 2️⃣ Validate productType exists if provided
      if (productData.productType) {
        const ProductType = mongoose.model("ProductType");
        const productTypeExists = await ProductType.findById(productData.productType);
        if (!productTypeExists) {
          throw new ApiError(`ProductType with ID ${productData.productType} not found`, 400);
        }
      }

      // 3️⃣ Update product basic data
      if (Object.keys(productData).length > 0) {
        await Product.findByIdAndUpdate(
          productId,
          { $set: productData },
          { runValidators: true }
        );
      }

      // 4️⃣ Recalculate aggregates (async, don't wait)
      Product.recalcAggregates(productId).catch(err => {
        console.error("Error recalculating aggregates:", err);
      });

      return productId;
    } catch (error) {
      // Retry on write conflict
      if (error.message && error.message.includes("Write conflict") && retryCount < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
        return exports.updateProductAndVariants(productId, productData, variants, filesByField, retryCount + 1);
      }
      
      // Re-throw ApiError as is
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Wrap other errors
      console.error("❌ Error in simple update:", error);
      throw new ApiError(
        `Failed to update product: ${error.message}`,
        500
      );
    }
  }

  // For complex updates (with variants or file uploads), use transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1️⃣ Check if product exists
    const existingProduct = await Product.findById(productId).session(session);
    if (!existingProduct) {
      await session.abortTransaction();
      session.endSession();
      throw new ApiError("Product not found", 404);
    }

    // 1.5️⃣ Validate productType exists if provided
    if (productData.productType) {
      const ProductType = mongoose.model("ProductType");
      const productTypeExists = await ProductType.findById(productData.productType).session(session);
      if (!productTypeExists) {
        await session.abortTransaction();
        session.endSession();
        throw new ApiError(`ProductType with ID ${productData.productType} not found`, 400);
      }
    }

    // 2️⃣ Update product basic data if provided
    if (Object.keys(productData).length > 0) {
      await Product.findByIdAndUpdate(
        productId,
        { $set: productData },
        { session, runValidators: true }
      );
    }

    // 3️⃣ Handle variants update if provided
    if (variants && variants.length > 0) {
      // Get existing variants to delete their images later
      const existingVariants = await ProductVariant.find({
        productId,
      }).session(session);

      // Ensure exactly one default variant
      const defaultVariants = variants.filter((v) => v.isDefault);
      if (defaultVariants.length === 0) {
        variants[0].isDefault = true;
      } else if (defaultVariants.length > 1) {
        throw new ApiError("Exactly one variant must be marked as default", 400);
      }

      // 4️⃣ Upload new images for variants if provided
      for (let i = 0; i < variants.length; i++) {
        const fieldKey = `variantImages_${i}`;
        const variantImages = filesByField[fieldKey] || [];

        // Upload new images if provided via file upload
        if (variantImages.length > 0) {
          const uploadedImages = await uploadVariantImages(
            variantImages,
            productData.title || existingProduct.title,
            variants[i].color?.name || "product"
          );
          
          // Merge with existing images if variant has _id (updating existing variant)
          if (variants[i]._id) {
            const existingVariant = existingVariants.find(
              (v) => v._id.toString() === variants[i]._id.toString()
            );
            if (existingVariant) {
              // Merge uploaded images with existing images
              variants[i].images = [
                ...(existingVariant.images || []),
                ...uploadedImages,
              ];
            } else {
              variants[i].images = uploadedImages;
            }
          } else {
            // New variant - use uploaded images
            variants[i].images = uploadedImages;
          }
        } else if (variants[i]._id) {
          // Existing variant with no new file uploads
          // If images array is not provided or empty, keep existing images
          if (!variants[i].images || variants[i].images.length === 0) {
            const existingVariant = existingVariants.find(
              (v) => v._id.toString() === variants[i]._id.toString()
            );
            if (existingVariant) {
              variants[i].images = existingVariant.images || [];
            }
          }
          // If images array is provided, use it as is (user might be updating/removing images)
        }
        // For new variants (no _id) without file uploads, images must be provided in request body
      }

      // 5️⃣ Get IDs of variants to keep
      const variantIdsToKeep = variants
        .filter((v) => v._id)
        .map((v) => new mongoose.Types.ObjectId(v._id));

      // 6️⃣ Delete variants that are not in the new list
      const variantsToDelete = existingVariants.filter(
        (v) => !variantIdsToKeep.some((id) => id.equals(v._id))
      );

      // Delete images of removed variants
      for (const variant of variantsToDelete) {
        await deleteVariantImages(variant.images || []);
      }

      // Delete removed variants
      if (variantsToDelete.length > 0) {
        await ProductVariant.deleteMany(
          {
            _id: { $in: variantsToDelete.map((v) => v._id) },
          },
          { session }
        );
      }

      // 7️⃣ Update or create variants
      const updatedVariantIds = [];
      for (const variant of variants) {
        const variantDoc = {
          productId,
          sku: variant.sku || null,
          color: {
            name: variant.color.name.trim(),
            value: variant.color.value.trim().toLowerCase(),
          },
          sizes: variant.sizes.map((size) => ({
            size: size.size.trim().toUpperCase(),
            stock: Math.max(0, Number(size.stock) || 0),
          })),
          images: variant.images || [],
          isDefault: !!variant.isDefault,
        };

        if (variant._id && variantIdsToKeep.some((id) => id.toString() === variant._id.toString())) {
          // Update existing variant
          const updatedVariant = await ProductVariant.findByIdAndUpdate(
            variant._id,
            { $set: variantDoc },
            { session, new: true, runValidators: true }
          );
          updatedVariantIds.push(updatedVariant._id);
        } else {
          // Create new variant
          const newVariant = await ProductVariant.create([variantDoc], {
            session,
          });
          updatedVariantIds.push(newVariant[0]._id);
        }
      }

      // 8️⃣ Update product with new variant IDs
      await Product.findByIdAndUpdate(
        productId,
        { $set: { variants: updatedVariantIds } },
        { session }
      );
    }

    // 9️⃣ Recalculate aggregates
    await Product.recalcAggregates(productId);

    // ✅ Commit transaction
    await session.commitTransaction();
    session.endSession();

    return productId;
  } catch (error) {
    // Rollback transaction on error
    await session.abortTransaction();
    session.endSession();

    // Retry on write conflict
    if (error.message && error.message.includes("Write conflict") && retryCount < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
      return exports.updateProductAndVariants(productId, productData, variants, filesByField, retryCount + 1);
    }

    // Re-throw the error to be handled by the controller
    if (error instanceof ApiError) {
      throw error;
    }
    console.error("❌ Error updating product and variants:", error);
    throw new ApiError(
      `Failed to update product: ${error.message}`,
      500
    );
  }
};

/**
 * Delete product, its variants, and all associated images
 * @param {ObjectId|string} productId - Product ID
 * @returns {Promise<void>}
 */
exports.deleteProductAndVariants = async (productId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1️⃣ Check if product exists
    const product = await Product.findById(productId).session(session);
    if (!product) {
      throw new ApiError("Product not found", 404);
    }

    // 2️⃣ Get all variants to delete their images
    const variants = await ProductVariant.find({ productId }).session(session);

    // 3️⃣ Delete all variant images from Cloudinary
    for (const variant of variants) {
      await deleteVariantImages(variant.images || []);
    }

    // 4️⃣ Delete all variants
    if (variants.length > 0) {
      await ProductVariant.deleteMany({ productId }, { session });
    }

    // 5️⃣ Delete the product
    await Product.findByIdAndDelete(productId, { session });

    // ✅ Commit transaction
    await session.commitTransaction();
    session.endSession();
  } catch (error) {
    // Rollback transaction on error
    await session.abortTransaction();
    session.endSession();

    // Re-throw the error to be handled by the controller
    if (error instanceof ApiError) {
      throw error;
    }
    console.error("❌ Error deleting product and variants:", error);
    throw new ApiError(
      `Failed to delete product: ${error.message}`,
      500
    );
  }
};