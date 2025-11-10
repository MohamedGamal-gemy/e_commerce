const Product = require("../models/product");
const mongoose = require("mongoose");
const ProductType = require("../models/productType");
const ProductVariant = require("../models/productVariant");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/catchAsync");
const {
  createProductSchema,
  updateProductSchema,
} = require("../validations/productValidation");
// const { groupFilesByField } = require("../utils/file.utils");
const {
  createProductAndVariants,
  updateProductAndVariants,
  deleteProductAndVariants,
} = require("../services/product.service");
const uploadVariantImages = require("../utils/uploadVariantImages");
const { groupFilesByField } = require("../utils/file.utils");
const { productQueue } = require("../queues/productQueue");
const { deleteImage } = require("../utils/file.utils");

exports.createProduct = async (req, res) => {
  try {
    let variants = req.body.variants;
    if (typeof variants === "string") {
      try {
        variants = JSON.parse(variants);
      } catch {
        return res.status(400).json({ success: false, message: "Invalid variants JSON format." });
      }
    }

    const product = await Product.create({
      title: req.body.title,
      description: req.body.description,
      price: req.body.price,
      productType: req.body.productType,
    });

    // Map files to variants
    const files = req.files || [];
    const fileMap = {};
    files.forEach((file) => {
      const match = file.fieldname.match(/\d+/);
      if (!match) return;
      const idx = match[0];
      if (!fileMap[idx]) fileMap[idx] = [];
      fileMap[idx].push(file);
    });

    const variantsWithFiles = variants.map((v, i) => ({
      ...v,
      images: (fileMap[i] || []).map((f) => ({
        path: f.path,
        originalname: f.originalname,
        mimetype: f.mimetype,
        size: f.size,
      })),
    }));

    await productQueue.add("uploadProductImages", {
      productId: product._id.toString(),
      variants: variantsWithFiles,
    });

    res.status(201).json({
      success: true,
      message: "✅ Product created. Images uploading in background.",
      productId: product._id,
    });
  } catch (err) {
    console.error("❌ Create Product Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc Get all products with optional filtering
 * @route GET /api/products
 * @access Public
 */

exports.getProducts = asyncHandler(async (req, res) => {
  const {
    color,
    productTypeName,
    status,
    minPrice,
    maxPrice,
    search,
    page = 1,
    limit = 3,
  } = req.query;

  const filter = {};
  filter.status = status || "active";
  filter.isAvailable = true;

  // 🧩 Filter by productTypeName (comma separated)
  if (productTypeName) {
    const typeNames = productTypeName.split(",").map((n) => n.trim());
    filter.productTypeName = typeNames;
  }

  // 💰 Price range filter
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  // 🎨 Color filter (multiple colors supported)
  if (color) {
    const colorValues = color.split(",").map((c) => c.trim());

    // ⬇️ Get all productIds that have any of the given colors
    const variantProductIds = await ProductVariant.find({
      "color.name": { $in: colorValues.map((c) => new RegExp(`^${c}$`, "i")) },
    }).distinct("productId");

    if (variantProductIds.length > 0) {
      filter._id = { $in: variantProductIds };
    } else {
      return res.json({
        count: 0,
        total: 0,
        page: Number(page),
        limit: Number(limit),
        totalPages: 0,
        products: [],
      });
    }
  }

  // 🔍 Text search
  if (search) filter.$text = { $search: search };

  // 📄 Pagination setup
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.max(1, Math.min(100, Number(limit)));
  const skip = (pageNum - 1) * limitNum;

  const options = {
    sort: { createdAt: -1 },
    skip,
    limit: limitNum,
    select:
      "title price slug rating numReviews totalStock status isAvailable createdAt",
  };

  // 🚀 Use static method
  const products = await Product.getProductsWithColorPreviews(filter, options);
  const total = products.length;

  res.json({
    count: products.length,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
    products,
  });
});
/**
 * @desc Get single product by ID with populated variants and productType
 * @route GET /api/products/:id
 * @access Public
 */
exports.getProduct = asyncHandler(async (req, res, next) => {
  const { slug } = req.params;

  if (!slug) {
    return next(new ApiError("Invalid product ID", 400));
  }
  // if (!mongoose.isValidObjectId(id)) {
  //   return next(new ApiError("Invalid product ID", 400));
  // }

  const product = await Product.find({ slug })
    .select("title price  slug description images productType variants")

    .populate("variants")
    .populate("productType", "name");

  if (!product) {
    return next(new ApiError("Product not found", 404));
  }

  res
    .status(200)
    .json(new ApiResponse(200, product, "Product retrieved successfully"));
});
/**
 * @desc Update a product with variants
 * @route PUT /api/products/:id
 * @access Private/Admin
 */
exports.updateProduct = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  // 1️⃣ Parse variants if it's a string
  if (req.body.variants && typeof req.body.variants === "string") {
    try {
      req.body.variants = JSON.parse(req.body.variants);
    } catch (parseError) {
      return next(
        new ApiError("Invalid variants JSON format: " + parseError.message, 400)
      );
    }
  }

  // 2️⃣ Validate request data
  const { error, value } = updateProductSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    const errorMessages = error.details
      .map((detail) => detail.message)
      .join(", ");
    return next(new ApiError(`Validation error: ${errorMessages}`, 400));
  }

  const { variants, ...productData } = value;

  // 3️⃣ Group uploaded files by fieldname (if any)
  const filesByField =
    req.files && req.files.length > 0 ? groupFilesByField(req.files) : {};

  // 4️⃣ Update product and variants using service
  await updateProductAndVariants(id, productData, variants, filesByField);

  // 5️⃣ Invalidate cache after updating product
  

  // 6️⃣ Fetch and return the updated product with populated variants
  const populatedProduct = await Product.findById(id)
    .populate("variants")
    .populate("productType", "name");

  if (!populatedProduct) {
    return next(
      new ApiError("Product was updated but could not be retrieved", 500)
    );
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, populatedProduct, "Product updated successfully")
    );
});

