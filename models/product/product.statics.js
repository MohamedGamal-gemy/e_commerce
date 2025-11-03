const mongoose = require("mongoose");

module.exports = (schema) => {
  // --- Recalculate Product Aggregates ---
  schema.statics.recalcAggregates = async function (productId) {
    const ProductVariant = mongoose.model("ProductVariant");

    const stats = await ProductVariant.aggregate([
      { $match: { productId: new mongoose.Types.ObjectId(productId) } },
      { $unwind: "$sizes" },
      {
        $group: {
          _id: null,
          totalStock: { $sum: "$sizes.stock" },
          colorNames: { $addToSet: "$color.name" },
          numVariants: { $addToSet: "$_id" },
        },
      },
    ]);

    if (!stats[0]) return;

    const { totalStock, colorNames, numVariants } = stats[0];
    await this.findByIdAndUpdate(productId, {
      totalStock,
      numVariants: numVariants.length,
      isAvailable: totalStock > 0,
      colorNames: colorNames.map((c) => c.toLowerCase()),
    });
  };

  // --- Update Product Rating ---
  schema.statics.updateProductRating = async function (productId) {
    const Review = mongoose.model("Review");
    const stats = await Review.aggregate([
      { $match: { product: new mongoose.Types.ObjectId(productId) } },
      { $group: { _id: null, avgRating: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);

    const avg = stats[0]?.avgRating ?? 0;
    const count = stats[0]?.count ?? 0;

    await this.findByIdAndUpdate(productId, {
      rating: Number(avg.toFixed(1)),
      numReviews: count,
    });
  };
};
