// models/Cart.js
const mongoose = require("mongoose");
const BaseCartSchema = require("./schemas/cart.schema");

// بنعمل نسخة من السكيما الأساسية ونضيف حقل اليوزر
const UserCartSchema = BaseCartSchema.clone();
UserCartSchema.add({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    index: true,
    required: true,
  },
});

// ✅ الحل لمنع الخطأ: نتحقق إذا كان الموديل موجوداً بالفعل في الذاكرة
const Cart = mongoose.models.Cart || mongoose.model("Cart", UserCartSchema);

module.exports = Cart;
