const Subcategory = require("../models/subcategoryModel");
const express = require("express");
const asyncHandler = require("express-async-handler");
const redis = require("../config/redis");
const router = express.Router();
// ✅ Get Subcategories with Redis cache
router.get(
  "/",
  asyncHandler(async (req, res) => {
    // const subcategories = await Subcategory.aggregate([
    //   {
    //     $project: {
    //       name: 1,
    //     },
    //   },
    // ]);
    const subcategories = await Subcategory.find().select("-__v");
    res.json(subcategories);
  })
);
// router.get(
//   "/",
//   asyncHandler(async (req, res) => {
//     const cacheKey = "subcategories:all";

//     const cached = await redis.get(cacheKey);
//     if (cached) {
//       console.log("🚀 From Redis (Subcategories)");
//       return res.json(JSON.parse(cached));
//     }

//     const subcategories = await Subcategory.find();

//     await redis.set(cacheKey, JSON.stringify(subcategories), "EX", 600);

//     res.json(subcategories);
//   })
// );
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
