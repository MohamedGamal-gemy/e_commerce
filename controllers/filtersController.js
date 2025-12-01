
const Product = require("../models/product");
const { buildProductMatch } = require("../pipelines/searchPipeline");
const { buildFiltersPipeline } = require("../pipelines/filtersHandler");
const redis = require('../utils/redis');

const CACHE_TTL = 3600; // 1 hour

async function getProductsFilters(req, res, next) {
  try {
    // Generate cache key from query params
    const cacheKey = `filters:${JSON.stringify(req.query)}`;

    // Try to get from cache first
    // const cachedData = await redis.get(cacheKey);
    // if (cachedData) {
    //   return res.json({
    //     ...cachedData,
    //     cached: true // Optional: Indicate that this is a cached response
    //   });
    // }

    // build product match (productTypeName, search, minPrice, maxPrice)
    const productMatch = buildProductMatch(req.query);

    // build filters pipeline
    const pipeline = buildFiltersPipeline(productMatch);

    const result = await Product.aggregate(pipeline).allowDiskUse(true);
    const facet = result[0] || {};

    // price range
    const priceRange = facet.priceRange?.[0]
      ? { min: facet.priceRange[0].min, max: facet.priceRange[0].max }
      : { min: 0, max: 0 };

    // merge colors by name (case-insensitive)
    const colors = facet.colors || [];
    const mergedColorsMap = {};

    for (const c of colors) {
      const key = c.name.toLowerCase();
      if (!mergedColorsMap[key]) {
        mergedColorsMap[key] = {
          name: c.name.charAt(0).toUpperCase() + c.name.slice(1).toLowerCase(),
          countProducts: c.countProducts,
          value: c.value,
        };
      } else {
        mergedColorsMap[key].countProducts += c.countProducts;
      }
    }

    const finalColors = Object.values(mergedColorsMap);
    const response = {
      success: true,
      filters: {
        colors: finalColors,
        priceRange,
      },
    };

    // Cache the response
    // await redis.set(cacheKey, response, CACHE_TTL);

    return res.json(response);
  } catch (err) {
    next(err);
  }
}

module.exports = { getProductsFilters };
