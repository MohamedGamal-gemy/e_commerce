// // 📁 routes/colorRoutes.js
// const express = require("express");
// const router = express.Router();
// const { getColorsWithCounts } = require("../controllers/colorController");

// router.get("/", getColorsWithCounts);

// module.exports = router;

const express = require("express");
const router = express.Router();
const asyncHandler = require("express-async-handler");
const Product = require("../models/product");

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { productTypeName, search, minPrice, maxPrice } = req.query;

    // ----- Build Main Query -----
    const query = { isAvailable: true, status: "active" };

    // Product Types Filter
    if (productTypeName) {
      const types = productTypeName.split(",").map((t) => t.trim());
      query.productTypeName = { $in: types };
    }

    // Search Filter
    if (search) {
      query.searchableText = new RegExp(search, "i");
    }

    // Price Range Filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // ----- Aggregation -----
    const colors = await Product.aggregate([
      { $match: query },

      // كل لون في صف
      { $unwind: "$colors" },

      // تجميع حسب اسم اللون
      {
        $group: {
          _id: "$colors.name",
          value: { $first: "$colors.value" },
          countProducts: { $sum: 1 },
        },
      },

      // ترتيب
      { $sort: { _id: 1 } },

      // الشكل النهائي
      {
        $project: {
          _id: 0,
          name: "$_id",
          value: 1,
          countProducts: 1,
        },
      },
    ]);

    res.json({ success: true, data: colors });
  })
);

module.exports = router;

module.exports = router;
