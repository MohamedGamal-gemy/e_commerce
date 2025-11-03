const mongoose = require("mongoose");
const ProductSchema = require("./product.schema");

// Attach extensions
require("./product.virtuals")(ProductSchema);
require("./product.statics")(ProductSchema);
require("./product.hooks")(ProductSchema);
require("./product.indexes")(ProductSchema);

module.exports = mongoose.model("Product", ProductSchema);
