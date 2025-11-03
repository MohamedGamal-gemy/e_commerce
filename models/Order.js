// // const mongoose = require("mongoose");

// // const orderItemSchema = new mongoose.Schema({
// //   productId: {
// //     type: mongoose.Schema.Types.ObjectId,
// //     ref: "Product",
// //     required: true,
// //   },
// //   variantId: {
// //     type: mongoose.Schema.Types.ObjectId,
// //     ref: "ProductVariant",
// //     required: true,
// //   },
// //   size: { type: String, required: true },
// //   quantity: { type: Number, required: true },
// //   price: { type: Number, required: true },
// // });

// // const orderSchema = new mongoose.Schema(
// //   {
// //     userId: {
// //       type: mongoose.Schema.Types.ObjectId,
// //       ref: "User",
// //       default: null,
// //     },
// //     sessionId: { type: String, default: null },
// //     items: [orderItemSchema],
// //     subtotal: { type: Number, required: true },
// //     shipping: { type: Number, default: 0 },
// //     discount: { type: Number, default: 0 },
// //     total: { type: Number, required: true },
// //     billingDetails: {
// //       fullName: { type: String, required: true },
// //       email: { type: String, required: true },
// //       phone: { type: String, required: true },
// //       address: { type: String, required: true },
// //       city: { type: String, required: true },
// //       postalCode: { type: String, required: true },
// //       country: { type: String, required: true },
// //     },

// //     status: {
// //       type: String,
// //       enum: [
// //         "pending",
// //         "paid",
// //         "processing",
// //         "shipped",
// //         "delivered",
// //         "cancelled",
// //         "failed",
// //       ],
// //       default: "pending",
// //     },
// //     paymentStatus: {
// //       type: String,
// //       enum: ["unpaid", "paid", "refunded", "failed"],
// //       default: "unpaid",
// //     },

// //     paymentMethod: {
// //       type: String,
// //       enum: ["card", "cash_on_delivery", "stripe"],
// //       default: "stripe",
// //     },

// //     // stripeSessionId: { type: String, default: null },
// //     stripeSessionId: { type: String, unique: false, sparse: true },
// //   },
// //   { timestamps: true }
// // );

// // const Order = mongoose.model("Order", orderSchema);
// // module.exports = Order;

// const mongoose = require("mongoose");

// // ==========================
// // 1️⃣ Sub-schema: Order Item
// // ==========================
// const orderItemSchema = new mongoose.Schema(
//   {
//     productId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Product",
//       required: true,
//     },
//     variantId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "ProductVariant",
//       required: true,
//     },
//     quantity: { type: Number, required: true, min: 1 },
//     size: { type: String, required: true },
//     price: { type: Number, required: true },

//     // ✅ نسخة snapshot من بيانات المنتج والفاريانت
//     productSnapshot: {
//       title: { type: String, required: true },
//       mainImage: { url: String, publicId: String },
//       color: { name: String, value: String },
//       size: String,
//       price: Number,
//     },

//     // ✅ حالة كل عنصر بشكل مستقل
//     status: {
//       type: String,
//       enum: ["pending", "shipped", "delivered", "cancelled"],
//       default: "pending",
//     },
//   },
//   { _id: false }
// );

// // ==========================
// // 2️⃣ Main Schema: Order
// // ==========================
// const orderSchema = new mongoose.Schema(
//   {
//     userId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       default: null,
//     },
//     sessionId: { type: String, default: null },

//     items: [orderItemSchema],

//     subtotal: { type: Number, required: true },
//     shipping: { type: Number, default: 0 },
//     discount: { type: Number, default: 0 },
//     total: { type: Number, required: true },

//     // ✅ دعم أكواد خصم متعددة
//     coupons: [
//       {
//         code: String,
//         type: { type: String, enum: ["flat", "percentage"] },
//         amount: Number,
//       },
//     ],

//     billingDetails: {
//       fullName: { type: String, required: true },
//       email: { type: String, required: true },
//       phone: { type: String, required: true },
//       address: { type: String, required: true },
//       city: { type: String, required: true },
//       postalCode: { type: String, required: true },
//       country: { type: String, required: true },
//     },

//     status: {
//       type: String,
//       enum: [
//         "pending",
//         "paid",
//         "processing",
//         "shipped",
//         "delivered",
//         "cancelled",
//         "failed",
//       ],
//       default: "pending",
//     },

//     paymentStatus: {
//       type: String,
//       enum: ["unpaid", "paid", "refunded", "failed"],
//       default: "unpaid",
//     },

//     paymentMethod: {
//       type: String,
//       enum: ["card", "cash_on_delivery", "stripe"],
//       default: "stripe",
//     },

//     stripeSessionId: { type: String, unique: false, sparse: true },

//     // ✅ تواريخ مفيدة للإدارة والتحليلات
//     paidAt: { type: Date },
//     shippedAt: { type: Date },
//     deliveredAt: { type: Date },
//     cancelledAt: { type: Date },
//   },
//   { timestamps: true }
// );

// // ==========================
// // 3️⃣ Middleware: حساب totals تلقائي
// // ==========================
// orderSchema.pre("save", function (next) {
//   if (!this.items || this.items.length === 0) {
//     this.subtotal = 0;
//     this.total = 0;
//   } else {
//     this.subtotal = this.items.reduce(
//       (sum, item) => sum + item.price * item.quantity,
//       0
//     );
//     const totalDiscount = this.discount || 0;
//     this.total = this.subtotal + (this.shipping || 0) - totalDiscount;
//   }
//   next();
// });

// // ==========================
// // 4️⃣ Export
// // ==========================
// const Order = mongoose.model("Order", orderSchema);
// module.exports = Order;
