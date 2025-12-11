const Product = require("../models/product");
const { productQueue } = require("../queues/productQueue");
const fs = require("fs"); // للاستخدام المتزامن في catch block

const cloudinary = require("../config/cloudinary");
const mongoose = require("mongoose");
const ProductVariant = require("../models/productVariant");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/catchAsync");
const {
  createProductSchema,
  updateProductSchema,
} = require("../validations/productValidation");
const {
  createProductAndVariants,
  updateProductAndVariants,
  deleteProductAndVariants,
} = require("../services/product.service");
const {
  parseVariants,
  mapVariantFiles,
  prepareProductData,
  fetchProductWithRelations,
} = require("../utils/productHelpers");

// Import aggregation handler
const {
  getProductsAggregationHandler,
} = require("../handlers/productsAggregationHandler");
const getProducts = getProductsAggregationHandler(require("../models/product"));

exports.getProducts = getProducts;
/**
 * @desc Create a new product with variants
 * @route POST /api/products
 * @access Private/Admin
 */
// exports.createProduct = asyncHandler(async (req, res, next) => {
//   // 1️⃣ Parse variants
//   const variants = parseVariants(req.body.variants);

//   // 2️⃣ Validate request data
//   const { error, value } = createProductSchema.validate(
//     { ...req.body, variants },
//     { abortEarly: false }
//   );

//   if (error) {
//     const errorMessages = error.details
//       .map((detail) => detail.message)
//       .join(", ");
//     return next(new ApiError(`Validation error: ${errorMessages}`, 400));
//   }

//   // 3️⃣ Prepare product data with defaults
//   const { variants: validatedVariants, ...productData } = value;
//   const finalProductData = prepareProductData(productData);

//   // 4️⃣ Map uploaded files to variant indices
//   const variantFilesMap = mapVariantFiles(req.files);

//   // 5️⃣ Create product and variants using service
//   const productId = await createProductAndVariants(
//     finalProductData,
//     validatedVariants,
//     variantFilesMap
//   );

//   // 6️⃣ Fetch and return the created product
//   const createdProduct = await fetchProductWithRelations(Product, productId);

//   if (!createdProduct) {
//     return next(
//       new ApiError("Product was created but could not be retrieved", 500)
//     );
//   }

//   res
//     .status(201)
//     .json(new ApiResponse(201, createdProduct, "Product created successfully"));
// });

// exports.createProduct = async (req, res, next) => {
//   try {
//     const { title, price, productType, status, tags, variants } = req.body;

//     // Parse JSON fields
//     const parsedTags = JSON.parse(tags || "[]");
//     const parsedVariants = JSON.parse(variants || "[]");

//     // Images
//     const images =
//       req.files?.map((file) => ({
//         url: `/uploads/products/${file.filename}`,
//         name: file.filename,
//       })) || [];

//     // Build product object
//     const newProduct = new Product({
//       title,
//       price,
//       productType,
//       status,
//       tags: parsedTags,
//       variants: parsedVariants.map((v) => ({
//         color: v.color,
//         isDefault: v.isDefault,
//         sizes: v.sizes,
//         images, // تحط الصور لكل variant لو عايز
//       })),
//       images,
//     });

//     await newProduct.save();

//     res.status(201).json({
//       success: true,
//       product: newProduct,
//     });
//   } catch (error) {
//     next(error);
//   }
// };
// exports.createProduct = async (req, res, next) => {
//   try {
//     const { title, price, productType, variants, tags, status } = req.body;

//     const parsedVariants = JSON.parse(variants || "[]");
//     const parsedTags = JSON.parse(tags || "[]");

//     // images = [{ path, filename }]
//     const images = req.files.map((file) => ({
//       url: file.path, // Cloudinary URL
//       public_id: file.filename, // Cloudinary ID
//     }));

//     const product = await Product.create({
//       title,
//       price,
//       productType,
//       variants: parsedVariants,
//       tags: parsedTags,
//       status,
//       images,
//     });

