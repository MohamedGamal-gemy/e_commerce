// // const mongoose = require("mongoose");

// // // ==========================
// // // 1. Sub-schema (Cart Item)
// // // ==========================
// // const cartItemSchema = new mongoose.Schema(
// //   {
// //     productId: {
// //       type: mongoose.Schema.Types.ObjectId,
// //       ref: "Product",
// //       required: true,
// //     },
// //     variantId: {
// //       type: mongoose.Schema.Types.ObjectId,
// //       ref: "ProductVariant",
// //       required: true,
// //     },
// //     size: { type: String, required: true },
// //     quantity: {
// //       type: Number,
// //       default: 1,
// //       min: [1, "Quantity must be at least 1"],
// //     },
// //     price: { type: Number, required: true },
// //     isAvailable: { type: Boolean, default: true },
// //   },
// //   { _id: false }
// // );

// // // ==========================
// // // 2. Main Schema (Cart)
// // // ==========================
// // const cartSchema = new mongoose.Schema(
// //   {
// //     userId: {
// //       type: mongoose.Schema.Types.ObjectId,
// //       ref: "User",
// //       default: null,
// //     },
// //     sessionId: { type: String, default: null },
// //     items: [cartItemSchema],
// //     subtotal: { type: Number, default: 0 },
// //     totalItems: { type: Number, default: 0 },
// //     couponCode: { type: String, default: null },
// //     discountAmount: { type: Number, default: 0 },
// //   },
// //   { timestamps: true }
// // );

// // // ==========================
// // // ⚙️ 3. Indexes
// // // ==========================
// // cartSchema.index(
// //   { userId: 1 },
// //   {
// //     unique: true,
// //     partialFilterExpression: { userId: { $type: "objectId" } },
// //   }
// // );

// // cartSchema.index(
// //   { sessionId: 1 },
// //   {
// //     unique: true,
// //     partialFilterExpression: { sessionId: { $type: "string" } },
// //   }
// // );

// // // ==========================
// // // 🧮 4. Middleware لحساب totals
// // // ==========================
// // cartSchema.pre("save", function (next) {
// //   if (!this.items || this.items.length === 0) {
// //     this.subtotal = 0;
// //     this.totalItems = 0;
// //   } else {
// //     this.subtotal = this.items.reduce(
// //       (sum, item) => sum + item.price * item.quantity,
// //       0
// //     );
// //     this.totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
// //   }
// //   next();
// // });

// // // ==========================
// // // 5. Export Model
// // // ==========================
// // const Cart = mongoose.model("Cart", cartSchema);
// // module.exports = Cart;

// const mongoose = require("mongoose");

// // ==========================
// // 1️⃣ Sub-schema: Cart Item
// // ==========================
// const cartItemSchema = new mongoose.Schema(
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
//     size: { type: String, required: true },
//     quantity: {
//       type: Number,
//       default: 1,
//       min: [1, "Quantity must be at least 1"],
//     },
//     price: { type: Number, required: true },
//     isAvailable: { type: Boolean, default: true },

//     // 🔹 Snapshot للبيانات وقت الإضافة
//     productSnapshot: {
//       title: { type: String, required: true },
//       mainImage: { url: String, publicId: String },
//       color: { name: String, value: String },
//       size: String,
//       price: Number,
//     },
//   },
//   { _id: false }
// );

// // ==========================
// // 2️⃣ Main Schema: Cart
// // ==========================
// const cartSchema = new mongoose.Schema(
//   {
//     userId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       default: null,
//     },
//     sessionId: { type: String, default: null },
//     items: [cartItemSchema],

//     subtotal: { type: Number, default: 0 },
//     totalItems: { type: Number, default: 0 },
//     total: { type: Number, default: 0 },

//     // 🔹 خصومات متعددة
//     coupons: [
//       {
//         code: String,
//         type: { type: String, enum: ["flat", "percentage"] },
//         amount: Number,
//         appliedAt: { type: Date, default: Date.now },
//       },
//     ],
//     discountAmount: { type: Number, default: 0 },

//     // 🔹 تواريخ مفيدة للتحليلات
//     lastModified: { type: Date, default: Date.now },
//     lastItemAddedAt: { type: Date },
//   },
//   { timestamps: true }
// );

// // ==========================
// // 3️⃣ Indexes
// // ==========================
// cartSchema.index({ userId: 1 });
// cartSchema.index({ sessionId: 1 });

// // ==========================
// // 4️⃣ Middleware لحساب totals
// // ==========================
// cartSchema.pre("save", function (next) {
//   const now = new Date();
//   this.lastModified = now;

//   if (!this.items || this.items.length === 0) {
//     this.subtotal = 0;
//     this.totalItems = 0;
//     this.total = 0;
//   } else {
//     this.subtotal = this.items.reduce(
//       (sum, item) => sum + item.price * item.quantity,
//       0
//     );
//     this.totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);

//     // خصومات كوبونات
//     const couponDiscount = (this.coupons || []).reduce((sum, c) => {
//       if (c.type === "percentage")
//         return sum + (c.amount / 100) * this.subtotal;
//       return sum + (c.amount || 0);
//     }, 0);

//     this.total = this.subtotal - (couponDiscount + (this.discountAmount || 0));
//   }

//   if (this.items.length > 0) this.lastItemAddedAt = now;

//   next();
// });

// // ==========================
// // 5️⃣ Static Methods (اختياري)
// // ==========================
// cartSchema.statics.clearCart = async function (userIdOrSessionId) {
//   return this.deleteOne({
//     $or: [{ userId: userIdOrSessionId }, { sessionId: userIdOrSessionId }],
//   });
// };

// // ==========================
// // 6️⃣ Export Model
// // ==========================
// const Cart = mongoose.model("Cart", cartSchema);
// module.exports = Cart;
