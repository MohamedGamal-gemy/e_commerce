module.exports = (schema) => {
  // ✅ بعد الحفظ أو الحذف، نحدّث متوسط التقييم في المنتج
  async function updateProductRating(doc, next) {
    try {
      const Review = doc.constructor;
      const Product = require("../product"); // استدعاء ديناميكي لتجنب circular import

      const stats = await Review.aggregate([
        { $match: { product: doc.product } },
        {
          $group: {
            _id: "$product",
            avgRating: { $avg: "$rating" },
            numReviews: { $sum: 1 },
          },
        },
      ]);

      if (stats.length > 0) {
        await Product.findByIdAndUpdate(doc.product, {
          averageRating: stats[0].avgRating.toFixed(1),
          numReviews: stats[0].numReviews,
        });
      } else {
        await Product.findByIdAndUpdate(doc.product, {
          averageRating: 0,
          numReviews: 0,
        });
      }
    } catch (err) {
      console.error("Error updating product rating:", err);
    }

    if (next) next();
  }

  schema.post("save", updateProductRating);
  schema.post("remove", updateProductRating);
};
