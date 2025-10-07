const express = require("express");
const asyncHandler = require("express-async-handler");
const ProductVariant = require("../models/variantsModel");
const redis = require("../config/redis");
const router = express.Router();
const Subcategory = require("../models/subcategoryModel");
const { Product } = require("../models/productModel");

// ✅ كل الـ variants
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const cacheKey = "variants:all";
    const cached = await redis.get(cacheKey);

    if (cached) {
      console.log("🚀 From Redis (all variants)");
      return res.json(JSON.parse(cached));
    }

    const variants = await ProductVariant.find().lean();

    await redis.set(cacheKey, JSON.stringify(variants), "EX", 600);

    res.json(variants);
  })
);
// router.get(
//   "/colors",
//   asyncHandler(async (req, res) => {
//     const cacheKey = "variants:colors";
//     const cached = await redis.get(cacheKey);
//     if (cached) {
//       console.log(`🚀 From Redis (unique colors for ${cacheKey})`);
//       return res.json(JSON.parse(cached));
//     }
//     let unique = [];
//     const variants = await ProductVariant.find()
//       .select("_id color.name color.value")
//       .lean();

//     const seen = new Set();
//     for (const item of variants) {
//       if (!item.color?.name) continue;

//       // فلترة بناءً على color.name لتجنب التكرار
//       const key = item.color.name.trim().toLowerCase();

//       if (!seen.has(key)) {
//         seen.add(key);
//         unique.push({
//           _id: item._id,
//           name: item.color.name?.trim() || null,
//           value: item.color.value?.trim() || null,
//         });
//       }
//     }
//     await redis.set(cacheKey, JSON.stringify(unique), "EX", 600);

//     res.json(unique);
//   })
// );

router.get(
  "/colors",
  asyncHandler(async (req, res) => {
    const uniqueColors = await ProductVariant.aggregate([
      {
        // 1. تحويل اسم اللون إلى حروف صغيرة وتمرير قيمة اللون
        $project: {
          _id: 0,
          // 🔥 توحيد الاسم باستخدام $toLower
          colorNameLower: { $toLower: "$color.name" },
          colorValue: "$color.value",
        },
      },
      {
        // 2. تجميع المستندات (Grouping) بناءً على اسم اللون الموحد
        $group: {
          // 🔥 حقل التجميع (يجب أن يكون اللون الموحد هو الـ ID)
          _id: "$colorNameLower",
          // جلب أول قيمة (Value) للون المطابق للحقل المُجمع
          colorValue: { $first: "$colorValue" },
        },
      },
      {
        // 3. إعادة تنسيق الإخراج النهائي
        $project: {
          _id: 0,
          colorName: "$_id", // إعادة تسمية الـ ID المجمّع
          colorValue: 1,
        },
      },
      {
        // 4. (اختياري) ترتيب الألوان أبجدياً
        $sort: { colorName: 1 },
      },
    ]);

    res.json(uniqueColors);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    // const variants = await ProductVariant.findById(req.params.id);
    const variants = await ProductVariant.find({ productId: req.params.id });
    if (!variants || variants.length === 0) {
      return res
        .status(404)
        .json({ message: "No variants found for this product" });
    }
    res.json(variants);
  })
);

module.exports = router;
