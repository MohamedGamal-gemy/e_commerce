const express = require("express");
const { protect } = require("../middlewares/protect");
const {
  createReview,
  getProductReviews,
  updateReview,
  deleteReview,
} = require("../controllers/review.controller");
const { protectOptional } = require("../middleware/auth.middleware");

const router = express.Router();

// Create review
router.post("/", protect, createReview);

// Get reviews for a product
router.get("/:productId", getProductReviews);

// Update review

// router.put("/:reviewId", protect, updateReview);
router.put("/:reviewId", protect, updateReview);

// Delete review
router.delete("/:id", protect, deleteReview);

module.exports = router;
