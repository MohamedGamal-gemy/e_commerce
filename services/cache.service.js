const redis = require("../config/redis");

/**
 * Cache Service - Senior Level Implementation
 * Provides robust caching with error handling, serialization, and cache invalidation
 */

class CacheService {
  /**
   * Generate a consistent cache key from prefix and parameters
   * @param {string} prefix - Cache key prefix (e.g., 'products', 'user')
   * @param {Object} params - Parameters object to stringify
   * @returns {string} - Formatted cache key
   */
  static buildCacheKey(prefix, params = {}) {
    if (!prefix || typeof prefix !== "string") {
      throw new Error("Cache prefix must be a non-empty string");
    }

    // Sort params keys for consistent key generation
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {});

    const paramsString = JSON.stringify(sortedParams);
    // Create a hash-like key for better readability and performance
    return `${prefix}:${Buffer.from(paramsString).toString("base64")}`;
  }

  /**
   * Get cached data by key
   * @param {string} key - Cache key
   * @returns {Promise<*|null>} - Cached data or null if not found/error
   */
  static async get(key) {
    if (!key || typeof key !== "string") {
      return null;
    }

    try {
      const data = await redis.get(key);
      if (!data) return null;

      return JSON.parse(data);
    } catch (error) {
      // Log error but don't throw - cache miss is acceptable
      console.error(`❌ Cache get error for key "${key}":`, error.message);
      return null;
    }
  }

  /**
   * Set cache with TTL (Time To Live)
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in seconds (default: 300 = 5 minutes)
   * @returns {Promise<boolean>} - Success status
   */
  static async set(key, value, ttl = 300) {
    if (!key || typeof key !== "string") {
      return false;
    }

    if (ttl <= 0) {
      console.warn(`⚠️ Invalid TTL ${ttl} for key "${key}", using default 300s`);
      ttl = 300;
    }

    try {
      const serialized = JSON.stringify(value);
      await redis.setex(key, ttl, serialized);
      return true;
    } catch (error) {
      console.error(`❌ Cache set error for key "${key}":`, error.message);
      return false;
    }
  }

  /**
   * Delete cache by key
   * @param {string} key - Cache key to delete
   * @returns {Promise<boolean>} - Success status
   */
  static async del(key) {
    if (!key || typeof key !== "string") {
      return false;
    }

    try {
      await redis.del(key);
      return true;
    } catch (error) {
      console.error(`❌ Cache delete error for key "${key}":`, error.message);
      return false;
    }
  }

  /**
   * Delete multiple cache keys by pattern
   * @param {string} pattern - Redis pattern (e.g., 'products:*')
   * @returns {Promise<number>} - Number of keys deleted
   */
  static async delByPattern(pattern) {
    if (!pattern || typeof pattern !== "string") {
      return 0;
    }

    try {
      const keys = await redis.keys(pattern);
      if (keys.length === 0) return 0;

      // Use pipeline for better performance when deleting multiple keys
      const pipeline = redis.pipeline();
      keys.forEach((key) => pipeline.del(key));
      await pipeline.exec();

      return keys.length;
    } catch (error) {
      console.error(`❌ Cache delete pattern error for "${pattern}":`, error.message);
      return 0;
    }
  }

  /**
   * Get or set cache (cache-aside pattern)
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Function to fetch data if cache miss
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<*>} - Cached or freshly fetched data
   */
  static async getOrSet(key, fetchFn, ttl = 300) {
    // Try to get from cache first
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - fetch fresh data
    if (typeof fetchFn !== "function") {
      throw new Error("fetchFn must be a function");
    }

    try {
      const freshData = await fetchFn();
      
      // Set cache in background (don't wait for it)
      this.set(key, freshData, ttl).catch((err) => {
        console.error(`❌ Failed to set cache for key "${key}":`, err.message);
      });

      return freshData;
    } catch (error) {
      console.error(`❌ Error fetching data for cache key "${key}":`, error.message);
      throw error;
    }
  }

  /**
   * Check if cache key exists
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} - True if key exists
   */
  static async exists(key) {
    if (!key || typeof key !== "string") {
      return false;
    }

    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`❌ Cache exists check error for key "${key}":`, error.message);
      return false;
    }
  }

  /**
   * Get remaining TTL for a key
   * @param {string} key - Cache key
   * @returns {Promise<number>} - TTL in seconds, -1 if key doesn't exist, -2 if no expiry
   */
  static async getTTL(key) {
    if (!key || typeof key !== "string") {
      return -1;
    }

    try {
      return await redis.ttl(key);
    } catch (error) {
      console.error(`❌ Cache TTL error for key "${key}":`, error.message);
      return -1;
    }
  }
}

module.exports = CacheService;
