// // const mongoose = require("mongoose");

// // const orderItemSchema = new mongoose.Schema(
// //   {
// //     product: {
// //       type: mongoose.Schema.Types.ObjectId,
// //       ref: "Product",
// //       required: true,
// //     },
// //     variant: {
// //       type: mongoose.Schema.Types.ObjectId,
// //       ref: "ProductVariant",
// //     },
// //     size: { type: String },
// //     color: { type: String },
// //     quantity: { type: Number, required: true, min: 1 },
// //     price: { type: Number, required: true },
// //     productSnapshot: {
// //       title: String,
// //       image: String,
// //       color: String,
// //     },
// //   },
// //   { _id: false }
// // );

// // const OrderSchema = new mongoose.Schema(
// //   {
// //     user: {
// //       type: mongoose.Schema.Types.ObjectId,
// //       ref: "User",
// //       required: true,
// //     },
// //     sessionId: { type: String },
// //     items: [orderItemSchema],

// //     shippingAddress: {
// //       fullName: { type: String },
// //       addressLine1: { type: String },
// //       addressLine2: { type: String },
// //       city: { type: String },
// //       country: { type: String },
// //       phone: { type: String },
// //       postalCode: { type: String },
// //     },

// //     billingDetails: {
// //       fullName: String,
// //       email: String,
// //       phone: String,
// //       address: String,
// //     },

// //     payment: {
// //       method: {
// //         type: String,
// //         enum: ["cash", "card", "paypal", "wallet"],
// //         default: "cash",
// //       },
// //       status: {
// //         type: String,
// //         enum: ["pending", "paid", "failed", "refunded"],
// //         default: "pending",
// //       },
// //       transactionId: { type: String },
// //     },

// //     currency: { type: String, default: "EGP" },
// //     subtotal: { type: Number, default: 0 },
// //     totalPrice: { type: Number, required: true },
// //     shippingPrice: { type: Number, default: 0 },
// //     discount: { type: Number, default: 0 },
// //     stripeSessionId: { type: String },

// //     status: {
// //       type: String,
// //       // enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
// //       // default: "pending",
// //     },

// //     notes: { type: String, trim: true },
// //     isPaid: { type: Boolean, default: false },
// //     paidAt: { type: Date },
// //     deliveredAt: { type: Date },
// //   },
// //   { timestamps: true }
// // );

// // module.exports = OrderSchema;

// const mongoose = require("mongoose");
// const crypto = require("crypto");

// // ==========================================
// // 1. Order Item Schema (The Snapshot Logic)
// // ==========================================
// const orderItemSchema = new mongoose.Schema(
//   {
//     product: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Product",
//       required: true,
//     },
//     variant: { type: mongoose.Schema.Types.ObjectId, ref: "ProductVariant" },
//     size: { type: String, required: true },
//     // تخزين اللون كـ Object لسهولة العرض في الـ Dashboard
//     color: {
//       name: String,
//       value: String,
//     },
//     quantity: { type: Number, required: true, min: 1 },
//     price: { type: Number, required: true }, // السعر وقت الشراء
//     // الـ Snapshot يحمي بياناتك لو المنتج اتمسح أو سعره اتغير
//     productSnapshot: {
//       title: String,
//       mainImage: String,
//       colorName: String,
//       colorValue: String,
//     },
//   },
//   { _id: false }
// );

// // ==========================================
// // 2. Main Order Schema
// // ==========================================
// const OrderSchema = new mongoose.Schema(
//   {
//     orderNumber: { type: String, unique: true }, // ORD-XXXXXX
//     user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//     items: [orderItemSchema],

//     // تفاصيل الشحن مقسمة بدقة لربطها بشركات الشحن مستقبلاً
//     shippingAddress: {
//       fullName: String,
//       phone: String,
//       city: String,
//       address: String,
//       building: String,
//       floor: String,
//       apartment: String,
//     },

//     billingDetails: {
//       fullName: String,
//       email: String,
//       phone: String,
//     },

//     payment: {
//       method: {
//         type: String,
//         enum: ["cash", "card", "wallet"],
//         default: "cash",
//       },
//       status: {
//         type: String,
//         enum: ["pending", "paid", "failed", "refunded"],
//         default: "pending",
//       },
//       transactionId: String,
//     },

//     status: {
//       type: String,
//       enum: [
//         "pending",
//         "processing",
//         "shipped",
//         "delivered",
//         "cancelled",
//         "returned",
//       ],
//       default: "pending",
//     },

//     // تفاصيل مالية
//     currency: { type: String, default: "EGP" },
//     subtotal: { type: Number, default: 0 },
//     shippingPrice: { type: Number, default: 0 },
//     discount: { type: Number, default: 0 },
//     totalPrice: { type: Number, required: true },

