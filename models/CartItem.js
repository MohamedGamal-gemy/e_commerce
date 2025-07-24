const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  variantId: [{ type: mongoose.Schema.Types.ObjectId, ref: "ProductVariant" }],
  size: {
    type: String,
    required: true,
  },
  stock: {
    type: Number,
    default: 1,
    min: [1, "stock must be at least 1"],
  },
});

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [cartItemSchema],
  },
  { timestamps: true }
);
const Cart = mongoose.model("Cart", cartSchema);

module.exports = Cart;
