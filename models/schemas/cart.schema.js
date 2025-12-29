// // models/schemas/cart.schema.js
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
//     price: { type: Number, required: true },
//   },
//   { _id: false }
// );

// const baseOptions = { timestamps: true };

// const BaseCartSchema = new mongoose.Schema(
//   {
//     items: [cartItemSchema],
//     totalItems: { type: Number, default: 0 },
//     totalPrice: { type: Number, default: 0 },
//     currency: { type: String, default: "EGP" },
//     isActive: { type: Boolean, default: true },
//   },
//   baseOptions
// );
// //
// BaseCartSchema.pre("save", function (next) {
//   if (!this.items || this.items.length === 0) {
//     this.totalItems = 0;
//     this.totalPrice = 0;
//   } else {
//     this.totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
//     this.totalPrice = this.items.reduce(
//       (sum, item) => sum + item.price * item.quantity,
//       0
//     );
//   }
//   next();
// });
// //
// BaseCartSchema.statics.addItemToCart = async function (query, newItem) {
//   let cart = await this.findOne({ ...query, isActive: true });

//   if (!cart) {
//     cart = new this({ ...query, items: [newItem] });
//   } else {
//     const index = cart.items.findIndex(
//       (i) =>
//         i.variant.toString() === newItem.variant.toString() &&
//         i.size === newItem.size
//     );

//     if (index > -1) {
//       cart.items[index].quantity += newItem.quantity;
//     } else {
//       cart.items.push(newItem);
//     }
//   }

//   return await cart.save();
// };

// module.exports = BaseCartSchema;

// models/schemas/cart.schema.js
const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariant",
      required: true,
    },
    size: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    color: {
      type: String,
      lowercase: true,
      trim: true,
    },
    quantity: { type: Number, min: 1, required: true },
    price: { type: Number, required: true },
  },
  { _id: false }
);

const BaseCartSchema = new mongoose.Schema(
  {
    items: [cartItemSchema],
    totalItems: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 },
    currency: {
      type: String,
      enum: ["EGP", "USD"],
      default: "EGP",
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = BaseCartSchema;
