// src/services/products.service.js
// const Product = require("../models/productModel");
// const { buildCacheKey, getCache, setCache } = require("./cache.service");
const { getCache, setCache } = require("./cache.service");
const { buildProductPipeline } = require("../utils/buildPipeline");

// 
const Product = require("../models/productModel");
const mongoose = require("mongoose");
// const { buildProductPipeline } = require("../utils/productPipelineBuilder");
// 
const { productSchema } = require("../validations/productValidation");
const ProductVariant = require("../models/variantsModel");

async function getProductFacets(query) {
  const { color, subcategory, minPrice, maxPrice, search } = query;

  const colorsArray = color
    ? color.split(",").map((c) => c.trim().toLowerCase())
    : [];
  const subcategoriesArray = subcategory
    ? subcategory.split(",").map((s) => s.trim().toLowerCase())
    : [];

  const priceMatch = {};
  if (minPrice) priceMatch.$gte = parseFloat(minPrice);
  if (maxPrice) priceMatch.$lte = parseFloat(maxPrice);

  const cacheKey = buildCacheKey("facets", {
    color,
    subcategory,
    minPrice,
    maxPrice,
    search,
  });
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const pipeline = buildProductPipeline({
    colorsArray,
    subcategoriesArray,
    search,
    priceMatch,
  });

  const [facetResult = {}] = await Product.aggregate([
    ...pipeline,
    {
      $facet: {
        colors: [
          { $unwind: "$variants" },
          {
            $group: {
              _id: { $toLower: "$variants.color.name" },
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
        ],
        subcategories: [
          {
            $group: {
              _id: { $toLower: "$subcategory.name" },
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
        ],
        price: [
          {
            $group: {
              _id: null,
              min: { $min: "$price" },
              max: { $max: "$price" },
            },
          },
        ],
      },
    },
  ]);

  const result = {
    facets: {
      colors: (facetResult.colors || []).map((c) => ({
        value: c._id,
        count: c.count,
      })),
      subcategories: (facetResult.subcategories || []).map((s) => ({
        value: s._id,
        count: s.count,
      })),
      price:
        facetResult.price && facetResult.price[0]
          ? facetResult.price[0]
          : { min: 0, max: 0 },
    },
  };

  await setCache(cacheKey, result, 60); // TTL 60s
  return result;
}

// ################################################################
/**
 * @desc Get list of products with filtering, sorting, and pagination
 * @route GET /api/v1/products
 * @access Public
 */

/**
 * @desc Get list of products with filtering, sorting, and pagination
 * @param {object} query - Express request query parameters
 * @returns {object} { products: [], pagination: {} }
 */
async function getProducts(query = {}) {
  // 💡 التأكد من أن query هو كائن وتعيين القيم الافتراضية
  const {
    color,
    subcategory,
    minPrice,
    maxPrice,
    search,
    sort = "latest",
    page = 1,
    limit = 9,
  } = query;

  // 🟢 تجهيز الفلاتر
  const colorsArray = color
    ? color.split(",").map((c) => c.trim().toLowerCase())
    : [];

  // ⚠️ تحويل subcategory IDs
  const subcategoriesArray = subcategory
    ? subcategory.split(",").map((id) => mongoose.Types.ObjectId(id))
    : [];

  const priceMatch = {};
  if (minPrice) priceMatch.$gte = parseFloat(minPrice);
  if (maxPrice) priceMatch.$lte = parseFloat(maxPrice);

  const parsedLimit = parseInt(limit, 10);
  const parsedPage = parseInt(page, 10);
  const skip = (Math.max(parsedPage, 1) - 1) * parsedLimit;

  // 🧱 بناء الـ pipeline
  const pipelineBase = buildProductPipeline({
    colorsArray,
    subcategoriesArray,
    search,
    priceMatch,
  });

  // 📊 الترتيب
  const sortStage = (() => {
    switch (sort) {
      case "price_asc":
        return { price: 1 };
      case "price_desc":
        return { price: -1 };
      case "top_rated":
        return { rating: -1 };
      case "most_viewed":
        return { views: -1 };
      case "top_sales":
        return { purchases: -1 };
      default:
        return { createdAt: -1 }; // latest
    }
  })();

  // 1. إجمالي النتائج (Total Count)
  // 💡 نستخدم فقط مراحل $match الأساسية للعد للحصول على أداء أفضل
  const matchStages = pipelineBase.filter(
    (stage) => stage.$match || (stage.$project && stage.$project.score)
  );

  const totalCountAgg = await Product.aggregate([
    ...matchStages,
    { $count: "total" },
  ]);

  const total = totalCountAgg[0]?.total || 0;

  // 2. إضافة الترتيب والـ Pagination
  const finalPipeline = [
    ...pipelineBase,
    // إذا كان هناك بحث نصي، الترتيب بالـ score يتم أولاً. وإلا نستخدم الترتيب المطلوب.
    ...(search ? [] : [{ $sort: sortStage }]),

    { $skip: skip },
    { $limit: parsedLimit },
  ];

  const products = await Product.aggregate(finalPipeline);

  // 3. إرجاع النتيجة النهائية
  const response = {
    products,
    pagination: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit),
    },
  };

  return response;
} // ################################################################

// async function getProducts(query) {
//   const {
//     color,
//     subcategory,
//     minPrice,
//     maxPrice,
//     search,
//     sort = "latest",
//     page = 1,
//     limit = 9,
//   } = query;

//   // 🟢 تجهيز الفلاتر
//   const colorsArray = color ? color.split(",").map((c) => c.trim().toLowerCase()) : [];
//   const subcategoriesArray = subcategory
//     ? subcategory.split(",").map((s) => s.trim().toLowerCase())
//     : [];

//   const priceMatch = {};
//   if (minPrice) priceMatch.$gte = parseFloat(minPrice);
//   if (maxPrice) priceMatch.$lte = parseFloat(maxPrice);

//   const skip = (Math.max(parseInt(page, 10), 1) - 1) * parseInt(limit, 10);

//   // 🧠 Cache
//   const cacheKey = buildCacheKey("products", {
//     color,
//     subcategory,
//     minPrice,
//     maxPrice,
//     search,
//     sort,
//     page,
//     limit,
//   });

//   const cached = await getCache(cacheKey);
//   if (cached) return cached;

//   // 🧱 بناء الـ pipeline
//   const pipelineBase = buildProductPipeline({
//     colorsArray,
//     subcategoriesArray,
//     search,
//     priceMatch,
//   });

//   // 📊 الترتيب
//   const sortStage = (() => {
//     switch (sort) {
//       case "price_asc":
//         return { price: 1 };
//       case "price_desc":
//         return { price: -1 };
//       case "top_rated":
//         return { rating: -1 };
//       default:
//         return { createdAt: -1 };
//     }
//   })();

//   // 📊 إجمالي النتائج
//   const totalCountAgg = await Product.aggregate([...pipelineBase, { $count: "total" }]);
//   const total = totalCountAgg[0]?.total || 0;

//   // 🧩 إضافة الـ pagination
//   const finalPipeline = [
//     ...pipelineBase,
//     { $sort: sortStage },
//     { $skip: skip },
//     { $limit: parseInt(limit, 10) },
//   ];

//   const products = await Product.aggregate(finalPipeline);

//   // 🧾 النتيجة النهائية
//   const response = {
//     products,
//     pagination: {
//       total,
//       page: parseInt(page, 10),
//       limit: parseInt(limit, 10),
//       totalPages: Math.ceil(total / parseInt(limit, 10)),
//     },
//   };

//   // 🧠 حفظ الكاش
//   await setCache(cacheKey, response, 60);

//   return response;
// }

// services/products.service.js
// const Product = require("../models/productModel");
// const mongoose = require("mongoose");
// const { buildProductPipeline } = require("../utils/productPipelineBuilder"); 

/**
 * @desc Get list of products with filtering, sorting, and pagination
 * @param {object} query - Express request query parameters
 * @returns {object} { products: [], pagination: {} }
 */
async function getProducts(query = {}) { 
    
    // 💡 فك محتويات الـ query مع القيم الافتراضية
    const {
        color,
        subcategory,
        minPrice,
        maxPrice,
        search,
        sort = "latest",
        page = 1,
        limit = 9,
    } = query;

    // 🟢 تجهيز الفلاتر
    const colorsArray = color
        ? color.split(",").map((c) => c.trim().toLowerCase())
        : [];
    
    const subcategoriesArray = subcategory
        ? subcategory.split(",").map((id) => mongoose.Types.ObjectId(id))
        : [];
    
    const priceMatch = {};
    if (minPrice) priceMatch.$gte = parseFloat(minPrice);
    if (maxPrice) priceMatch.$lte = parseFloat(maxPrice);

    const parsedLimit = parseInt(limit, 10);
    const parsedPage = parseInt(page, 10);
    const skip = (Math.max(parsedPage, 1) - 1) * parsedLimit;


    // 🧱 بناء الـ pipeline
    const pipelineBase = buildProductPipeline({
        colorsArray,
        subcategoriesArray,
        search,
        priceMatch,
    });

    // 📊 الترتيب
    const sortStage = (() => {
        switch (sort) {
            case "price_asc": return { price: 1 };
            case "price_desc": return { price: -1 };
            case "top_rated": return { rating: -1 };
            case "most_viewed": return { views: -1 };
            case "top_sales": return { purchases: -1 };
            default: return { createdAt: -1 }; // latest
        }
    })();

    // 1. إجمالي النتائج (Total Count) - يتم استخدام مراحل $match فقط
    const matchStages = pipelineBase.filter(stage => 
        stage.$match || (stage.$project && stage.$project.score) 
    );
    
    const totalCountAgg = await Product.aggregate([
        ...matchStages,
        { $count: "total" },
    ]);
    
    const total = totalCountAgg[0]?.total || 0;

    // 2. إضافة الترتيب والـ Pagination
    const finalPipeline = [
        ...pipelineBase,
        // إضافة الترتيب إذا لم يكن بحثاً نصياً
        ...(search ? [] : [{ $sort: sortStage }]), 
        
        { $skip: skip },
        { $limit: parsedLimit },
    ];

    const products = await Product.aggregate(finalPipeline);

    // 3. إرجاع النتيجة النهائية
    const response = {
        products,
        pagination: {
            total,
            page: parsedPage,
            limit: parsedLimit,
            totalPages: Math.ceil(total / parsedLimit),
        },
    };

    return response; 
}


module.exports = {
  // createProductService,
  getProductFacets,
  getProducts,
};
