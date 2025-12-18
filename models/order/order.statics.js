module.exports = (schema) => {
  schema.statics.getStats = async function () {
    return await this.aggregate([
      {
        $group: {
          _id: "$status",
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$totalPrice" },
          averageOrderValue: { $avg: "$totalPrice" }, // إحصائية إضافية مفيدة
        },
      },
    ]);
  };

  schema.statics.getUserOrders = async function (userId) {
    return await this.find({ user: userId })
      .select("-stripeSessionId -__v") // تقليل حجم الداتا الراجعة
      .sort({ createdAt: -1 });
  };
};
