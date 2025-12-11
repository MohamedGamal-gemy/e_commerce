// // const express = require("express");
// // const router = express.Router();
// const mongoose = require("mongoose");
// // const { body, validationResult } = require("express-validator");
// const cloudinary = require("cloudinary").v2;

// // Models
// // const Product = require("../models/Product");
// const express = require("express");
// const router = express.Router();
// const {
//   createProduct,
//   getProducts,
//   updateProduct,
//   patchProduct,
//   deleteProduct,
//   getProductInfo,
//   getQuickViewProduct,
//   getPriceRange,
//   getVariantByColor,
//   getRelatedProducts,
// } = require("../controllers/products.controller");
// const { protect, restrictTo } = require("../middlewares/auth");
// const upload = require("../middlewares/upload");
// const Product = require("../models/product");
// const {
//   getProductsAggregationHandler,
// } = require("../handlers/productsAggregationHandler");
// const { getProductsFilters } = require("../controllers/filtersController");
// const ProductVariant = require("../models/productVariant");

// // ============================================
// // Public Routes
// // ============================================

// /**
//  * @desc    Get products with filters, pagination, and sorting
//  * @route   GET /api/products
//  * @access  Public
//  */
// router.get("/", getProductsAggregationHandler(Product));

// /**
//  * @desc    Get products filters (colors, types, price range)
//  * @route   GET /api/products/filters
//  * @access  Public
//  */
// router.get("/filters", getProductsFilters);

// /**
//  * @desc    Get price range for filtered products
//  * @route   GET /api/products/price-range
//  * @access  Public
//  */
// router.get("/price-range", getPriceRange);

// /**
//  * @desc    Get quick view product data (lightweight)
//  * @route   GET /api/products/quick-view/:id
//  * @access  Public
//  */
// router.get("/quick-view/:id", getQuickViewProduct);

// /**
//  * @desc    Get single product by slug
//  * @route   GET /api/products/:slug
//  * @access  Public
//  */
// router.get("/:slug", getProductInfo);

// /**
//  * @desc    Get product variants by color
//  * @route   GET /api/products/:slug/variants/by-color
//  * @access  Public
//  */
// router.get("/:slug/variants/by-color", getVariantByColor);

// /**
//  * @desc    Get related products
//  * @route   GET /api/products/:slug/related
//  * @access  Public
//  */
// router.get("/:slug/related", getRelatedProducts);

// // ============================================
// // Protected Routes (Admin/Vendor)
// // ============================================

// /**
//  * @desc    Create a new product with variants
//  * @route   POST /api/products
//  * @access  Private/Admin
//  */
// // router.post("/", protect, restrictTo("admin", "vendor"), upload.any(), createProduct);
// // router.post(
// //   "/",
// //   // protect,
// //   // restrictTo("admin", "vendor"),
// //   upload.any(),
// //   createProduct
// // );

// // Cloudinary Config (ضيف الـ config بتاعك في مكان منفصل أو .env)
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// // Helper: رفع صورة وإرجاع url + public_id
// const uploadToCloudinary = (fileBuffer, folder = "products") => {
//   return new Promise((resolve, reject) => {
//     cloudinary.uploader
//       .upload_stream(
//         { folder: `${folder}`, resource_type: "auto" },
//         (error, result) => {
//           if (error) return reject(error);
//           resolve({
//             url: result.secure_url,
//             publicId: result.public_id,
//           });
//         }
//       )
//       .end(fileBuffer);
//   });
// };

// // POST /api/products - Create Product with Variants & Images
// router.post(
//   "/",
//   // Middleware للـ upload (استخدم multer أو express-fileupload)
//   // هنا هفترض إنك بتستخدم multer بالشكل ده:
//   // upload.fields([{ name: "mainImage", maxCount: 1 }, { name: "variantImages", maxCount: 20 }]),

//   // Validation (اختياري لكن مهم)
//   // [
//   //   body("title").trim().isLength({ min: 3 }).escape(),
//   //   body("description").trim().isLength({ min: 10 }),
//   //   body("price").isNumeric().toFloat(),
//   //   body("productType").isMongoId(),
//   // ],

//   async (req, res) => {
//     // const errors = validationResult(req);
//     // if (!errors.isEmpty()) {
//     //   return res.status(400).json({ errors: errors.array() });
//     // }

//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//       const {
//         title,
//         description,
//         price,
//         // originalPrice,
//         // discountType,
//         // discountValue,
//         // discountStart,
//         // discountEnd,
//         productType,
//         // colors = [],
//         variants = [],
//         // status = "active",
//         // باقي الحقول اللي عايزها...
//       } = req.body;

//       // 1. رفع الـ mainImage لو موجودة
//       // let mainImageUrl = null;
//       // if (req.files?.mainImage?.[0]) {
//       //   const result = await uploadToCloudinary(req.files.mainImage[0].buffer, "products/main");
//       //   mainImageUrl = result.url;
//       // }

