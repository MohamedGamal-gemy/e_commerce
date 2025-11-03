module.exports = (schema) => {
  // 🔍 إحصائيات الطلبات
  schema.statics.getStats = async function () {
    return await this.aggregate([
      {
        $group: {
          _id: "$status",
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$totalPrice" },
        },
      },
    ]);
  };

  // 🔍 جلب كل الطلبات الخاصة بمستخدم
  schema.statics.getUserOrders = async function (userId) {
    return await this.find({ user: userId })
      .populate("items.product")
      .populate("items.variant")
      .sort({ createdAt: -1 });
  };
};
