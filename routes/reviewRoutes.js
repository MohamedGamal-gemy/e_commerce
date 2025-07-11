// routes/reviews.js
const express = require("express");
const router = express.Router();
const asyncHandler = require("express-async-handler");
const Review = require("../models/reviewModel");
const { Product } = require("../models/productModel");

// @desc   Add a new review
// @route  POST /api/reviews
// @access Public (يفضل لاحقًا تحط middleware للحماية)
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { product, user, name, rating, comment } = req.body;

    if (!product || !user || !rating || !comment) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // optional: prevent duplicate review from same user
    const existingReview = await Review.findOne({ product, user });
    if (existingReview) {
      return res
        .status(400)
        .json({ message: "You have already reviewed this product." });
    }

    const review = new Review({
      product,
      user,
      //   name,
      rating: Number(rating),
      comment,
    });

    await review.save();

    // update product rating and numReviews
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

    const reviews = await Review.find({ product: productId }).populate(
      "user",
      "username"
    );

    res.status(200).json(reviews);
  })
);
//
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const reviews = await Review.find({})
      .populate("user", "username")
      .populate("product", "title");

    res.status(200).json(reviews);
  })
);

module.exports = router;
