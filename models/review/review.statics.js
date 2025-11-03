module.exports = (schema) => {
  // ✅ إرجاع متوسط التقييمات لمنتج معين
  schema.statics.getProductStats = async function (productId) {
    const stats = await this.aggregate([
      { $match: { product: productId } },
      {
        $group: {
          _id: "$product",
          avgRating: { $avg: "$rating" },
          numReviews: { $sum: 1 },
        },
      },
    ]);
    return stats.length > 0 ? stats[0] : { avgRating: 0, numReviews: 0 };
  };
};
