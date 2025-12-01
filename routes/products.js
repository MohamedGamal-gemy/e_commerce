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
  getProductInfo,
  getVariantByColor,
} = require("../controllers/products.controller");
const asyncHandler = require("express-async-handler");
const { protect, restrictTo } = require("../middlewares/auth");
const upload = require("../middlewares/upload");
const Product = require("../models/product");
const ProductVariant = require("../models/productVariant");
const {
  getProductsAggregationHandler,
} = require("../handlers/productsAggregationHandler");
const {
  getFiltersHandler,
  getProductsFilters,
} = require("../controllers/filtersController");

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
router.get("/", getProductsAggregationHandler(Product));

router.get("/filters", getProductsFilters);

// router.get("/", getProductsAggregationHandler(Product, ProductVariant));

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
// router.get("/:slug", getProduct);
router.get("/:slug", getProductInfo);
router.get("/:slug/variants/by-color", getVariantByColor);

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
