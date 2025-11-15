const asyncHandler = require("express-async-handler");
const Review = require("../models/review");
const Product = require("../models/product");
const { validateReview } = require("../validations/reviewValidation");

// POST /api/reviews
exports.createReview = asyncHandler(async (req, res) => {
  const { error } = validateReview(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const user = req.user._id;
  const { product, rating, comment, title } = req.body;

  const existing = await Review.findOne({ product, user });
  if (existing) {
    return res.status(400).json({
      message: "You have already reviewed this product.",
    });
  }

  const review = await Review.create({
    product,
    user,
    rating,
    comment,
    title,
  });


  res.status(201).json({
    message: "Review added successfully.",
    review,
  });
});

// GET /api/reviews/:productId
exports.getProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const reviews = await Review.find({ product: productId })
    .populate("user", "name avatar")
    .sort({ createdAt: -1 });

  const numReviews = reviews.length;
  const averageRating =
    numReviews > 0
      ? Number((reviews.reduce((acc, r) => acc + r.rating, 0) / numReviews).toFixed(1))
      : 0;

  res.json({ reviews, numReviews, averageRating });
});

// PUT /api/reviews/:reviewId
exports.updateReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const { rating, comment, title } = req.body;

  const review = await Review.findById(reviewId);
  if (!review) {
    return res.status(404).json({ message: "Review not found" });
  }

  if (review.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Not authorized" });
  }

  if (rating !== undefined) review.rating = Number(rating);
  if (comment !== undefined) review.comment = comment;
  if (title !== undefined) review.title = title;

  await review.save();

  await Product.updateProductRating(review.product);

  res.json({ message: "Review updated successfully", review });
});

// DELETE /api/reviews/:id
exports.deleteReview = asyncHandler(async (req, res) => {
  const reviewId = req.params.id;
  const userId = req.user._id;

  const review = await Review.findById(reviewId);
  if (!review) {
    return res.status(404).json({ message: "Review not found" });
  }

  if (
    review.user.toString() !== userId.toString() &&
    req.user.role !== "admin"
  ) {
    return res
      .status(403)
      .json({ message: "Not authorized to delete this review" });
  }

  const productId = review.product;
  await review.deleteOne();

  await Product.updateProductRating(productId);

  res.status(200).json({ message: "Review deleted successfully" });
});
