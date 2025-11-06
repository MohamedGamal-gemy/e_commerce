const Product = require("../models/product");
const ProductVariant = require("../models/productVariant");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/catchAsync");
const { createProductSchema, updateProductSchema } = require("../validations/productValidation");
const { groupFilesByField } = require("../utils/file.utils");
const { createProductAndVariants, updateProductAndVariants, deleteProductAndVariants } = require("../services/product.service");
const ProductCacheService = require("../services/productCache.service");

/**
 * @desc Create a new product with variants
 * @route POST /api/products
 * @access Private/Admin
 */
exports.createProduct = asyncHandler(async (req, res, next) => {
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
  const { error, value } = createProductSchema.validate(req.body, {
    abortEarly: false,
  });
  
  if (error) {
    const errorMessages = error.details.map((detail) => detail.message).join(", ");
    return next(new ApiError(`Validation error: ${errorMessages}`, 400));
  }

  const { variants, ...productData } = value;

  // 3️⃣ Check if images are uploaded
  if (!req.files || !req.files.length) {
    return next(new ApiError("No images uploaded. At least one image is required.", 400));
  }

  // 4️⃣ Group uploaded files by fieldname
  const filesByField = groupFilesByField(req.files);

  // 5️⃣ Create product and variants using service
  const newProductId = await createProductAndVariants(
    productData,
    variants,
    filesByField
  );

  // 6️⃣ Invalidate cache after creating new product
  await ProductCacheService.invalidateCache();

  // 7️⃣ Fetch and return the created product with populated variants
  const populatedProduct = await Product.findById(newProductId)
    .populate("variants")
    .populate("productType", "name");

  if (!populatedProduct) {
    return next(new ApiError("Product was created but could not be retrieved", 500));
  }

  res.status(201).json(
    new ApiResponse(201, populatedProduct, "Product created successfully")
  );
});
/**
 * @desc Get all products with optional filtering
 * @route GET /api/products
 * @access Public
 */
exports.getProducts = asyncHandler(async (req, res, next) => {
  const { color, subcategory, status, minPrice, maxPrice, search, page = 1, limit = 20 } = req.query;
  
  // Build filter object
  const filter = {};
  
  // Status filter (default to active if not specified)
  if (status) {
    filter.status = status;
  } else {
    filter.status = "active";
    filter.isAvailable = true;
  }

  // Subcategory filter
  if (subcategory) {
    filter.subcategory = subcategory;
  }

  // Price range filter
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  // Color filter - query variants first
  if (color) {
    const variantProductIds = await ProductVariant.find({
      "color.name": { $regex: new RegExp(`^${color}$`, "i") },
    }).distinct("productId");

    if (variantProductIds.length > 0) {
      filter._id = { $in: variantProductIds };
    } else {
      // No products found with this color
      return res.json({ 
        count: 0, 
        products: [],
        page: Number(page),
        limit: Number(limit),
        totalPages: 0,
      });
    }
  }

  // Search filter
  if (search) {
    filter.$text = { $search: search };
  }

  // Pagination
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.max(1, Math.min(100, Number(limit)));
  const skip = (pageNum - 1) * limitNum;

  // Query options
  const queryOptions = {
    sort: { createdAt: -1 },
    skip,
    limit: limitNum,
      select: "title price slug rating numReviews   isAvailable",
  };

  // Query products with caching (cache-aside pattern)
  // Note: Text search score sorting is handled automatically in the aggregate pipeline
  const [products, total] = await Promise.all([
    ProductCacheService.getProductsWithCache(filter, queryOptions),
    ProductCacheService.getProductsCountWithCache(filter),
  ]);

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
    const errorMessages = error.details.map((detail) => detail.message).join(", ");
    return next(new ApiError(`Validation error: ${errorMessages}`, 400));
  }

  const { variants, ...productData } = value;

  // 3️⃣ Group uploaded files by fieldname (if any)
  const filesByField = req.files && req.files.length > 0 
    ? groupFilesByField(req.files) 
    : {};

  // 4️⃣ Update product and variants using service
  await updateProductAndVariants(
    id,
    productData,
    variants,
    filesByField
  );

  // 5️⃣ Invalidate cache after updating product
  await ProductCacheService.invalidateCache();

  // 6️⃣ Fetch and return the updated product with populated variants
  const populatedProduct = await Product.findById(id)
    .populate("variants")
    .populate("productType", "name");

  if (!populatedProduct) {
    return next(new ApiError("Product was updated but could not be retrieved", 500));
  }

  res.status(200).json(
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
    const errorMessages = error.details.map((detail) => detail.message).join(", ");
    return next(new ApiError(`Validation error: ${errorMessages}`, 400));
  }

  // 3️⃣ Check if at least one field is provided for update
  if (Object.keys(value).length === 0) {
    return next(new ApiError("At least one field must be provided for update", 400));
  }

  const { variants, ...productData } = value;

  // 4️⃣ Group uploaded files by fieldname (if any)
  const filesByField = req.files && req.files.length > 0 
    ? groupFilesByField(req.files) 
    : {};

  // 5️⃣ Update product and variants using service (only provided fields)
  await updateProductAndVariants(
    id,
    productData,
    variants,
    filesByField
  );

  // 6️⃣ Invalidate cache after updating product
  await ProductCacheService.invalidateCache();

  // 7️⃣ Fetch and return the updated product with populated variants
  const populatedProduct = await Product.findById(id)
    .populate("variants")
    .populate("productType", "name");

  if (!populatedProduct) {
    return next(new ApiError("Product was updated but could not be retrieved", 500));
  }

  res.status(200).json(
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
  await ProductCacheService.invalidateCache();

  res.status(200).json(
    new ApiResponse(200, null, "Product deleted successfully")
  );
});
