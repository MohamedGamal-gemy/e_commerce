const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariant",
    },
    size: { type: String },
    color: { type: String },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
    productSnapshot: {
      title: String,
      image: String,
      color: String,
    },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sessionId: { type: String },
    items: [orderItemSchema],

    shippingAddress: {
      fullName: { type: String },
      addressLine1: { type: String },
      addressLine2: { type: String },
      city: { type: String },
      country: { type: String },
      phone: { type: String },
      postalCode: { type: String },
    },

    billingDetails: {
      fullName: String,
      email: String,
      phone: String,
      address: String,
    },

    payment: {
      method: {
        type: String,
        enum: ["cash", "card", "paypal", "wallet"],
        default: "cash",
      },
      status: {
        type: String,
        enum: ["pending", "paid", "failed", "refunded"],
        default: "pending",
      },
      transactionId: { type: String },
    },

    currency: { type: String, default: "EGP" },
    subtotal: { type: Number, default: 0 },
    totalPrice: { type: Number, required: true },
    shippingPrice: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    stripeSessionId: { type: String },

    status: {
      type: String,
      // enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      // default: "pending",
    },

    notes: { type: String, trim: true },
    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },
    deliveredAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = OrderSchema;
