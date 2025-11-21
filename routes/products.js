const express = require("express");
const router = express.Router();
const {
  createProduct,
  getProducts,
  updateProduct,
  patchProduct,
  deleteProduct,
  getProduct,
  getQuickViewProduct,
  getPriceRange,
} = require("../controllers/products.controller");
const asyncHandler = require("express-async-handler");
const { protect, restrictTo } = require("../middlewares/auth");
const upload = require("../middlewares/upload");
const Product = require("../models/product");
const ProductVariant = require("../models/productVariant");

// upload.fields يسمح نرفع صور للمنتج وصور للـ variants
router.post(
  "/",
  // protect,
  // restrictTo("admin", "vendor"),
  upload.any(),
  createProduct
);

/**
 * @desc    Get products with filters (color, subcategory)
 * @route   GET /api/products
 * @access  Public
 */
// router.get(
//   "/",
//   asyncHandler(async (req, res) => {
//     const page = parseInt(req.query.page || "1");
//     const limit = parseInt(req.query.limit || "20");
//     const skip = (page - 1) * limit;

//     const { productTypeName, search, color, minPrice, maxPrice } = req.query;

//     // ----- Build Main Query -----
//     const query = { isAvailable: true, status: "active" };

//     if (productTypeName) {
//       const types = productTypeName.split(",").map((t) => t.trim());
//       query.productTypeName = { $in: types };
//     }

//     if (color) {
//       const colors = color.split(",").map((c) => c.trim());
//       query["colors.name"] = { $in: colors };
//     }

//     if (search) {
//       query.searchableText = new RegExp(search, "i");
//     }

//     if (minPrice || maxPrice) {
//       query.price = {};
//       if (minPrice) query.price.$gte = Number(minPrice);
//       if (maxPrice) query.price.$lte = Number(maxPrice);
//     }

//     // ======= PARALLEL QUERIES =======

//     const productsQuery = Product.find(query)
//       .select(
//         "title price mainImage colors sku slug searchableText rating productTypeName"
//       )
//       .skip(skip)
//       .limit(limit)
//       .sort({ createdAt: -1 });

//     const totalQuery = Product.countDocuments(query);

//     const priceRangeAgg = Product.aggregate([
//       { $match: query },
//       {
//         $group: {
//           _id: null,
//           min: { $min: "$price" },
//           max: { $max: "$price" },
//         },
//       },
//     ]);

//     // ----- Colors aggregation (remove color filter only) -----
//     const colorMatch = { ...query };
//     if (color) delete colorMatch["colors.name"];

//     const colorsAgg = Product.aggregate([
//       { $match: colorMatch },
//       { $unwind: "$colors" },
//       {
//         $group: {
//           _id: "$colors.name",
//           value: { $first: "$colors.value" },
//           countProducts: { $sum: 1 },
//         },
//       },
//       { $sort: { _id: 1 } },
//       {
//         $project: {
//           _id: 0,
//           name: "$_id",
//           value: 1,
//           countProducts: 1,
//         },
//       },
//     ]);

//     const [products, total, priceRangeResult, colors] = await Promise.all([
//       productsQuery,
//       totalQuery,
//       priceRangeAgg,
//       colorsAgg,
//     ]);

//     const priceRange =
//       priceRangeResult.length > 0
//         ? { min: priceRangeResult[0].min, max: priceRangeResult[0].max }
//         : { min: 0, max: 0 };

//     res.json({
//       success: true,
//       data: products,
//       filters: {
//         colors,
//         priceRange,
//       },
//       pagination: {
//         page,
//         limit,
//         totalPages: Math.ceil(total / limit),
//         total,
//       },
//     });
//   })
// );

//
// router.get("/price-range", getPriceRange);

// router.get(
//   "/",
//   asyncHandler(async (req, res) => {
//     const page = parseInt(req.query.page || "1");
//     const limit = parseInt(req.query.limit || "20");
//     const skip = (page - 1) * limit;

//     const { productTypeName, search, color, minPrice, maxPrice } = req.query;

//     // ----- Build Main Query -----
//     const productQuery = { isAvailable: true, status: "active" };

//     if (productTypeName) {
//       const types = productTypeName.split(",").map((t) => t.trim());
//       productQuery.productTypeName = { $in: types };
//     }