//     res.status(201).json({
//       success: true,
//       product,
//     });
//   } catch (error) {
//     next(error);
//   }
// };
// const Product = require("../models/Product");
// const ProductVariant = require("../models/ProductVariant");
// const cloudinary = require("../utils/cloudinary"); // لو هتستخدم Cloudinary
// const fs = require("fs");

// exports.createProduct = async (req, res, next) => {
//   try {
//     const { title, description, price, productType, status, tags, variants } =
//       req.body;

//     const parsedVariants = JSON.parse(variants || "[]");
//     const parsedTags = JSON.parse(tags || "[]");

//     // 1️⃣ إنشاء المنتج بدون variants
//     const product = await Product.create({
//       title,
//       description,
//       price,
//       productType,
//       status,
//       tags: parsedTags,
//     });

//     // 2️⃣ إنشاء Variants واحدة واحدة مع رفع الصور على Cloudinary
//     const variantIds = [];

//     let fileIndex = 0; // لإدارة ترتيب الصور في req.files

//     for (let i = 0; i < parsedVariants.length; i++) {
//       const variant = parsedVariants[i];
//       const images = [];

//       for (let j = 0; j < variant.images.length; j++) {
//         const file = req.files[fileIndex];
//         fileIndex++;
//         if (!file) continue;

//         // رفع الصورة على Cloudinary
//         const uploaded = await cloudinary.uploader.upload(file.path, {
//           folder: "products",
//         });

//         images.push({
//           url: uploaded.secure_url,
//           publicId: uploaded.public_id,
//         });
//       }

//       const variantDoc = await ProductVariant.create({
//         productId: product._id,
//         color: variant.color,
//         sizes: variant.sizes,
//         images,
//         isDefault: variant.isDefault,
//       });

//       variantIds.push(variantDoc._id);
//     }

//     // 3️⃣ تحديث الـ Product بالـ variantIds
//     product.variants = variantIds;
//     await product.save();

//     res.status(201).json({
//       success: true,
//       product,
//     });
//   } catch (err) {
//     next(err);
//   }
// };
//
// exports.createProduct = async (req, res, next) => {
//   try {
//     const { title, description, price, productType, status, tags, variants } =
//       req.body;

//     const parsedVariants = JSON.parse(variants || "[]");
//     const parsedTags = JSON.parse(tags || "[]");

//     const product = await Product.create({
//       title,
//       description,
//       price,
//       productType,
//       status,
//       tags: parsedTags,
//     });

//     const variantIds = [];
//     let fileIndex = 0;

//     for (const variant of parsedVariants) {
//       const images = [];

//       for (const img of variant.images) {
//         const file = req.files[fileIndex++];
//         if (!file) continue;

//         const uploaded = await cloudinary.uploader.upload(file.path, {
//           folder: "products",
//         });

//         images.push({ url: uploaded.secure_url, publicId: uploaded.public_id });
//       }

//       const variantDoc = await ProductVariant.create({
//         productId: product._id,
//         color: variant.color,
//         sizes: variant.sizes,
//         images,
//         isDefault: variant.isDefault,
//       });

//       variantIds.push(variantDoc._id);
//     }

//     product.variants = variantIds;

//     // 🟢 update colors summary
//     const colorsSet = new Set();
//     product.colors = parsedVariants
//       .map((v) => v.color)
//       .filter((c) => c && !colorsSet.has(c.value) && colorsSet.add(c.value));

//     await product.save();

//     res.status(201).json({ success: true, product });
//   } catch (err) {
//     next(err);
//   }
// };

// exports.createProduct = async (req, res, next) => {
//   try {
//     const { title, description, price, productType, status, tags, variants } =
//       req.body;

//     const parsedVariants = JSON.parse(variants || "[]");
//     const parsedTags = JSON.parse(tags || "[]");

//     const product = await Product.create({
//       title,
//       description,
//       price,
//       productType,
//       status,
//       tags: parsedTags,
//     });

//     // Add Job
//     productQueue.add("processProduct", {
//       productId: product._id,
//       parsedVariants,
//       files: req.files,
//     });

