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
// router.get("/", getProducts);

//
// router.get(
//   "/",
//   asyncHandler(async (req, res) => {
//     const page = parseInt(req.query.page || "1");
//     const limit = parseInt(req.query.limit || "20");
//     const skip = (page - 1) * limit;

//     const { productTypeName, search, color, minPrice, maxPrice } = req.query;

//     // Base Query
//     const query = { isAvailable: true, status: "active" };

//     // Product Types Filter
//     if (productTypeName) {
//       const types = productTypeName.split(",").map((t) => t.trim());
//       query.productTypeName = { $in: types };
//     }

//     // Colors Filter
//     if (color) {
//       const colors = color.split(",").map((c) => c.trim());
//       query["colors.name"] = { $in: colors };
//     }

//     // Search Filter
//     if (search) {
//       query.searchableText = new RegExp(search, "i");
//     }

//     // Price Range Filter
//     if (minPrice || maxPrice) {
//       query.price = {};
//       if (minPrice) query.price.$gte = Number(minPrice);
//       if (maxPrice) query.price.$lte = Number(maxPrice);
//     }

//     // --- GET PRODUCTS & COUNT ---
//     const productsQuery = Product.find(query)
//       .select(
//         "title price mainImage colors sku slug searchableText rating productTypeName"
//       )
//       .skip(skip)
//       .limit(limit)
//       .sort({ createdAt: -1 });

//     const totalQuery = Product.countDocuments(query);

//     // --- GET MIN/MAX PRICE BASED ON SAME FILTERS ---
//     const priceAggQuery = Product.aggregate([
//       { $match: query },
//       {
//         $group: {
//           _id: null,
//           min: { $min: "$price" },
//           max: { $max: "$price" },
//         },
//       },
//     ]);

//     const [products, total, priceRangeResult] = await Promise.all([
//       productsQuery,
//       totalQuery,
//       priceAggQuery,
//     ]);

//     const priceRange =
//       priceRangeResult.length > 0
//         ? {
//             min: priceRangeResult[0].min,
//             max: priceRangeResult[0].max,
//           }
//         : { min: 0, max: 0 };

//     // --- RESPONSE ---
//     res.json({
//       success: true,
//       data: products,
//       priceRange,
//       pagination: {
//         page,
//         limit,
//         totalPages: Math.ceil(total / limit),
//         total,
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
    const query = { isAvailable: true, status: "active" };

    if (productTypeName) {
      const types = productTypeName.split(",").map((t) => t.trim());
      query.productTypeName = { $in: types };
    }

    if (color) {
      const colors = color.split(",").map((c) => c.trim());
      query["colors.name"] = { $in: colors };
    }

    if (search) {
      query.searchableText = new RegExp(search, "i");
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // ======= PARALLEL QUERIES =======

    const productsQuery = Product.find(query)
      .select(
        "title price mainImage colors sku slug searchableText rating productTypeName"
      )
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalQuery = Product.countDocuments(query);

    const priceRangeAgg = Product.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          min: { $min: "$price" },
          max: { $max: "$price" },
        },
      },
    ]);

    // ----- Colors aggregation (remove color filter only) -----
    const colorMatch = { ...query };
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

    const [products, total, priceRangeResult, colors] = await Promise.all([
      productsQuery,
      totalQuery,
      priceRangeAgg,
      colorsAgg,
    ]);

    const priceRange =
      priceRangeResult.length > 0
        ? { min: priceRangeResult[0].min, max: priceRangeResult[0].max }
        : { min: 0, max: 0 };

    res.json({
      success: true,
      data: products,
      filters: {
        colors,
        priceRange,
      },
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        total,
      },
    });
  })
);

//
// router.get("/price-range", getPriceRange);

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
