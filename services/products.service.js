// src/services/products.service.js
const Product = require("../models/productModel");
const { buildCacheKey, getCache, setCache } = require("./cache.service");
const { buildProductPipeline } = require("../utils/buildPipeline");
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

  const cacheKey = buildCacheKey("facets", { color, subcategory, minPrice, maxPrice, search });
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
          { $group: { _id: { $toLower: "$variants.color.name" }, count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        subcategories: [
          { $group: { _id: { $toLower: "$subcategory.name" }, count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        price: [
          { $group: { _id: null, min: { $min: "$price" }, max: { $max: "$price" } } },
        ],
      },
    },
  ]);

  const result = {
    facets: {
      colors: (facetResult.colors || []).map((c) => ({ value: c._id, count: c.count })),
      subcategories: (facetResult.subcategories || []).map((s) => ({ value: s._id, count: s.count })),
      price: (facetResult.price && facetResult.price[0]) ? facetResult.price[0] : { min: 0, max: 0 },
    },
  };

  await setCache(cacheKey, result, 60); // TTL 60s
  return result;
}

async function getProducts(query) {
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
  const colorsArray = color ? color.split(",").map((c) => c.trim().toLowerCase()) : [];
  const subcategoriesArray = subcategory
    ? subcategory.split(",").map((s) => s.trim().toLowerCase())
    : [];

  const priceMatch = {};
  if (minPrice) priceMatch.$gte = parseFloat(minPrice);
  if (maxPrice) priceMatch.$lte = parseFloat(maxPrice);

  const skip = (Math.max(parseInt(page, 10), 1) - 1) * parseInt(limit, 10);

  // 🧠 Cache
  const cacheKey = buildCacheKey("products", {
    color,
    subcategory,
    minPrice,
    maxPrice,
    search,
    sort,
    page,
    limit,
  });

  const cached = await getCache(cacheKey);
  if (cached) return cached;

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
      default:
        return { createdAt: -1 };
    }
  })();

  // 📊 إجمالي النتائج
  const totalCountAgg = await Product.aggregate([...pipelineBase, { $count: "total" }]);
  const total = totalCountAgg[0]?.total || 0;

  // 🧩 إضافة الـ pagination
  const finalPipeline = [
    ...pipelineBase,
    { $sort: sortStage },
    { $skip: skip },
    { $limit: parseInt(limit, 10) },
  ];

  const products = await Product.aggregate(finalPipeline);

  // 🧾 النتيجة النهائية
  const response = {
    products,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
    },
  };

  // 🧠 حفظ الكاش
  await setCache(cacheKey, response, 60);

  return response;
}

// exports.createProductService = async (req) => {
//   let payload;
//   try {
//     payload = JSON.parse(req.body.payload);
//   } catch {
//     throw new Error("Invalid payload format");
//   }

//   // ✅ إنشاء المنتج الرئيسي
//   const product = new Product({
//     title: payload.title,
//     description: payload.description,
//     price: payload.price,
//     category: payload.category,
//     subcategory: payload.subcategory,
//   });

//   // ✅ التعامل مع الصور
//   const { files } = req;
//   if (files && files.length > 0) {
//     const variantIndexes = JSON.parse(req.body.variantIndexes || "[]");

//     files.forEach((file, idx) => {
//       const variantIndex = variantIndexes[idx];
//       if (payload.variants[variantIndex]) {
//         payload.variants[variantIndex].images.push({
//           url: file.path,
//           publicId: file.filename, // لو Cloudinary
//         });
//       }
//     });
//   }

//   // ✅ إنشاء الـ Variants وربطها بالـ Product
//   await product.save();

//   await Promise.all(
//     payload.variants.map(async (variant) => {
//       await ProductVariant.create({
//         productId: product._id,
//         color: variant.color,
//         sizes: variant.sizes,
//         images: variant.images,
//       });
//     })
//   );

//   return product;
// };

// services/products.service.js
async function createProductService(req) {
  let payload;
  try {
    payload = JSON.parse(req.body.payload);
  } catch {
    throw new Error("Invalid payload format");
  }

  // ✅ 1. التحقق من صحة البيانات باستخدام Joi
  const { error, value } = productSchema.validate(payload, {
    abortEarly: false, // يرجع كل الأخطاء مرة واحدة
    stripUnknown: true, // يحذف أي بيانات غير معرفة في الـschema
  });

  if (error) {
    const messages = error.details.map((e) => e.message).join(", ");
    const err = new Error(`Validation failed: ${messages}`);
    err.statusCode = 400;
    throw err;
  }

  // ✅ 2. إنشاء المنتج الأساسي
  const product = new Product({
    title: value.title,
    description: value.description,
    price: value.price,
    category: value.category,
    subcategory: value.subcategory,
  });

  // ✅ 3. ربط الصور بالـvariants (إن وجدت)
  const { files } = req;
  if (files && files.length > 0) {
    const variantIndexes = JSON.parse(req.body.variantIndexes || "[]");

    files.forEach((file, idx) => {
      const variantIndex = variantIndexes[idx];
      if (value.variants[variantIndex]) {
        value.variants[variantIndex].images.push({
          url: file.path,
          publicId: file.filename, // أو secure_url من Cloudinary
        });
      }
    });
  }

  // ✅ 4. حفظ المنتج أولاً
  await product.save();

  // ✅ 5. إنشاء الـvariants وربطها بالمنتج
  const variantIds = await Promise.all(
    value.variants.map(async (variant) => {
      const newVariant = await ProductVariant.create({
        productId: product._id,
        color: variant.color,
        sizes: variant.sizes,
        images: variant.images,
      });
      return newVariant._id;
    })
  );

  // ✅ 6. ربط الـvariants بالمنتج وتحديثه
  product.variants = variantIds;
  await product.save();

  // ✅ 7. النتيجة النهائية
  return {
    message: "Product created successfully",
    product,
  };
}



module.exports = {
  createProductService,
  getProductFacets,
  getProducts,
};
