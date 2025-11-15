// const mongoose = require("mongoose");

// const ReviewSchema = new mongoose.Schema(
//   {
//     product: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Product",
//       required: true,
//       index: true,
//     },
//     user: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//       index: true,
//     },
//     rating: {
//       type: Number,
//       required: true,
//       min: 1,
//       max: 5,
//     },
//     title: {
//       type: String,
//       trim: true,
//       maxlength: 100,
//     },
//     comment: {
//       type: String,
//       trim: true,
//       maxlength: 1000,
//     },
//     images: [
//       {
//         url: String,
//         publicId: String,
//         alt: String,
//       },
//     ],
//     isVerifiedPurchase: {
//       type: Boolean,
//       default: false,
//     },
//   },
//   { timestamps: true }
// );

// module.exports = ReviewSchema;


const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    images: [
      {
        url: String,
        publicId: String,
        alt: String,
      },
    ],
    isVerifiedPurchase: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

/** ------------------------------
 * 🔹 STATIC: حساب متوسط التقييمات
--------------------------------*/
ReviewSchema.statics.getProductStats = async function (productId) {
  const stats = await this.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId) } },
    {
      $group: {
        _id: "$product",
        avgRating: { $avg: "$rating" },
        numReviews: { $sum: 1 },
      },
    },
  ]);

  return stats.length > 0
    ? stats[0]
    : { avgRating: 0, numReviews: 0 };
};

/** ------------------------------
 * 🔹 POST SAVE/DELETE: تحديث المنتج تلقائياً
--------------------------------*/
async function updateProductRating(doc) {
  const Review = doc.constructor;
  const Product = require("../product");

  const stats = await Review.getProductStats(doc.product);

  await Product.findByIdAndUpdate(doc.product, {
    averageRating: stats.avgRating.toFixed(1),
    numReviews: stats.numReviews,
  });
}

ReviewSchema.post("save", updateProductRating);
ReviewSchema.post("findOneAndDelete", updateProductRating);

module.exports = ReviewSchema;
