// const express = require("express");
// const router = express.Router();
// const { Product } = require("../models/Product");

// router.get("/filters", async (req, res) => {
//   try {
//     const { category, subcategory } = req.query;

//     const query = {};

//     if (category) {
//       query.category = category;
//     }
//     if (subcategory) {
//       query.subcategory = { $in: subcategory.split(",") };
//     }

//     // جلب الداتا المطلوبة
//     const subcategories = await Product.distinct("subcategory", query);
//     const colors = await Product.distinct("variants.color.name", query);
//     const sizes = await Product.distinct("variants.sizes.size", query);
//     const prices = await Product.distinct("price", query);

//     // حساب أقل وأعلى سعر
//     const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
//     const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

//     res.json({
//       subcategories,
//       colors,
//       // sizes,
//       // prices,
//       minPrice,
//       maxPrice,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Failed to fetch filters" });
//   }
// });

// module.exports = router;

const express = require("express");
const router = express.Router();
const { Product } = require("../models/productModel");

router.get("/filters", async (req, res) => {
  try {
    const { category, subcategory } = req.query;

    // ⬅️ نستخدم هذا الـ query لكل الفلاتر ما عدا subcategories
    const query = {};
    if (category) query.category = category;
    if (subcategory) query.subcategory = { $in: subcategory.split(",") };

    // ⬅️ لكن نستخدم هذا للاستعلام عن كل الـ subcategories داخل الكاتيجوري فقط
    const subcategoryQuery = {};
    if (category) subcategoryQuery.category = category;

    const subcategories = await Product.distinct(
      "subcategory",
      subcategoryQuery
    );
    const colors = await Product.distinct("variants.color.name", query);
    const sizes = await Product.distinct("variants.sizes.size", query);
    const prices = await Product.distinct("price", query);

    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

    res.json({
      subcategories, // كل السبكاتيجوريز المرتبطة بالكاتيجوري فقط
      colors, // متأثرة بالسبكاتيجوري المحددة
      minPrice,
      maxPrice,
      // sizes, // لو عايزهم بعدين
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch filters" });
  }
});

module.exports = router;
