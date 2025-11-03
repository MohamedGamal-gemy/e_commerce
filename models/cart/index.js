const mongoose = require("mongoose");
const CartSchema = require("./cart.schema");

require("./cart.hooks")(CartSchema);
require("./cart.statics")(CartSchema);
require("./cart.indexes")(CartSchema);

module.exports = mongoose.model("Cart", CartSchema);
