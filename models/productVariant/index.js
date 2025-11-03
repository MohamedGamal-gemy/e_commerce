const mongoose = require("mongoose");
const ProductVariantSchema = require("./variant.schema");


module.exports = mongoose.model("ProductVariant", ProductVariantSchema);
