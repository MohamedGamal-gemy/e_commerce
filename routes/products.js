const express = require("express");
const router = express.Router();
const {
  createProduct,
  getProducts,
  updateProduct,
  patchProduct,
  deleteProduct,
  getProduct,
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

// GET /api/products
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || "20");
    const skip = (page - 1) * limit;

    // جلب المنتجات المتاحة فقط
    const query = { isAvailable: true, status: "active" };

    const products = await Product.find(query)
      // .select("title price mainImage colors sku slug searchableText rating finalPrice") // فقط الحقول المطلوبة للـ list card
      .select(
        "title price mainImage colors sku slug searchableText rating finalPrice productTypeName"
      )

      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // ترتيب حسب الأحدث أولاً

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        total,
      },
    });
  })
);

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
