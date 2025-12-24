// const mongoose = require("mongoose");

// const cartItemSchema = new mongoose.Schema(
//   {
//     product: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Product",
//       required: true,
//     },
//     variant: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "ProductVariant",
//       required: true,
//     },
//     size: { type: String, required: true },
//     color: { type: String, required: true },
//     quantity: { type: Number, required: true, min: 1 },
//     price: { type: Number, required: true }, // price at the time of adding
//   },
//   { _id: false }
// );

// const CartSchema = new mongoose.Schema(
//   {
//     user: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//       index: true,
//     },
//     items: [cartItemSchema],
//     totalItems: { type: Number, default: 0 },
//     totalPrice: { type: Number, default: 0 },
//     currency: { type: String, default: "EGP" },
//     isActive: { type: Boolean, default: true },
//   },
//   { timestamps: true }
// );

// module.exports = CartSchema;


