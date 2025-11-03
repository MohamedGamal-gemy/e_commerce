const express = require("express");
const asyncHandler = require("express-async-handler");
const Subcategory = require("../models/subcategory/index");
const redis = require("../config/redis");

const router = express.Router();

/**
 * ✅ Get all subcategories (with Redis cache)
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const cacheKey = "subcategories:all";

    // 1️⃣ جرب الكاش أولاً
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log("🚀 From Redis (Subcategories)");
      return res.status(200).json(JSON.parse(cached));
    }

    // 2️⃣ لو مش موجود بالكاش -> من الـ DB
    const subcategories = await Subcategory.find().select("-__v");

    // 3️⃣ خزّن في Redis لمدة 10 دقائق
    await redis.set(cacheKey, JSON.stringify(subcategories), "EX", 600);

    res.status(200).json(subcategories);
  })
);

/**
 * ✅ Add a new subcategory
 */
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "Name is required" });
    }

    // check for duplicate
    const existing = await Subcategory.findOne({ name });
    if (existing) {
      return res.status(400).json({ message: "Subcategory already exists" });
    }

    const newSubcategory = new Subcategory({ name });
    await newSubcategory.save();

    // 🧹 احذف الكاش عشان يتحدث في الواجهة
    await redis.del("subcategories:all");

    res.status(201).json({
      message: "Subcategory created successfully",
      subcategory: newSubcategory,
    });
  })
);

/**
 * ✅ Update subcategory by ID
 */
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    const subcategory = await Subcategory.findById(id);
    if (!subcategory) {
      return res.status(404).json({ message: "Subcategory not found" });
    }

    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "Name is required" });
    }

    subcategory.name = name;
    await subcategory.save();

    // 🧹 امسح الكاش لتحديث البيانات
    await redis.del("subcategories:all");

    res.status(200).json({
      message: "Subcategory updated successfully",
      subcategory,
    });
  })
);

/**
 * ✅ Delete subcategory by ID
 */
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const subcategory = await Subcategory.findById(id);
    if (!subcategory) {
      return res.status(404).json({ message: "Subcategory not found" });
    }

    await subcategory.deleteOne();

    // 🧹 Clear Redis cache
    await redis.del("subcategories:all");

    res.status(200).json({ message: "Subcategory deleted successfully", id });
  })
);

module.exports = router;
