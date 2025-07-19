// const mongoose = require("mongoose");

// const reviewSchema = new mongoose.Schema(
//   {
//     product: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Product",
//       required: true,
//     },
//     user: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },
//     rating: {
//       type: Number,
//       required: true,
//       min: [1, "Rating must be at least 1"],
//       max: [5, "Rating must be at most 5"],
//     },
//     comment: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//   },
//   { timestamps: true }
// );

// const Review = mongoose.model("Review", reviewSchema);
// module.exports = Review;

const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating must be at most 5"],
    },
    comment: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

// ✅ منع تكرار الريفيو لنفس المنتج من نفس المستخدم
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

// ✅ لتحسين البحث
reviewSchema.index({ product: 1 });

// ✅ إزالة __v من الريسبونس
reviewSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

const Review = mongoose.model("Review", reviewSchema);
module.exports = Review;
