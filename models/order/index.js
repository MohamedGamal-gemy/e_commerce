const mongoose = require("mongoose");
const OrderSchema = require("./order.schema");

require("./order.hooks")(OrderSchema);
require("./order.statics")(OrderSchema);
require("./order.indexes")(OrderSchema);

module.exports = mongoose.model("Order", OrderSchema);
