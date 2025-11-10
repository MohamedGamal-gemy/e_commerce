const mongoose = require("mongoose");
const GuestCartSchema = require("./guestCart.schema");

require("./guestCart.hooks")(GuestCartSchema);
require("./guestCart.statics")(GuestCartSchema);
require("./guestCart.indexes")(GuestCartSchema);

module.exports = mongoose.model("GuestCart", GuestCartSchema);
