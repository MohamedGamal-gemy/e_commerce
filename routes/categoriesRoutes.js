const express = require("express");
const router = express.Router();
const asyncHandler = require("express-async-handler");
const Category = require("../models/category/index");
const redis = require("../config/redis");

// ✅ Get Categories with Redis cache
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const cacheKey = "categories:all";

    // 1️⃣ جرب تجيب من الكاش
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log("🚀 From Redis (Categories)");
      return res.json(JSON.parse(cached));
    }

    // 2️⃣ لو مش موجود في الكاش -> هات من DB
    const categories = await Category.find();

    // 3️⃣ خزّن في Redis لمدة 10 دقايق
    await redis.set(cacheKey, JSON.stringify(categories), "EX", 600);

    res.json(categories);
  })
);
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name } = req.body;

    const categories = await Category.find({ name });
    if (categories.length > 0) {
      return res.status(400).json({ message: "Category already exists" });
    }
    const newCategory = new Category({ name });
    await newCategory.save();
    res.json(newCategory);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    await category.deleteOne();

    res.status(200).json({ message: "Category has been deleted successfully" });
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    category.name = name || category.name;

    await category.save();

    res
      .status(200)
      .json({ message: "Category updated successfully", category });
  })
);

module.exports = router;
