const Product = require("../models/product");
const { productQueue } = require("../queues/productQueue");
const {
  processVariantsForQueue,
  cleanupTempFiles,
} = require("../utils/productHelpers");
const mongoose = require("mongoose");
const ProductVariant = require("../models/productVariant");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/catchAsync");
const {
  createProductSchema,
  updateProductSchema,
} = require("../validations/productValidation");

// Import aggregation handler
// const {
//   getProductsAggregationHandler,
// } = require("../handlers/productsAggregationHandler");
// const getProducts = getProductsAggregationHandler(require("../models/product"));

// exports.getProducts = getProducts;
/**
 * @desc Create a new product with variants
 * @route POST /api/products
 * @access Private/Admin
 */

exports.processProductController = async (req, res, next) => {
  const {
    title,
    description,
    price,
    productType,
    productTypeName,
    status,
    variants,
  } = req.body;
  const productId = req.params.id; // سيكون undefined في حالة الإنشاء

  // 1. إنشاء/تحديث المنتج الأساسي
  let product;
  try {
    if (productId) {
      // حالة التحديث (PATCH /:id)
      product = await Product.findByIdAndUpdate(
        productId,
        { title, description, price, productType, productTypeName, status },
        { new: true }
      );
      if (!product) return next(new ApiError("Product not found", 404));
    } else {
      // حالة الإنشاء (POST /)
      product = await Product.create({
        title,
        description,
        price,
        productType,
        productTypeName,
        status,
      });
    }
  } catch (err) {
    // يجب حذف الملفات المؤقتة حتى لو فشل إنشاء/تحديث المنتج في قاعدة البيانات
    cleanupTempFiles(req.files);
    return next(err);
  }

  try {
    // 2. معالجة المتغيرات والصور (باستخدام الدالة المستوردة)
    const variantsWithFiles = processVariantsForQueue(req, variants);

    // 3. إضافة المهمة إلى صف الانتظار (Job)
    await productQueue.add("processProductJob", {
      // اسم الـ Job داخلياً
      productId: product._id,
      variants: variantsWithFiles,
      isUpdate: !!productId,
    });

    const message = productId
      ? "Product update started. Variants & images processing..."
      : "Product created. Images & variants are processing in background.";

    res.status(productId ? 200 : 201).json({
      success: true,
      message,
      productId: product._id,
    });
  } catch (err) {
    // مهم جداً: مسح الملفات المؤقتة إذا حدث خطأ بعد إنشاء المنتج ولكن قبل إرسال الـ Job
    cleanupTempFiles(req.files);
    return next(err);
  }
};

exports.deleteProduct = async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ApiError("Invalid product ID", 400));
  }

  const product = await Product.findByIdAndDelete(id);

  if (!product) {
    return next(new ApiError("Product not found", 404));
  }

  // 🔥 نفس الـ Worker لكن ID واحد
  await productQueue.add("deleteProductJob", {
    productId: id,
  });

  res.status(200).json({
    success: true,
    message: "Product deleted successfully",
  });
};

exports.deleteMultipleProducts = async (req, res, next) => {
  // افترض أن IDs تأتي في جسم الطلب كمصفوفة (مثال: { "ids": ["id1", "id2", "id3"] })
  const { ids: productIds } = req.body;

  if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
    return next(
      new ApiError("A list of Product IDs is required for deletion.", 400)
    );
  }

  // 1. حذف المنتجات من قاعدة البيانات (كخطوة أولى سريعة)
  // استخدام deleteMany أسرع بكثير من findByIdAndDelete متكرر.
  const result = await Product.deleteMany({
    _id: { $in: productIds },
  });

  if (result.deletedCount === 0) {
    return next(new ApiError("No products found with the provided IDs.", 404));
  }

  // 2. إرسال مهمة واحدة إلى Worker لمعالجة كل عمليات الحذف اللاحقة (Variants والصور)
  await productQueue.add("deleteMultipleProductsJob", {
    productIds: productIds,
  });

  res.status(200).json({
    success: true,
    message: `${result.deletedCount} products deleted. Variants and images processing for removal in background.`,
    deletedCount: result.deletedCount,
  });
};

exports.getProductInfo = asyncHandler(async (req, res, next) => {
  const { slug } = req.params;

  const product = await Product.findOne({ slug });

  if (!product) return next(new ApiError("Product not found", 404));

  res
    .status(200)
    .json(new ApiResponse(200, product, "Product info retrieved successfully"));
});

exports.getVariantByColor = asyncHandler(async (req, res, next) => {
  const { slug } = req.params;
  const { color } = req.query;

  const product = await Product.findOne({ slug });

  if (!product) return next(new ApiError("Product not found", 404));

  let variants;

  if (color) {
    // لو في color → جلب الـ variant المطابق
    variants = await ProductVariant.find({
      _id: { $in: product.variants },
      "color.name": color,
    });
  } else {
    // لو مفيش color → جلب كل الـ variants
    variants = await ProductVariant.find({
      _id: { $in: product.variants },
    });
  }

  res
    .status(200)
    .json(new ApiResponse(200, variants, "Variants retrieved successfully"));
});

exports.getQuickViewProduct = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    return next(new ApiError("Invalid product ID", 400));
  }

  const product = await Product.aggregate([
    // 1) match by _id
    { $match: { _id: new mongoose.Types.ObjectId(id) } },

    // 2) bring variants
    {
      $lookup: {
        from: "productvariants",
        localField: "_id",
        foreignField: "productId",
        as: "variants",
      },
    },

    // 3) project fields we want
    {
      $project: {
        title: 1,
        price: 1,
        description: 1,
        productType: 1,
        images: 1, // لو عندك صور اساسية للمنتج

        variants: {
          $map: {
            input: "$variants",
            as: "v",
            in: {
              _id: "$$v._id",
              color: "$$v.color",
              sizes: "$$v.sizes",
              isDefault: "$$v.isDefault",
              images: { $slice: ["$$v.images", 4] }, // أول 4 صور فقط
            },
          },
        },
      },
    },
  ]);

  if (!product || product.length === 0) {
    return next(new ApiError("Product not found", 404));
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, product[0], "Quickview product fetched successfully")
    );
});

//

/**
 * @desc Get price range for filtered products
 * @route GET /api/products/price-range
 * @access Public
 */
exports.getPriceRange = asyncHandler(async (req, res, next) => {
  const query = {};

  // Build filters
  if (req.query.type) {
    query.productTypeName = { $in: req.query.type.split(",") };
  }
  if (req.query.color) {
    query["colors.name"] = { $in: req.query.color.split(",") };
  }
  if (req.query.search) {
    query.searchableText = { $regex: req.query.search, $options: "i" };
  }

  const result = await Product.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        minPrice: { $min: "$price" },
        maxPrice: { $max: "$price" },
      },
    },
  ]);

  res.json(new ApiResponse(200, result[0] || { minPrice: 0, maxPrice: 0 }));
});