//     res.status(201).json({
//       success: true,
//       message:
//         "Product created. Images & variants are processing in background.",
//       productId: product._id,
//     });
//   } catch (err) {
//     next(err);
//   }
// };

// createProduct.js
// exports.createProduct = async (req, res, next) => {
//   try {
//     const { title, description, price, productType, status, tags, variants } =
//       req.body;

//     // التأكد من أن variants و tags مصفوفات صالحة
//     const parsedVariants = JSON.parse(variants || "[]");
//     const parsedTags = JSON.parse(tags || "[]");

//     // 1. إنشاء المنتج في MongoDB (قبل إضافة المهمة)
//     const product = await Product.create({
//       title,
//       description,
//       price,
//       productType,
//       status,
//       tags: parsedTags,
//     });

//     // --- التحسين الأهم لمشكلة OOM والربط الهش ---
//     /* في التصميم الأصلي، كنت تعتمد على ترتيب files[] لربطها بـ variant.images.
//        الآن، سننشئ قائمةvariants جديدة تحتوي على buffers الملفات المربوطة.
//        سنفترض أن files[] في req.files مرتبة بنفس ترتيب صور المتغيرات في parsedVariants.
//        (على الرغم من أن الاعتماد على الترتيب يظل هشًا، لكن هذا هو الافتراض الحالي في الكود).
//     */

//     let fileIndex = 0;
//     const variantsWithBuffers = parsedVariants.map((variant) => {
//       const imagesWithBuffers = [];

//       // نمر على عدد الصور المتوقعة لهذا المتغير
//       for (let i = 0; i < variant.images.length; i++) {
//         const file = req.files[fileIndex++];

//         if (file) {
//           // نمرر فقط البيانات الضرورية لتخزينها في Redis
//           imagesWithBuffers.push({
//             // Buffer هو الذي يسبب OOM، لكن يجب تمريره ليتم معالجته.
//             // الحل البديل (الأكثر أمانًا) هو تخزين الملفات مؤقتًا على القرص (DiskStorage)
//             // وتمرير مسار الملف فقط، لكننا سنلتزم بـ MemoryStorage ونمرر الـ Buffer فقط
//             // بعد أن قمنا بحذف أي خصائص إضافية غير ضرورية من Multer.
//             buffer: file.buffer,
//             originalname: file.originalname,
//             mimetype: file.mimetype,
//           });
//         }
//       }

//       return {
//         ...variant,
//         images: imagesWithBuffers, // استبدال الـ placeholders بالـ buffers الفعلية
//       };
//     });

//     // 2. إضافة المهمة إلى صف الانتظار (Job)
//     // نرسل VariantsWithBuffers بدلاً من files: req.files
//    await productQueue.add("processProduct", {
//       productId: product._id,
//       parsedVariants: variantsWithBuffers, // هذا يحتوي الآن على الـ Buffers
//     });

//     res.status(201).json({
//       success: true,
//       message:
//         "Product created. Images & variants are processing in background.",
//       productId: product._id,
//     });
//   } catch (err) {
//     next(err);
//   }
// };

