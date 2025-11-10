const { redisConnection } = require("../config/redis");

class CacheService {
  /**
   * Build a consistent cache key
   */
  static buildCacheKey(prefix, data = {}) {
    const serialized = JSON.stringify(data);
    return `${prefix}:${Buffer.from(serialized).toString("base64")}`;
  }

  /**
   * Get or set cache (cache-aside)
   */
  static async getOrSet(key, fetchFn, ttl = 300) {
    const cached = await redisConnection.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    const result = await fetchFn();
    if (result) {
      await redisConnection.setex(key, ttl, JSON.stringify(result));
    }
    return result;
  }

  /**
   * Delete specific key
   */
  static async del(key) {
    try {
      await redisConnection.del(key);
    } catch (err) {
      console.error(`❌ Failed to delete key ${key}:`, err);
    }
  }

  /**
   * Delete multiple keys by pattern using SCAN
   */
  static async delByPattern(pattern) {
    try {
      let cursor = "0";
      do {
        const [nextCursor, keys] = await redisConnection.scan(
          cursor,
          "MATCH",
          pattern,
          "COUNT",
          100
        );
        if (keys.length > 0) {
          await redisConnection.del(keys);
          console.log(`🧹 Deleted ${keys.length} keys for pattern: ${pattern}`);
        }
        cursor = nextCursor;
      } while (cursor !== "0");
    } catch (error) {
      console.error(`❌ Cache delete pattern error for "${pattern}":`, error);
    }
  }
}

module.exports = CacheService;