//     if (search) {
//       productQuery.searchableText = new RegExp(search, "i");
//     }

//     if (minPrice || maxPrice) {
//       productQuery.price = {};
//       if (minPrice) productQuery.price.$gte = Number(minPrice);
//       if (maxPrice) productQuery.price.$lte = Number(maxPrice);
//     }

//     // إذا في color → لازم نخلي الفلترة من الـ Variants مش الـ Product
//     let variantColorFilter = {};
//     if (color) {
//       const colors = color.split(",").map((c) => c.trim());
//       variantColorFilter = { "color.name": { $in: colors } };
//     }

//     // ======= احضار المنتجات الأساسية (قبل تطبيق فلترة الألوان) =======
//     const productsBase = await Product.find(productQuery).select(
//       "title price mainImage colors sku slug searchableText rating productTypeName"
//     );

//     const productIds = productsBase.map((p) => p._id);

//     // ======= تطبيق فلترة الـ color + pagination على الـ Variants =======
//     const variantsQuery = ProductVariant.find({
//       productId: { $in: productIds },
//       ...variantColorFilter,
//     })
//       .skip(skip)
//       .limit(limit)
//       .sort({ createdAt: -1 });
//     // .sort({ ["color.name"]: 1 });
//     // .sort({ price: 1 });

//     const totalVariantsQuery = ProductVariant.countDocuments({
//       productId: { $in: productIds },
//       ...variantColorFilter,
//     });

//     // ======= موازي =======
//     const priceRangeAgg = Product.aggregate([
//       { $match: productQuery },
//       {
//         $group: {
//           _id: null,
//           min: { $min: "$price" },
//           max: { $max: "$price" },
//         },
//       },
//     ]);

//     // Colors aggregation (بنفس القديم)
//     const colorMatch = { ...productQuery };
//     if (color) delete colorMatch["colors.name"];

//     const colorsAgg = Product.aggregate([
//       { $match: colorMatch },
//       { $unwind: "$colors" },
//       {
//         $group: {
//           _id: "$colors.name",
//           value: { $first: "$colors.value" },
//           countProducts: { $sum: 1 },
//         },
//       },
//       { $sort: { _id: 1 } },
//       {
//         $project: {
//           _id: 0,
//           name: "$_id",
//           value: 1,
//           countProducts: 1,
//         },
//       },
//     ]);

//     const [variants, totalVariants, priceRangeResult, colors] =
//       await Promise.all([
//         variantsQuery,
//         totalVariantsQuery,
//         priceRangeAgg,
//         colorsAgg,
//       ]);

//     const priceRange =
//       priceRangeResult.length > 0
//         ? { min: priceRangeResult[0].min, max: priceRangeResult[0].max }
//         : { min: 0, max: 0 };

//     // ======= دمج الـ Variant مع المنتج الأصلي =======
//     const productMap = new Map(productsBase.map((p) => [String(p._id), p]));

//     const formatted = variants.map((v) => {
//       const base = productMap.get(String(v.productId));
//       return {
//         variantId: v._id,
//         productId: v.productId,
//         title: base.title,
//         slug: base.slug,
//         price: base.price,
//         rating: base.rating,
//         productTypeName: base.productTypeName,
//         sku: v.sku,
//         color: v.color,
//         image: v.images?.[0]?.url || product.mainImage || null,
//       };
//     });

//     res.json({
//       success: true,
//       data: formatted,
//       filters: {
//         colors,
//         priceRange,
//       },
//       pagination: {
//         page,
//         limit,
//         total: totalVariants,
//         totalPages: Math.ceil(totalVariants / limit),
//       },
//     });
//   })
// );
//
// router.get(
//   "/",
//   asyncHandler(async (req, res) => {
//     const page = parseInt(req.query.page || "1");
//     const limit = parseInt(req.query.limit || "20");
//     const skip = (page - 1) * limit;

//     const { productTypeName, search, color, minPrice, maxPrice } = req.query;

//     // ----- Build Main Query -----
//     const productQuery = { isAvailable: true, status: "active" };

//     if (productTypeName) {
//       const types = productTypeName.split(",").map((t) => t.trim());
//       productQuery.productTypeName = { $in: types };
//     }

//     if (search) {
//       productQuery.searchableText = new RegExp(search, "i");
//     }

