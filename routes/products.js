// const express = require("express");
// const multer = require("multer");
// const asyncHandler = require("express-async-handler");
// const path = require("path");
// const fs = require("fs");
// const { Product, validateProduct } = require("../models/Product");
//
// const router = express.Router();
//
// // إعداد التخزين
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     const uploadPath = path.join(__dirname, "../uploads");
//     if (!fs.existsSync(uploadPath)) {
//       fs.mkdirSync(uploadPath, { recursive: true });
//     }
//     cb(null, uploadPath);
//   },
//   filename: (req, file, cb) => {
//     const uniqueName = Date.now() + "--" + file.originalname;
//     cb(null, uniqueName);
//   },
// });
//
// // استخدام multer بدون اسم حقل ثابت (any)
// const upload = multer({ storage });
//
// router.post(
//   "/",
//   upload.any(),
//   asyncHandler(async (req, res) => {
//     const { error } = validateProduct(req.body);
//     if (error) {
//       return res.status(400).json({ message: error.details[0].message });
//     }
//
//     const {
//       title,
//       description,
//       price,
//       category,
//       subcategory,
//       variants: variantsRaw,
//     } = req.body;
//
//     let variants = [];
//
//     try {
//       variants = JSON.parse(variantsRaw);
//     } catch (err) {
//       return res.status(400).json({ message: "Invalid JSON in variants" });
//     }
//
//     // ربط الصور مع كل variant حسب الاسم
//     variants.forEach((variant, index) => {
//       const fieldName = `variant${index}Images`;
//       const filesForVariant = req.files.filter(
//         (f) => f.fieldname === fieldName
//       );
//
//       variant.images = filesForVariant.map(
//         (file) => `/uploads/${file.filename}`
//       );
//     });
//
//     const product = new Product({
//       title,
//       description,
//       price,
//       category,
//       subcategory,
//       variants,
//     });
//
//     await product.save();
//
//     res.status(201).json({
//       message: "Product created successfully",
//       product,
//     });
//   })
// );
//
// router.get(
//   "/",
//   asyncHandler(async (req, res) => {
//     const products = await Product.find().sort({ createdAt: -1 }); // ترتيب حسب الأحدث
//
//     if (!products || products.length === 0) {
//       return res.status(404).json({ message: "No products found" });
//     }
//
//     res.status(200).json(products);
//   })
// );
//
// module.exports = router;

// ######################################
const express = require("express");
const asyncHandler = require("express-async-handler");
const { Product, validateProduct } = require("../models/Product");

const router = express.Router();

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { error } = validateProduct(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { title, description, price, category, subcategory, variants } =
      req.body;

    const product = new Product({
      title,
      description,
      price,
      category,
      subcategory,
      variants,
    });

    await product.save();

    res.status(201).json({
      message: "Product created successfully",
      product,
    });
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const products = await Product.find().sort({ createdAt: -1 });

    if (!products || products.length === 0) {
      return res.status(404).json({ message: "No products found" });
    }

    res.status(200).json(products);
  })
);

module.exports = router;

