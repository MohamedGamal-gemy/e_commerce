
const mongoose = require("mongoose");
const crypto = require("crypto");

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Product",
      required: true,
    },
    variant: { type: mongoose.Schema.Types.ObjectId, ref: "ProductVariant" },
    size: { type: String, required: true },
    color: { name: String, value: String },
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
    // Tracking Info
    shippingInfo: {
      carrier: { type: String, default: "" },
      trackingNumber: { type: String, default: "" },
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
      transactionId: String, // Stripe Payment Intent ID
      amount_paid: { type: Number, default: 0 },
    },
    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
      default: "pending",
    },
    // Audit Trail
    statusHistory: [
      {
        status: String,
        changedAt: { type: Date, default: Date.now },
        note: String,
        actionBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
    subtotal: { type: Number, default: 0 },
    shippingPrice: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 },
    stripeSessionId: String,
    shippedAt: Date,
    deliveredAt: Date,
  },
  { timestamps: true }
);

// Pre-save Hook for Order Number and Totals
OrderSchema.pre("save", function (next) {
  if (!this.orderNumber) {
    this.orderNumber = `ORD-${crypto
      .randomBytes(3)
      .toString("hex")
      .toUpperCase()}`;
  }

  const calculatedSubtotal = this.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  this.subtotal = calculatedSubtotal;
  this.totalPrice =
    calculatedSubtotal + (this.shippingPrice || 0) - (this.discount || 0);

  next();
});

// Admin Dashboard Statics
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

OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ "billingDetails.phone": 1 });
OrderSchema.index({ status: 1 }); // For fast dashboard filtering

const Order = mongoose.model("Order", OrderSchema);
module.exports = Order;
