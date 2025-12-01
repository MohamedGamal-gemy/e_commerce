const asyncHandler = require("express-async-handler");
const Review = require("../models/review/review.schema");
const Product = require("../models/product");
const { validateReview } = require("../validations/reviewValidation");

exports.createReview = asyncHandler(async (req, res) => {
  const { product, rating, comment, title } = req.body;

  // ✅ Validation
  const { error } = validateReview(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  // ✅ Check if already reviewed
  const exists = await Review.findOne({ product, user: req.user._id });
  if (exists)
    return res
      .status(400)
      .json({ message: "You already reviewed this product." });

  // ✅ Create review
  const review = await Review.create({
    product,
    user: req.user._id,
    rating,
    comment,
    title,
  });
  await review.populate("user", "username avatar");

  // ✅ Update product rating async, handle errors internally
  review.updateProductRating().catch(console.error);

  res.status(201).json({ message: "Review added", review });
});

exports.getProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const [reviews, product] = await Promise.all([
    Review.find({ product: productId })
      .populate("user", "username avatar")
      .sort({ createdAt: -1 }),
    Product.findById(productId).select("averageRating numReviews"),
  ]);

  res.json({
    reviews,
    numReviews: product?.numReviews || 0,
    averageRating: product?.averageRating || 0,
  });
});

exports.updateReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const updates = (({ rating, title, comment }) => ({
    rating,
    title,
    comment,
  }))(req.body);

  const review = await Review.findOneAndUpdate(
    { _id: reviewId, user: req.user._id },
    updates,
    { new: true }
  ).populate("user", "username avatar");

  if (!review)
    return res
      .status(404)
      .json({ message: "Review not found or unauthorized" });

  review.updateProductRating().catch(console.error);
  res.json({ message: "Review updated", review });
});

exports.deleteReview = asyncHandler(async (req, res) => {
  const reviewId = req.params.id;
  const userId = req.user._id;

  // 🔹 حذف الريفيو مع شرط المالك أو الأدمن
  const deletedReview = await Review.findOneAndDelete({
    _id: reviewId,
    $or: [{ user: userId }, { role: "admin" }],
  }).populate("user", "username avatar");

  if (!deletedReview) {
    return res
      .status(404)
      .json({ message: "Review not found or not authorized" });
  }

  // 🔹 تحديث تقييم المنتج بشكل async داخل الـ schema method
  deletedReview
    .updateProductRating()
    .catch((err) => console.error("Failed to update product rating:", err));

  // 🔹 إعادة بيانات الريفيو المحذوف
  res.status(200).json({
    message: "Review deleted successfully",
    review: deletedReview,
  });
});