exports.createProduct = async (req, res, next) => {
  try {
    const {
      title,
      description,
      price,
      productType,
      productTypeName,
      status,
      // colors,
      variants,
    } = req.body;

    // parsedColors = JSON.parse(colors);
    const parsedVariants = JSON.parse(variants || "[]");

    // 1. إنشاء المنتج في MongoDB
    const product = await Product.create({
      title,
      description,
      price,
      productType,
      productTypeName,
      status,
      // colors: parsedColors,
    });
    console.log("productTypeName", productTypeName);
    // console.log("allColors", colors);

    // 🔔 التحسين: ربط الملفات بمساراتها (Paths) بدلاً من الـ Buffers
    let fileIndex = 0;
    const variantsWithFilePaths = parsedVariants.map((variant) => {
      const imagesWithPaths = [];

      // نمر على عدد الصور المتوقعة لهذا المتغير
      for (let i = 0; i < variant.images.length; i++) {
        const file = req.files[fileIndex++]; // Multer DiskStorage يضيف خاصية `path`

        if (file) {
          imagesWithPaths.push({
            // 🔔 تمرير مسار الملف فقط (String) - الحجم صغير جداً
            path: file.path,
            originalname: file.originalname,
            mimetype: file.mimetype,
          });
        }
      }

      return {
        ...variant,
        images: imagesWithPaths, // يحتوي الآن على مسارات الملفات المؤقتة
      };
    });

    // 2. إضافة المهمة إلى صف الانتظار (Job)
    await productQueue.add("processProduct", {
      productId: product._id,
      parsedVariants: variantsWithFilePaths, // بيانات صغيرة (مسارات Strings)
    });

    res.status(201).json({
      success: true,
      message:
        "Product created. Images & variants are processing in background.",
      productId: product._id,
    });
  } catch (err) {
    // 🔔 مهم: إذا حدث خطأ في المتحكم، يجب حذف الملفات المؤقتة من القرص.
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        // نستخدم fs.unlinkSync لأننا في block متزامن
        try {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (e) {
          console.error(
            "Failed to delete temp file during error handling:",
            e.message
          );
        }
      });
    }
    next(err);
  }
};
// const Product = require("../models/product");
// const { productQueue } = require("../queues/product.queue");

// exports.createProduct = async (req, res, next) => {
//   try {
//     const { title, description, price, productType, status, tags, variants } =
//       req.body;

//     const parsedVariants = JSON.parse(variants || "[]");
//     const parsedTags = JSON.parse(tags || "[]");

//     // إنشاء المنتج بدون waiting على الصور
//     const product = await Product.create({
//       title,
//       description,
//       price,
//       productType,
//       status,
//       tags: parsedTags,
//     });

//     // إضافة Job للـ queue
//     await productQueue.add("processProduct", {
//       productId: product._id,
//       parsedVariants,
//       files: req.files, // multer memoryStorage buffers
//     });

//     res.status(201).json({
//       success: true,
//       message: "Product created. Images & variants are processing in background.",
//       productId: product._id,
//     });
//   } catch (err) {
//     next(err);
//   }
// };

/**
 * @desc Get all products with optional filtering
 * @route GET /api/products
 * @access Public
 */

// exports.getProducts = async (req, res) => {
//   try {
//     const { productTypeName, search } = req.query;

//     let filter = {};

//     // فلتر أكتر من نوع productTypeName (Comma Separated)
//     if (productTypeName) {
//       const types = productTypeName.split(",").map((t) => t.trim());
//       filter.productTypeName = { $in: types };
//     }

//     // فلتر الـ Search
//     if (search) {
//       const searchRegex = new RegExp(search, "i"); // case-insensitive
//       filter.searchableText = searchRegex;
//     }

//     const products = await Product.find(filter);

//     res.json(products);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server Error" });
//   }
// };

// exports.getProducts = asyncHandler(async (req, res) => {
//   const {
//     color,
//     productTypeName,
//     status,
//     minPrice,
//     maxPrice,
//     search,
//     page = 1,
//     limit = 3,
//   } = req.query;

//   const filter = {};
//   filter.status = status || "active";
//   filter.isAvailable = true;

//   // 🧩 Filter by productTypeName (comma separated)
//   if (productTypeName) {
//     const typeNames = productTypeName.split(",").map((n) => n.trim());
//     filter.productTypeName = typeNames;
//   }

//   // 💰 Price range filter
//   if (minPrice || maxPrice) {
//     filter.price = {};
//     if (minPrice) filter.price.$gte = Number(minPrice);
//     if (maxPrice) filter.price.$lte = Number(maxPrice);
//   }

//   // 🎨 Color filter (multiple colors supported)
//   if (color) {
//     const colorValues = color.split(",").map((c) => c.trim());

