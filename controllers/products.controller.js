// // src/controllers/products.controller.js
// const asyncHandler = require("express-async-handler");
// const {
//   getProducts,
//   getProductFacets,
// } = require("../services/products.service");
// // const { getProductFacets, getProducts } = require("../services/products.service");
// const { createProductService } = require("../services/poducts.create.service");

// exports.facets = asyncHandler(async (req, res) => {
//   const data = await getProductFacets(req.query);
//   res.json(data);
// });

// // exports.show = asyncHandler(async (req, res) => {
// //     const data = await getProducts(req.query);
// //     res.json(data);
// // });

// exports.show = asyncHandler(async (req, res) => {
//   // 1. استدعاء دالة الخدمة وتمرير req.query
//   const data = await getProducts(req.query);

//   // 2. إرسال الرد HTTP
//   res.status(200).json({
//     status: "success",
//     ...data,
//   });
// });
// // const { createProductService } = require("../services/products.service");

// // exports.createProduct = async (req, res) => {
// //     const data = await createProductService(req);
// //     res.status(201).json({
// //         message: "Product created successfully",
// //         product: data,
// //     });
// // };
// //

// // ... getProductsController (الدالة القديمة) ...

// /**
//  * @desc Create a new product (Admin route)
//  * @route POST /api/v1/products
//  * @access Private/Admin
//  */
// exports.createProduct = asyncHandler(async (req, res) => {
//   // 💡 افتراض أنك تستخدم Multer لجمع الـ Files في req.files أو req.body.files

//   // 1. إعادة هيكلة البيانات القادمة من req.body/req.files
//   const productData = req.body;

//   // ⚠️ يجب فك محتويات الـ Variants والـ Files بشكل صحيح هنا
//   // إذا كنت تستخدم multer، ستكون الـ Files متاحة كـ req.files

//   // مثال مبسط لفك الـ JSON وتحويله إلى صيغة سهلة للمعالجة:
//   const variantsData = JSON.parse(productData.variants || "[]");

//   const finalProductData = {
//     ...productData,
//     // إرفاق ملفات الـ Variants المحلية
//     variants: variantsData.map((variant, index) => ({
//       ...variant,
//       // ⚠️ هنا يجب ربط ملفات الصور بالـ Variant الصحيح بناءً على المنطق الذي تستخدمه في Multer
//       imageFiles: req.files[`variants[${index}].imageFiles`] || [],
//       isDefault: variant.isDefault === "true", // تحويل السلسلة إلى بوليان
//       sizes: variant.sizes ? JSON.parse(variant.sizes) : [],
//     })),
//     // إرفاق ملف الصورة الرئيسية (إذا كانت منفصلة)
//     mainImageFile: req.files["mainImageFile"]
//       ? req.files["mainImageFile"][0]
//       : null,
//   };

//   // 2. استدعاء دالة الخدمة
//   const createdProduct = await createProductService(finalProductData);

//   // 3. إرسال الرد HTTP
//   res.status(201).json({
//     status: "success",
//     product: createdProduct,
//     message: "Product and its variants created successfully.",
//   });
// });



const cloudinary = require("../config/cloudinary");
const Product = require("../models/product");
const ProductVariant = require("../models/productVariant");
const mongoose = require("mongoose");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/catchAsync");

// helper for promise-based upload
const uploadImage = (buffer, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
    stream.end(buffer);
  });

exports.createProduct = asyncHandler(async (req, res, next) => {
  const {
    title,
    description,
    shortDescription,
    price,
    originalPrice,
    category,
    subcategory,
    sku,
    tags,
    colorOptions,
    sizeOptions,
    isFeatured,
    variants,
  } = req.body;

  if (!variants) return next(new ApiError("Variants data is required", 400));

  let parsedVariants;
  try {
    parsedVariants = JSON.parse(variants);
  } catch (err) {
    return next(new ApiError("Invalid variants format", 400));
  }

  if (!req.files || !req.files.length) {
    return next(new ApiError("No images uploaded", 400));
  }

  // 🧩 Step 1: Group files by fieldname
  const filesByField = {};
  for (const f of req.files) {
    if (!filesByField[f.fieldname]) filesByField[f.fieldname] = [];
    filesByField[f.fieldname].push(f);
  }

  // 🖼️ Step 2: Upload main image
  // const mainFiles = filesByField["mainImage"];
  // if (!mainFiles || !mainFiles.length)
  //   return next(new ApiError("Main image is required", 400));

  // const mainUpload = await uploadImage(mainFiles[0].buffer, "products/main");

  // 🧩 Step 3: Upload variant images
  for (let i = 0; i < parsedVariants.length; i++) {
    const fieldKey = `variantImages_${i}`;
    const variantImages = filesByField[fieldKey] || [];
    const uploaded = [];

    for (const img of variantImages) {
      const up = await uploadImage(img.buffer, `products/variants/${title || "item"}`);
      uploaded.push({ url: up.secure_url, publicId: up.public_id });
    }

    parsedVariants[i].images = uploaded;
  }

  // 🧱 Step 4: Save to DB (transaction)
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const [product] = await Product.create(
      [
        {
          title,
          description,
          shortDescription,
          price,
          originalPrice,
          category,
          subcategory,
          sku,
          tags,
          colorOptions,
          sizeOptions,
          isFeatured,
          // mainImage: {
          //   url: mainUpload.secure_url,
          //   publicId: mainUpload.public_id,
          // },
        },
      ],
      { session }
    );

    // variants
    const variantDocs = parsedVariants.map((v) => ({
      productId: product._id,
      sku: v.sku,
      color: v.color,
      sizes: v.sizes,
      images: v.images,
      isDefault: !!v.isDefault,
    }));

    const createdVariants = await ProductVariant.insertMany(variantDocs, { session });
    const variantIds = createdVariants.map((v) => v._id);

    await Product.findByIdAndUpdate(product._id, { $set: { variants: variantIds } }, { session });

    if (Product.recalcAggregates) await Product.recalcAggregates(product._id);

    await session.commitTransaction();

    const populated = await Product.findById(product._id).populate("variants");
    res.status(201).json(new ApiResponse(201, populated, "✅ Product created successfully"));
  } catch (err) {
    await session.abortTransaction();
    console.error(err);
    next(new ApiError("Failed to create product", 500));
  } finally {
    session.endSession();
  }
});
