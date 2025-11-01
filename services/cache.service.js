const Redis = require("ioredis");
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

// helper لتوليد key ثابت من أي object
function buildCacheKey(prefix, params) {
    return `${prefix}:${JSON.stringify(params)}`;
}

async function getCache(key) {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
}

async function setCache(key, value, ttl = 60) {
    await redis.setex(key, ttl, JSON.stringify(value));
}

module.exports = {
    redis,
    buildCacheKey,
    getCache,
    setCache,
};