//     // ⬇️ Get all productIds that have any of the given colors
//     const variantProductIds = await ProductVariant.find({
//       "color.name": { $in: colorValues.map((c) => new RegExp(`^${c}$`, "i")) },
//     }).distinct("productId");

//     if (variantProductIds.length > 0) {
//       filter._id = { $in: variantProductIds };
//     } else {
//       return res.json({
//         count: 0,
//         total: 0,
//         page: Number(page),
//         limit: Number(limit),
//         totalPages: 0,
//         products: [],
//       });
//     }
//   }

//   // 🔍 Text search
//   if (search) filter.$text = { $search: search };

//   // 📄 Pagination setup
//   const pageNum = Math.max(1, Number(page));
//   const limitNum = Math.max(1, Math.min(100, Number(limit)));
//   const skip = (pageNum - 1) * limitNum;

//   const options = {
//     sort: { createdAt: -1 },
//     skip,
//     limit: limitNum,
//     select:
//       "title price slug rating numReviews totalStock status isAvailable createdAt",
//   };

//   // 🚀 Use static method
//   const products = await Product.getProductsWithColorPreviews(filter, options);
//   const total = products.length;

//   res.json({
//     count: products.length,
//     total,
//     page: pageNum,
//     limit: limitNum,
//     totalPages: Math.ceil(total / limitNum),
//     products,
//   });
// });
/**
 * @desc Get single product by ID with populated variants and productType
 * @route GET /api/products/:id
 * @access Public
 */
// exports.getProduct = asyncHandler(async (req, res, next) => {
//   const { slug } = req.params;

//   if (!slug) {
//     return next(new ApiError("Invalid product ID", 400));
//   }
//   // if (!mongoose.isValidObjectId(id)) {
//   //   return next(new ApiError("Invalid product ID", 400));
//   // }

//   const product = await Product.find({ slug })
//     .select(
//       "title price rating numReviews  slug description images productType variants"
//     )

//     .populate("variants")
//     .populate("productType", "name");

//   if (!product) {
//     return next(new ApiError("Product not found", 404));
//   }

//   res
//     .status(200)
//     .json(new ApiResponse(200, product, "Product retrieved successfully"));
// });
// exports.getVariantByColor = asyncHandler(async (req, res, next) => {
//   const { slug } = req.params;
//   const { color } = req.query;

//   const product = await Product.findOne({ slug });

//   if (!product) return next(new ApiError("Product not found", 404));

//   const variant = await ProductVariant.findOne({
//     _id: { $in: product.variants },
//     ["color.name"]: color,
//   });

//   res
//     .status(200)
//     .json(new ApiResponse(200, variant, "Variant retrieved successfully"));
// });

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

// exports.getProductInfo = asyncHandler(async (req, res, next) => {
//   const { slug } = req.params;

//   //   const product = await Product.findOne({ slug }).select(
//   //     "title slug description price originalPrice discountType discountValue mainImage colors productTypeName rating numReviews"
//   //   );
//   //   // .populate("productType", "name");

//   //   if (!product) return next(new ApiError("Product not found", 404));

//   //   res
//   //     .status(200)
//   //     .json(new ApiResponse(200, product, "Product info retrieved successfully"));
//   // });
//   // const product = await Product.findOne({ slug }).select(
//   //   "title slug description price originalPrice discountType discountValue mainImage colors productTypeName rating numReviews"
//   // );

//   const product = await Product.findOne({ slug }).select(
//     "title slug description price originalPrice discountType discountValue discountStart discountEnd mainImage colors productTypeName rating numReviews"
//   );

//   if (!product) return next(new ApiError("Product not found", 404));

//   // حول الـ document object to include virtuals
//   // const productData = product.toObject({ virtuals: true });

