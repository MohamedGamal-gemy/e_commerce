const Subcategory = require("../models/subcategoryModel");
const express = require("express");
const asyncHandler = require("express-async-handler");
const router = express.Router();
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const subcategories = await Subcategory.find();
    res.json(subcategories);
  })
);
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name } = req.body;
    const subcategories = await Subcategory.find({ name });
    if (subcategories.length > 0) {
      return res.status(400).json({ message: "Subcategory already exists" });
    }
    const newSubcategory = new Subcategory({ name });
    await newSubcategory.save();
    res.json(newSubcategory);
  })
);
module.exports = router;
