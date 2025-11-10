const mongoose = require("mongoose");
const ProductVariantSchema = require("./productVariant.hooks");
const getColorCountsPlugin = require("./variant.statics");

ProductVariantSchema.plugin(getColorCountsPlugin);

module.exports = mongoose.model("ProductVariant", ProductVariantSchema);
