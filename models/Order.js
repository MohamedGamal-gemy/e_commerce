const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  variantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ProductVariant",
    required: true,
  },
  size: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
});

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    sessionId: { type: String, default: null },
    items: [orderItemSchema],
    subtotal: { type: Number, required: true },
    shipping: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    // billingDetails: {
    //   fullName: String,
    //   email: String,
    //   phone: Number,
    //   address: String,
    //   city: String,
    //   postalCode: String,
    //   country: String,
    // },
    billingDetails: {
      fullName: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },

    // status: {
    //   type: String,
    //   enum: ["pending", "paid", "failed"],
    //   default: "pending",
    // },
    status: {
      type: String,
      enum: [
        "pending",
        "paid",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "failed",
      ],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded", "failed"],
      default: "unpaid",
    },

    paymentMethod: {
      type: String,
      enum: ["card", "cash_on_delivery", "stripe"],
      default: "stripe",
    },

    // stripeSessionId: { type: String, default: null },
    stripeSessionId: { type: String, unique: false, sparse: true },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
