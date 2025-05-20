const express = require("express");
const router = express.Router();
const { Product } = require("../models/Product");

router.get("/filters", async (req, res) => {
  try {
    const { category } = req.query;

    const query = {};

    if (category) {
      query.category = category;
    }

    const subcategories = await Product.distinct("subcategory", query);

    const colors = await Product.distinct("variants.color.name", query);

    const sizes = await Product.distinct("variants.sizes.size", query);
    const prises = await Product.distinct("price", query);

    res.json({
      subcategories,
      colors,
      sizes,
      prises,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch filters" });
  }
});

module.exports = router;
