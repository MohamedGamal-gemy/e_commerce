// // models/GuestCart.js
// const mongoose = require("mongoose");
// const BaseCartSchema = require("./schemas/cart.schema");

// const GuestCartSchema = BaseCartSchema.clone();
// GuestCartSchema.add({ sessionId: { type: String, index: true } });

// const GuestCart =
//   mongoose.models.GuestCart || mongoose.model("GuestCart", GuestCartSchema);

// module.exports = GuestCart;

// models/GuestCart.js
const mongoose = require("mongoose");
const BaseCartSchema = require("./schemas/cart.schema");

const GuestCartSchema = BaseCartSchema.clone();

GuestCartSchema.add({
  sessionId: { type: String, required: true },
});

GuestCartSchema.index({ sessionId: 1, isActive: 1 });

module.exports =
  mongoose.models.GuestCart || mongoose.model("GuestCart", GuestCartSchema);