//     if (minPrice || maxPrice) {
//       productQuery.price = {};
//       if (minPrice) productQuery.price.$gte = Number(minPrice);
//       if (maxPrice) productQuery.price.$lte = Number(maxPrice);
//     }

//     // إذا في color → لازم نخلي الفلترة من الـ Variants مش الـ Product
//     let variantColorFilter = {};
//     if (color) {
//       const colors = color.split(",").map((c) => c.trim());
//       variantColorFilter = { "color.name": { $in: colors } };
//     }

//     // ======= احضار المنتجات الأساسية (بدون فلترة اللون) =======
//     const productsBase = await Product.find(productQuery).select(
//       "title price mainImage colors sku slug searchableText rating productTypeName"
//     );

//     const productIds = productsBase.map((p) => p._id);

//     // ======= فلترة الـ Variants =======
//     const variantsQuery = ProductVariant.find({
//       productId: { $in: productIds },
//       ...variantColorFilter,
//     })
//       .skip(skip)
//       .limit(limit)
//       .sort({ createdAt: -1 });

//     const totalVariantsQuery = ProductVariant.countDocuments({
//       productId: { $in: productIds },
//       ...variantColorFilter,
//     });

//     // ======= Filters =======
//     const priceRangeAgg = Product.aggregate([
//       { $match: productQuery },
//       {
//         $group: {
//           _id: null,
//           min: { $min: "$price" },
//           max: { $max: "$price" },
//         },
//       },
//     ]);

//     const colorMatch = { ...productQuery };
//     if (color) delete colorMatch["colors.name"];

//     const colorsAgg = Product.aggregate([
//       { $match: colorMatch },
//       { $unwind: "$colors" },
//       {
//         $group: {
//           _id: "$colors.name",
//           value: { $first: "$colors.value" },
//           countProducts: { $sum: 1 },
//         },
//       },
//       { $sort: { _id: 1 } },
//       {
//         $project: {
//           _id: 0,
//           name: "$_id",
//           value: 1,
//           countProducts: 1,
//         },
//       },
//     ]);

//     const [variants, totalVariants, priceRangeResult, colors] =
//       await Promise.all([
//         variantsQuery,
//         totalVariantsQuery,
//         priceRangeAgg,
//         colorsAgg,
//       ]);

//     // ======= Shuffle (Fisher-Yates Algorithm) =======
//     for (let i = variants.length - 1; i > 0; i--) {
//       const j = Math.floor(Math.random() * (i + 1));
//       [variants[i], variants[j]] = [variants[j], variants[i]];
//     }

//     // ======= دمج الـ Variant مع المنتج الأصلي =======
//     const productMap = new Map(productsBase.map((p) => [String(p._id), p]));

//     const formatted = variants.map((v) => {
//       const base = productMap.get(String(v.productId));
//       return {
//         variantId: v._id,
//         _id: v.productId,
//         title: base.title,
//         slug: base.slug,
//         price: base.price,
//         rating: base.rating,
//         productTypeName: base.productTypeName,
//         sku: v.sku,
//         color: v.color,
//         image: v.images?.[0]?.url || base.mainImage || null,
//       };
//     });

//     const priceRange =
//       priceRangeResult.length > 0
//         ? { min: priceRangeResult[0].min, max: priceRangeResult[0].max }
//         : { min: 0, max: 0 };