/**
 * @desc Partially update a product (PATCH - only update provided fields)
 * @route PATCH /api/products/:id
 * @access Private/Admin
 */
exports.patchProduct = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  // 1️⃣ Parse variants if it's a string
  if (req.body.variants && typeof req.body.variants === "string") {
    try {
      req.body.variants = JSON.parse(req.body.variants);
    } catch (parseError) {
      return next(
        new ApiError("Invalid variants JSON format: " + parseError.message, 400)
      );
    }
  }

  // 2️⃣ Validate request data (all fields optional for PATCH)
  const { error, value } = updateProductSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    const errorMessages = error.details
      .map((detail) => detail.message)
      .join(", ");
    return next(new ApiError(`Validation error: ${errorMessages}`, 400));
  }

  // 3️⃣ Check if at least one field is provided for update
  if (Object.keys(value).length === 0) {
    return next(
      new ApiError("At least one field must be provided for update", 400)
    );
  }

  const { variants, ...productData } = value;

  // 4️⃣ Group uploaded files by fieldname (if any)
  const filesByField =
    req.files && req.files.length > 0 ? groupFilesByField(req.files) : {};

  // 5️⃣ Update product and variants using service (only provided fields)
  await updateProductAndVariants(id, productData, variants, filesByField);

  // 6️⃣ Invalidate cache after updating product
  

  // 7️⃣ Fetch and return the updated product with populated variants
  const populatedProduct = await Product.findById(id)
    .populate("variants")
    .populate("productType", "name");

  if (!populatedProduct) {
    return next(
      new ApiError("Product was updated but could not be retrieved", 500)
    );
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, populatedProduct, "Product updated successfully")
    );
});

/**
 * @desc Delete a product with variants
 * @route DELETE /api/products/:id
 * @access Private/Admin
 */
exports.deleteProduct = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  // 1️⃣ Delete product and variants using service
  await deleteProductAndVariants(id);

  // 2️⃣ Invalidate cache after deleting product
  

  res
    .status(200)
    .json(new ApiResponse(200, null, "Product deleted successfully"));
});
