const mongoose = require("mongoose");

// ==========================
// 1. Sub-schema (Cart Item)
// ==========================
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
    size: { type: String, required: true },
    quantity: {
      type: Number,
      default: 1,
      min: [1, "Quantity must be at least 1"],
    },
    price: { type: Number, required: true },
    isAvailable: { type: Boolean, default: true },
  },
  { _id: false }
);

// ==========================
// 2. Main Schema (Cart)
// ==========================
const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    sessionId: { type: String, default: null },
    items: [cartItemSchema],
    subtotal: { type: Number, default: 0 },
    totalItems: { type: Number, default: 0 },
    couponCode: { type: String, default: null },
    discountAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// ==========================
// ⚙️ 3. Indexes
// ==========================
cartSchema.index(
  { userId: 1 },
  {
    unique: true,
    partialFilterExpression: { userId: { $type: "objectId" } },
  }
);

cartSchema.index(
  { sessionId: 1 },
  {
    unique: true,
    partialFilterExpression: { sessionId: { $type: "string" } },
  }
);

// ==========================
// 🧮 4. Middleware لحساب totals
// ==========================
cartSchema.pre("save", function (next) {
  if (!this.items || this.items.length === 0) {
    this.subtotal = 0;
    this.totalItems = 0;
  } else {
    this.subtotal = this.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    this.totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
  }
  next();
});

// ==========================
// 5. Export Model
// ==========================
const Cart = mongoose.model("Cart", cartSchema);
module.exports = Cart;