//     res.json({
//       success: true,
//       data: formatted,
//       filters: {
//         colors,
//         priceRange,
//       },
//       pagination: {
//         page,
//         limit,
//         total: totalVariants,
//         totalPages: Math.ceil(totalVariants / limit),
//       },
//     });
//   })
// );

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || "20");
    const skip = (page - 1) * limit;

    const { productTypeName, search, color, minPrice, maxPrice } = req.query;

    // ----- Build Main Query -----
    const productQuery = { isAvailable: true, status: "active" };

    if (productTypeName) {
      const types = productTypeName.split(",").map((t) => t.trim());
      productQuery.productTypeName = { $in: types };
    }

    if (search) {
      productQuery.searchableText = new RegExp(search, "i");
    }

    if (minPrice || maxPrice) {
      productQuery.price = {};
      if (minPrice) productQuery.price.$gte = Number(minPrice);
      if (maxPrice) productQuery.price.$lte = Number(maxPrice);
    }

    // ----- Variant color filter -----
    let variantColorFilter = {};
    if (color) {
      const colors = color.split(",").map((c) => c.trim());
      variantColorFilter = { "color.name": { $in: colors } };
    }

    // ======= Base Products =======
    const productsBase = await Product.find(productQuery).select(
      "title price mainImage colors sku slug searchableText rating productTypeName"
    );

    const productIds = productsBase.map((p) => p._id);

    // ======= Variants =======
    const variantsQuery = ProductVariant.find({
      productId: { $in: productIds },
      ...variantColorFilter,
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalVariantsQuery = ProductVariant.countDocuments({
      productId: { $in: productIds },
      ...variantColorFilter,
    });

    // ======= Filters =======
    const priceRangeAgg = Product.aggregate([
      { $match: productQuery },
      {
        $group: {
          _id: null,
          min: { $min: "$price" },
          max: { $max: "$price" },
        },
      },
    ]);

    const colorMatch = { ...productQuery };
    if (color) delete colorMatch["colors.name"];

    const colorsAgg = Product.aggregate([
      { $match: colorMatch },
      { $unwind: "$colors" },
      {
        $group: {
          _id: "$colors.name",
          value: { $first: "$colors.value" },
          countProducts: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          name: "$_id",
          value: 1,
          countProducts: 1,
        },
      },
    ]);

    const [variants, totalVariants, priceRangeResult, colors] =
      await Promise.all([
        variantsQuery,
        totalVariantsQuery,
        priceRangeAgg,
        colorsAgg,
      ]);

    // ======= Shuffle =======
    for (let i = variants.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [variants[i], variants[j]] = [variants[j], variants[i]];
    }

    // ======= Group ALL variants by product (to get colorsImages[]) =======
    const allVariantsForProducts = await ProductVariant.find({
      productId: { $in: productIds },
    }).select("productId color images");

    const groupedVariants = {};
    for (const v of allVariantsForProducts) {
      const pid = String(v.productId);
      if (!groupedVariants[pid]) groupedVariants[pid] = [];

      groupedVariants[pid].push({
        name: v.color?.name,
        value: v.color?.value,
        image: v.images?.[0]?.url || null,
      });
    }

    // ======= Map productId → base =======
    const productMap = new Map(productsBase.map((p) => [String(p._id), p]));

    // ======= Final Response (each variant separate row) =======
    const formatted = variants.map((v) => {
      const base = productMap.get(String(v.productId));
      const colorsImages = groupedVariants[String(v.productId)] || [];

      return {
        variantId: v._id,
        _id: v.productId,
        title: base.title,
        slug: base.slug,
        price: base.price,
        rating: base.rating,
        productTypeName: base.productTypeName,
        sku: v.sku,
        color: v.color,
        image: v.images?.[0]?.url || base.mainImage || null,

        // 👇 هنا التعديل الحقيقي
        colorsImages: colorsImages,
      };
    });

    const priceRange =
      priceRangeResult.length > 0
        ? { min: priceRangeResult[0].min, max: priceRangeResult[0].max }
        : { min: 0, max: 0 };

    res.json({
      success: true,
      data: formatted,
      filters: {
        colors,
        priceRange,
      },
      pagination: {
        page,
        limit,
        total: totalVariants,
        totalPages: Math.ceil(totalVariants / limit),
      },
    });
  })
);

// ##############
router.get("/quick-view/:id", getQuickViewProduct);

//
/**
 * @desc    Update a product with variants (full update)
 * @route   PUT /api/products/:id
 * @access  Private/Admin
 */
router.put(
  "/:id",
  // protect,
  // restrictTo("admin", "vendor"),
  upload.any(),
  updateProduct
);

//
router.get("/:slug", getProduct);

/**
 * @desc    Partially update a product (partial update)
 * @route   PATCH /api/products/:id
 * @access  Private/Admin
 */

router.patch(
  "/:id",
  // protect,
  // restrictTo("admin", "vendor"),
  upload.any(),
  patchProduct
);

/**
 * @desc    Delete a product with variants
 * @route   DELETE /api/products/:id
 * @access  Private/Admin
 */
router.delete(
  "/:id",
  // protect,
  // restrictTo("admin", "vendor"),
  deleteProduct
);

module.exports = router;
