const mongoose = require("mongoose");

// 3.1. نموذج عنصر السلة (Cart Item Schema)
const cartItemSchema = new mongoose.Schema(
  {
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
    size: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      default: 1,
      min: [1, "Quantity must be at least 1"],
    },
    // 🔥 السعر الثابت الذي تم الشراء به
    price: {
      type: Number,
      required: true,
    },
    // السعر الأصلي الثابت وقت الإضافة
    originalPrice: {
      type: Number,
      required: true,
    },
    // حالة توافر المنتج (للتأكد من وجوده في المخزون عند الدفع)
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

// 3.2. النموذج الرئيسي للسلة (Cart Schema)
const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    sessionId: {
      type: String,
      default: null,
    },
    items: [cartItemSchema],

    // 🔥 ملخصات السلة (تُحسب تلقائياً في middleware)
    subtotal: {
      type: Number,
      default: 0,
    },
    totalItems: {
      type: Number,
      default: 0,
    },
    // تفاصيل الكوبون (إذا تم تطبيقه على مستوى السلة)
    couponCode: {
      type: String,
      default: null,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// يجب أن يتم وضع cartSchema.pre('save') middleware هنا لحساب subtotal و totalItems

cartSchema.index(
  { userId: 1, sessionId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      userId: { $ne: null },
      sessionId: { $ne: null },
    },
  }
);

const Cart = mongoose.model("Cart", cartSchema);
module.exports = Cart;