//   res
//     .status(200)
//     .json(new ApiResponse(200, product, "Product info retrieved successfully"));
// });
//
exports.getProductInfo = asyncHandler(async (req, res, next) => {
  const { slug } = req.params;

  //   const product = await Product.findOne({ slug }).select(
  //     "title slug description price originalPrice discountType discountValue mainImage colors productTypeName rating numReviews"
  //   );
  //   // .populate("productType", "name");

  //   if (!product) return next(new ApiError("Product not found", 404));

  //   res
  //     .status(200)
  //     .json(new ApiResponse(200, product, "Product info retrieved successfully"));
  // });
  // const product = await Product.findOne({ slug }).select(
  //   "title slug description price originalPrice discountType discountValue mainImage colors productTypeName rating numReviews"
  // );

  const product = await Product.findOne({ slug });

  if (!product) return next(new ApiError("Product not found", 404));

  res
    .status(200)
    .json(new ApiResponse(200, product, "Product info retrieved successfully"));
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

//
/**
 * @desc Update a product with variants (full update)
 * @route PUT /api/products/:id
 * @access Private/Admin
 */
exports.updateProduct = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  // 1️⃣ Parse variants
  if (req.body.variants) {
    req.body.variants = parseVariants(req.body.variants);
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

  // 3️⃣ Map uploaded files to variant indices
  const variantFilesMap = mapVariantFiles(req.files);

  // 4️⃣ Update product and variants using service
  await updateProductAndVariants(id, productData, variants, variantFilesMap);

  // 5️⃣ Fetch and return the updated product
  const updatedProduct = await fetchProductWithRelations(Product, id);

  if (!updatedProduct) {
    return next(
      new ApiError("Product was updated but could not be retrieved", 500)
    );
  }

  res
    .status(200)
    .json(new ApiResponse(200, updatedProduct, "Product updated successfully"));
});

/**
 * @desc Partially update a product (PATCH - only update provided fields)
 * @route PATCH /api/products/:id
 * @access Private/Admin
 */
exports.patchProduct = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  // 1️⃣ Parse variants if provided
  if (req.body.variants) {
    req.body.variants = parseVariants(req.body.variants);
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

  // 3️⃣ Check if at least one field is provided
  if (Object.keys(value).length === 0) {
    return next(
      new ApiError("At least one field must be provided for update", 400)
    );
  }

  const { variants, ...productData } = value;

  // 4️⃣ Map uploaded files to variant indices
  const variantFilesMap = mapVariantFiles(req.files);

  // 5️⃣ Update product and variants using service
  await updateProductAndVariants(id, productData, variants, variantFilesMap);

  // 6️⃣ Fetch and return the updated product
  const updatedProduct = await fetchProductWithRelations(Product, id);

  if (!updatedProduct) {
    return next(
      new ApiError("Product was updated but could not be retrieved", 500)
    );
  }

  res
    .status(200)
    .json(new ApiResponse(200, updatedProduct, "Product updated successfully"));
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
/**
 * @desc Get related products based on tags, attributes, and price
 * @route GET /api/products/:slug/related
 * @access Public
 */
exports.getRelatedProducts = asyncHandler(async (req, res, next) => {
  const { slug } = req.params;

  const product = await Product.findOne({ slug }).lean();

  if (!product) {
    return next(new ApiError("Product not found", 404));
  }

  const related = await Product.aggregate([
    {
      $match: {
        _id: { $ne: product._id },
        isAvailable: true,
        status: "active",
        productType: product.productType,
      },
    },
    {
      $addFields: {
        tagScore: {
          $size: {
            $setIntersection: ["$tags", product.tags || []],
          },
        },
        attrScore: {
          $size: {
            $setIntersection: [
              { $map: { input: "$attributes", as: "a", in: "$$a.key" } },
              (product.attributes || []).map((a) => a.key),
            ],
          },
        },
        priceScore: {
          $cond: [
            {
              $lte: [{ $abs: { $subtract: ["$price", product.price] } }, 150],
            },
            1,
            0,
          ],
        },
      },
    },
    {
      $addFields: {
        finalScore: {
          $add: ["$tagScore", "$attrScore", "$priceScore"],
        },
      },
    },
    { $sort: { finalScore: -1, rating: -1, views: -1 } },
    { $limit: 12 },
  ]);

  res.json(new ApiResponse(200, related, "Related products retrieved"));
});
