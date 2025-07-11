const express = require("express");
const asyncHandler = require("express-async-handler");
const ProductVariant = require("../models/variantsModel");
const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const variants = await ProductVariant.find();

    res.json(variants);
  })
);
router.get(
  "/:colors",
  asyncHandler(async (req, res) => {
    const variants = await ProductVariant.find().select("color").lean();
    const seen = new Set();
    const unique = [];

    for (const item of variants) {
      const colorName = item.color?.name?.trim().toLowerCase();
      if (!seen.has(colorName)) {
        seen.add(colorName);
        unique.push(item);
      }
    }

    res.json(unique);
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
