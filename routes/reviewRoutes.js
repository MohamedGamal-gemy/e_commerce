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
    const user = req.user._id; // من Middleware auth
    const { product, rating, comment } = req.body;

    // ✅ تحقق من الحقول
    if (!product || !rating || !comment) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // ✅ منع تكرار الريفيو لنفس المنتج من نفس المستخدم
    const existingReview = await Review.findOne({ product, user });
    if (existingReview) {
      return res.status(400).json({
        message: "You have already reviewed this product.",
      });
    }

    // ✅ إنشاء الريفيو
    const review = new Review({
      product,
      user,
      rating: Number(rating),
      comment,
    });

    await review.save();

    // ✅ تحديث تقييم المنتج وعدد المراجعات
    const reviews = await Review.find({ product });
    const numReviews = reviews.length;
    const averageRating =
      reviews.reduce((acc, item) => acc + item.rating, 0) / numReviews;

    await Product.findByIdAndUpdate(product, {
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

    const reviews = await Review.find({ product: productId })
      .populate("user", "username")
      .sort({ createdAt: -1 });

    const numReviews = reviews.length;
    const averageRating =
      numReviews > 0
        ? (reviews.reduce((acc, r) => acc + r.rating, 0) / numReviews).toFixed(
            1
          )
        : 0;

    res.json({
      reviews,
      numReviews,
      averageRating,
    });
  })
);
router.put(
  "/:reviewId",
  protect,
  asyncHandler(async (req, res) => {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // ✅ تأكد إن المستخدم هو صاحب الريفيو
    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    review.rating = rating || review.rating;
    review.comment = comment || review.comment;

    await review.save();

    // ✅ تحديث المنتج بعد التعديل
    const reviews = await Review.find({ product: review.product });
    const numReviews = reviews.length;
    const averageRating =
      reviews.reduce((acc, r) => acc + r.rating, 0) / numReviews;

    await Product.findByIdAndUpdate(review.product, {
      rating: averageRating.toFixed(1),
      numReviews,
    });

    res.json({ message: "Review updated successfully" });
  })
);
// DELETE /api/reviews/:id
router.delete(
  "/:id",
  protect, // لازم يكون المستخدم مسجل دخول
  asyncHandler(async (req, res) => {
    const reviewId = req.params.id;
    const userId = req.user._id;

    // ✅ التأكد من أن الريفيو موجود
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // ✅ التأكد أن المستخدم هو صاحب الريفيو أو أدمن
    if (
      review.user.toString() !== userId.toString() &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this review" });
    }

    const productId = review.product;

    // ✅ حذف الريفيو
    await review.deleteOne();

    // ✅ إعادة حساب المتوسط وعدد الريفيوهات للمنتج
    const reviews = await Review.find({ product: productId });
    const numReviews = reviews.length;
    const averageRating =
      numReviews > 0
        ? reviews.reduce((acc, item) => acc + item.rating, 0) / numReviews
        : 0;

    await Product.findByIdAndUpdate(productId, {
      rating: averageRating.toFixed(1),
      numReviews,
    });

    res.status(200).json({
      message: "Review deleted successfully",
    });
  })
);

//

module.exports = router;
