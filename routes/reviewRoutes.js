// routes/reviews.js
const express = require("express");
const router = express.Router();
const asyncHandler = require("express-async-handler");
const Review = require("../models/reviewModel");
const { Product } = require("../models/productModel");
const { protect } = require("../middlewares/protect");

// @desc   Add a new review
// @route  POST /api/reviews
// @access Public (يفضل لاحقًا تحط middleware للحماية)
router.post(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const userId = req.user._id; // من Middleware auth
    const { productId, rating, comment } = req.body;

    // ✅ تحقق من الحقول
    if (!productId || !rating || !comment) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // ✅ منع تكرار الريفيو لنفس المنتج من نفس المستخدم
    const existingReview = await Review.findOne({ productId, userId });
    if (existingReview) {
      return res.status(400).json({
        message: "You have already reviewed this product.",
      });
    }

    // ✅ إنشاء الريفيو
    const review = new Review({
      productId,
      userId,
      rating: Number(rating),
      comment,
    });

    await review.save();

    // ✅ تحديث تقييم المنتج وعدد المراجعات
    const reviews = await Review.find({ productId });
    const numReviews = reviews.length;
    const averageRating =
      reviews.reduce((acc, item) => acc + item.rating, 0) / numReviews;

    await Product.findByIdAndUpdate(productId, {
      rating: averageRating.toFixed(1),
      numReviews,
    });

    res.status(201).json({ message: "Review added successfully." });
  })
);

router.get(
  "/:productId",
  asyncHandler(async (req, res) => {
    const { productId } = req.params;

    const reviews = await Review.find({ productId })
      .populate("userId", "username")
      .sort({ createdAt: -1 });

    res.json(reviews);
  })
);

//

module.exports = router;
