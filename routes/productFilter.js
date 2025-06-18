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

//     const subcategories = await Product.distinct("subcategory", query);

//     const colors = await Product.distinct("variants.color.name", query);

//     const sizes = await Product.distinct("variants.sizes.size", query);
//     const prises = await Product.distinct("price", query);

//     res.json({
//       // subcategory,
//       subcategories,
//       colors,
//       sizes,
//       prises,
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Failed to fetch filters" });
//   }
// });

// module.exports = router;

const express = require("express");
const router = express.Router();
const { Product } = require("../models/Product");

router.get("/filters", async (req, res) => {
  try {
    const { category, subcategory } = req.query;

    const query = {};

    if (category) {
      query.category = category;
    }
    if (subcategory) {
      query.subcategory = { $in: subcategory.split(",") };
    }

    // جلب الداتا المطلوبة
    const subcategories = await Product.distinct("subcategory", query);
    const colors = await Product.distinct("variants.color.name", query);
    const sizes = await Product.distinct("variants.sizes.size", query);
    const prices = await Product.distinct("price", query);

    // حساب أقل وأعلى سعر
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

    res.json({
      subcategories,
      colors,
      // sizes,
      // prices,
      minPrice,
      maxPrice,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch filters" });
  }
});

module.exports = router;