//       // 2. إنشاء الـ Product الأساسي
//       const product = await Product.create(
//         [
//           {
//             title,
//             // slug: title
//             //   // .toLowerCase()
//             //   .replace(/[^a-z0-9]+/g, "-")
//             //   .replace(/(^-|-$)/g, ""),
//             description,
//             price,
//             // originalPrice,
//             // discountType,
//             // discountValue,
//             // discountStart,
//             // discountEnd ? new Date(discountEnd) : undefined,
//             productType,
//             // productTypeName: req.body.productTypeName || null,
//             // mainImage: mainImageUrl,
//             // colors,
//             // status,
//             // createdBy: req.user?._id, // لو عندك auth
//           },
//         ],
//         { session }
//       );

//       const productId = product[0]._id;
//       let totalStock = 0;
//       const createdVariants = [];

//       // 3. معالجة الـ Variants
//       if (variants && variants.length > 0) {
//         for (let i = 0; i < variants.length; i++) {
//           const variantData = variants[i];
//           const variantImages = req.files?.[`variantImages[${i}]`] || [];

//           // رفع صور الـ variant
//           const uploadedImages = [];
//           for (const file of variantImages) {
//             const result = await uploadToCloudinary(
//               file.buffer,
//               `products/${productId}/variants`
//             );
//             uploadedImages.push({
//               url: result.url,
//               publicId: result.publicId,
//               alt: variantData.color?.name || title,
//             });
//           }

//           // حساب الـ stock الكلي للـ variant
//           const variantStock =
//             variantData.sizes?.reduce(
//               (acc, s) => acc + (Number(s.stock) || 0),
//               0
//             ) || 0;
//           totalStock += variantStock;

//           // إنشاء الـ variant
//           const variant = await ProductVariant.create(
//             [
//               {
//                 productId,
//                 sku: variantData.sku || undefined,
//                 color: {
//                   name: variantData.color.name,
//                   value: variantData.color.value,
//                 },
//                 sizes: variantData.sizes || [],
//                 images: uploadedImages,
//                 isDefault: variantData.isDefault || (i === 0 ? true : false),
//               },
//             ],
//             { session }
//           );

//           createdVariants.push(variant[0]._id);
//         }
//       }

//       // 4. تحديث الـ Product بالـ variants والـ stock
//       await Product.updateOne(
//         { _id: productId },
//         {
//           $set: {
//             variants: createdVariants,
//             numVariants: createdVariants.length,
//             totalStock,
//             isAvailable: totalStock > 0,
//           },
//         },
//         { session }
//       );

//       await session.commitTransaction();

//       // جلب الـ product كامل بالـ variants وإرجاعه
//       const populatedProduct = await Product.findById(productId)
//         .populate("variants")
//         .populate("productType", "name")
//         .lean();

//       return res.status(201).json({
//         success: true,
//         message: "Product created successfully",
//         data: populatedProduct,
//       });
//     } catch (error) {
//       await session.abortTransaction();
//       console.error("Create Product Error:", error);

//       // لو في صور اتعملها upload وفشل الباقي، ممكن تعمل destroy هنا (اختياري)

//       return res.status(500).json({
//         success: false,
//         message: "Failed to create product",
//         error: error.message,
//       });
//     } finally {
//       session.endSession();
//     }
//   }
// );

// // module.exports = router;
// /**
//  * @desc    Update a product with variants (full update)
//  * @route   PUT /api/products/:id
//  * @access  Private/Admin
//  */
// router.put(
//   "/:id",
//   protect,
//   restrictTo("admin", "vendor"),
//   upload.any(),
//   updateProduct
// );

// /**
//  * @desc    Partially update a product (PATCH)
//  * @route   PATCH /api/products/:id
//  * @access  Private/Admin
//  */
// router.patch(
//   "/:id",
//   protect,
//   restrictTo("admin", "vendor"),
//   upload.any(),
//   patchProduct
// );

// /**
//  * @desc    Delete a product with variants
//  * @route   DELETE /api/products/:id
//  * @access  Private/Admin
//  */
// router.delete("/:id", protect, restrictTo("admin", "vendor"), deleteProduct);

// module.exports = router;

const express = require("express");
const router = express.Router();
const Product = require("../models/product");
const upload = require("../middlewares/uploadImages");
const { createProduct } = require("../controllers/products.controller");

// router.post("/", upload.any(), createProduct);
router.post("/", upload.any(), createProduct);
router.get("/", async (req, res) => {
  try {
    const products = await Product.find().select(
      " productTypeName colors title price numVariants totalStock isAvailable rating numReviews slug searchableText"
    );
    // .populate("variants");
    res.json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

module.exports = router;
