// // models/Cart.js
// const mongoose = require("mongoose");
// const BaseCartSchema = require("./schemas/cart.schema");

// const UserCartSchema = BaseCartSchema.clone();
// UserCartSchema.add({
//   user: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "User",
//     index: true,
//     required: true,
//   },
// });

// const Cart = mongoose.models.Cart || mongoose.model("Cart", UserCartSchema);

// module.exports = Cart;

// models/Cart.js
const mongoose = require("mongoose");
const BaseCartSchema = require("./schemas/cart.schema");

const UserCartSchema = BaseCartSchema.clone();

UserCartSchema.add({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

UserCartSchema.index({ user: 1, isActive: 1 });

module.exports = mongoose.models.Cart || mongoose.model("Cart", UserCartSchema);