//     // تتبع الوقت (Timeline)
//     isPaid: { type: Boolean, default: false },
//     paidAt: { type: Date },
//     deliveredAt: { type: Date },
//     notes: { type: String, trim: true },
//   },
//   { timestamps: true }
// );

// // ==========================================
// // 3. Middlewares & Hooks (Logic Automation)
// // ==========================================

// // توليد رقم الطلب وحساب الإجمالي قبل الحفظ
// OrderSchema.pre("save", async function (next) {
//   // 1. توليد رقم طلب فريد ORD-7A2B
//   if (!this.orderNumber) {
//     this.orderNumber = `ORD-${crypto
//       .randomBytes(3)
//       .toString("hex")
//       .toUpperCase()}`;
//   }

//   // 2. حساب المبالغ تلقائياً
//   if (this.isModified("items") || this.isNew) {
//     const calculatedSubtotal = this.items.reduce(
//       (sum, item) => sum + item.price * item.quantity,
//       0
//     );
//     this.subtotal = calculatedSubtotal;
//     this.totalPrice =
//       calculatedSubtotal + (this.shippingPrice || 0) - (this.discount || 0);
//   }
//   next();
// });

// // ==========================================
// // 4. Static Methods (Analytics for Dashboard)
// // ==========================================

// // إحصائيات لوحة التحكم
// OrderSchema.statics.getDashboardStats = async function () {
//   return await this.aggregate([
//     {
//       $group: {
//         _id: "$status",
//         count: { $sum: 1 },
//         revenue: { $sum: "$totalPrice" },
//       },
//     },
//     { $sort: { revenue: -1 } },
//   ]);
// };

// // سجل مبيعات آخر 7 أيام
// OrderSchema.statics.getWeeklySales = async function () {
//   const sevenDaysAgo = new Date();
//   sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

//   return await this.aggregate([
//     {
//       $match: {
//         createdAt: { $gte: sevenDaysAgo },
//         status: { $ne: "cancelled" },
//       },
//     },
//     {
//       $group: {
//         _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
//         dailyRevenue: { $sum: "$totalPrice" },
//         ordersCount: { $sum: 1 },
//       },
//     },
//     { $sort: { _id: 1 } },
//   ]);
// };

// // ==========================================
// // 5. Indexes (Performance)
// // ==========================================
// OrderSchema.index({ orderNumber: 1 });
// OrderSchema.index({ user: 1 });
// OrderSchema.index({ status: 1 });
// OrderSchema.index({ createdAt: -1 });

// const Order = mongoose.model("Order", OrderSchema);
// module.exports = Order;

const mongoose = require("mongoose");
const crypto = require("crypto");

// ==========================================
// 1. Schema Definition
// ==========================================
const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variant: { type: mongoose.Schema.Types.ObjectId, ref: "ProductVariant" },
    size: { type: String, required: true },
    color: {
      name: String,
      value: String,
    },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
    productSnapshot: {
      title: String,
      image: String,
      colorName: String,
      colorValue: String,
    },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [orderItemSchema],
    billingDetails: {
      fullName: String,
      email: String,
      phone: String,
      address: String,
    },
    shippingAddress: {
      city: String,
      address: String,
    },
    payment: {
      method: {
        type: String,
        enum: ["cash", "card", "wallet"],
        default: "cash",
      },
      status: {
        type: String,
        enum: ["pending", "paid", "failed", "refunded"],
        default: "pending",
      },
    },
    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "paid",
        "shipped",
        "delivered",
        "cancelled",
      ],
      default: "pending",
    },
    subtotal: { type: Number, default: 0 },
    shippingPrice: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    // 💡 الحل: قمنا بإزالة required: true لأن الـ Hook سيقوم بحسابه
    totalPrice: { type: Number, default: 0 },
    stripeSessionId: String,
  },
  { timestamps: true }
);

// ==========================================
// 2. The Correct Hook Logic
// ==========================================
OrderSchema.pre("save", function (next) {
  // 1. توليد رقم الطلب إذا لم يوجد
  if (!this.orderNumber) {
    this.orderNumber = `ORD-${crypto
      .randomBytes(3)
      .toString("hex")
      .toUpperCase()}`;
  }

  // 2. حساب الإجمالي (نحسبه دائماً قبل الحفظ لضمان الدقة)
  const calculatedSubtotal = this.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  this.subtotal = calculatedSubtotal;
  this.totalPrice =
    calculatedSubtotal + (this.shippingPrice || 0) - (this.discount || 0);

  next();
});

// ==========================================
// 3. Admin Dashboard Analytics (Statics)
// ==========================================
OrderSchema.statics.getDashboardStats = async function () {
  return await this.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        revenue: { $sum: "$totalPrice" },
      },
    },
  ]);
};

// ==========================================
// 4. Optimization & Export
// ==========================================
OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ "billingDetails.phone": 1 });

const Order = mongoose.model("Order", OrderSchema);
module.exports = Order;
