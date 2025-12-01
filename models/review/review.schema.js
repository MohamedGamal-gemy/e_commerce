const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema(
  {
    url: String,
    publicId: String,
    alt: String,
  },
  { _id: false }
);

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
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true, maxlength: 100 },
    comment: { type: String, trim: true, maxlength: 1000 },
    images: [imageSchema],
    isVerifiedPurchase: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ✅ Index to prevent duplicate reviews by same user
ReviewSchema.index({ product: 1, user: 1 }, { unique: true });
ReviewSchema.index({ rating: -1 });

// ✅ Static: حساب متوسط التقييمات وعدد الريفيوز
ReviewSchema.statics.getProductStats = async function (productId) {
  const stats = await this.aggregate([
    { $match: { product: mongoose.Types.ObjectId(productId) } },
    {
      $group: {
        _id: "$product",
        avgRating: { $avg: "$rating" },
        numReviews: { $sum: 1 },
      },
    },
  ]);
  return stats[0] || { avgRating: 0, numReviews: 0 };
};

ReviewSchema.methods.updateProductRating = async function () {
  const Product = require("./product"); // استدعاء ديناميكي لتجنب circular dependency
  const stats = await this.constructor.getProductStats(this.product);

  await Product.findByIdAndUpdate(this.product, {
    rating: stats.avgRating.toFixed(1), // ✅ نفس اسم الحقل في Product
    numReviews: stats.numReviews,
  });
};

// ✅ Hooks
ReviewSchema.post("save", function () {
  this.updateProductRating().catch(console.error);
});
ReviewSchema.post("findOneAndDelete", function (doc) {
  doc?.updateProductRating().catch(console.error);
});

module.exports = mongoose.model("Review", ReviewSchema);
