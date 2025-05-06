const express = require("express");
const router = express.Router();
const Product = require("../models/Product"); // أو حسب مكان الملف

// API to get filters
router.get("/filters", async (req, res) => {
  try {
    // نجيب كل أنواع الملابس بدون تكرار
    const subcategories = await Product.distinct("subcategory");

    // نجيب كل الألوان بدون تكرار
    const colors = await Product.distinct("variants.color.name");

    // نجيب كل المقاسات بدون تكرار
    const sizes = await Product.distinct("variants.sizes.size");

    res.json({
      subcategories,
      colors,
      sizes,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch filters" });
  }
});

module.exports = router;
