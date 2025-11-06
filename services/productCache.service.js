const CacheService = require("./cache.service");
const Product = require("../models/product");
const ProductVariant = require("../models/productVariant");

/**
 * Product Cache Service - Handles caching for product-related queries
 * Implements cache-aside pattern with smart invalidation
 */

class ProductCacheService {
  // Cache key prefixes
  static PREFIXES = {
    PRODUCTS_LIST: "products:list",
    PRODUCT_DETAIL: "products:detail",
    PRODUCT_COUNT: "products:count",
  };

  // Default TTL values (in seconds)
  static TTL = {
    PRODUCTS_LIST: 300, // 5 minutes
    PRODUCT_DETAIL: 600, // 10 minutes
    PRODUCT_COUNT: 180, // 3 minutes
  };

  /**
   * Get products list with caching
   * @param {Object} filter - MongoDB filter
   * @param {Object} options - Query options (sort, skip, limit, select)
   * @returns {Promise<Array>} - Products array
   */
  static async getProductsWithCache(filter, options) {
    const cacheKey = CacheService.buildCacheKey(
      this.PREFIXES.PRODUCTS_LIST,
      { filter, options }
    );

    return CacheService.getOrSet(
      cacheKey,
      async () => {
        return await Product.getProductsWithColorPreviews(filter, options);
      },
      this.TTL.PRODUCTS_LIST
    );
  }

  /**
   * Get products count with caching
   * @param {Object} filter - MongoDB filter
   * @returns {Promise<number>} - Total count
   */
  static async getProductsCountWithCache(filter) {
    const cacheKey = CacheService.buildCacheKey(
      this.PREFIXES.PRODUCT_COUNT,
      { filter }
    );

    return CacheService.getOrSet(
      cacheKey,
      async () => {
        return await Product.countDocuments(filter);
      },
      this.TTL.PRODUCT_COUNT
    );
  }

  /**
   * Get single product with caching
   * @param {string|ObjectId} productId - Product ID
   * @returns {Promise<Object|null>} - Product document
   */
  static async getProductWithCache(productId) {
    const cacheKey = `${this.PREFIXES.PRODUCT_DETAIL}:${productId}`;

    return CacheService.getOrSet(
      cacheKey,
      async () => {
        return await Product.getProductWithColorPreviews(productId);
      },
      this.TTL.PRODUCT_DETAIL
    );
  }

  /**
   * Invalidate cache when product is created/updated/deleted
   * @param {string|ObjectId} productId - Product ID (optional)
   * @returns {Promise<void>}
   */
  static async invalidateCache(productId = null) {
    try {
      // Invalidate all product list caches
      await CacheService.delByPattern(`${this.PREFIXES.PRODUCTS_LIST}:*`);
      
      // Invalidate count cache
      await CacheService.delByPattern(`${this.PREFIXES.PRODUCT_COUNT}:*`);

      // Invalidate specific product cache if ID provided
      if (productId) {
        await CacheService.del(`${this.PREFIXES.PRODUCT_DETAIL}:${productId}`);
      } else {
        // Invalidate all product detail caches
        await CacheService.delByPattern(`${this.PREFIXES.PRODUCT_DETAIL}:*`);
      }
    } catch (error) {
      console.error("❌ Error invalidating product cache:", error);
      // Don't throw - cache invalidation failure shouldn't break the app
    }
  }

  /**
   * Invalidate cache when variant is created/updated/deleted
   * @param {string|ObjectId} productId - Product ID
   * @returns {Promise<void>}
   */
  static async invalidateVariantCache(productId) {
    if (!productId) return;

    try {
      // Invalidate product detail cache
      await CacheService.del(`${this.PREFIXES.PRODUCT_DETAIL}:${productId}`);
      
      // Invalidate all list caches (product might appear in different filters)
      await CacheService.delByPattern(`${this.PREFIXES.PRODUCTS_LIST}:*`);
      
      // Invalidate count cache
      await CacheService.delByPattern(`${this.PREFIXES.PRODUCT_COUNT}:*`);
    } catch (error) {
      console.error("❌ Error invalidating variant cache:", error);
    }
  }
}

module.exports = ProductCacheService;

