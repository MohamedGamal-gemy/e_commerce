// models/productTypeModel.js
const mongoose = require("mongoose");
const ProductTypeSchema = require("./productType.schema");

require("./productType.hooks")(ProductTypeSchema);
require("./productType.indexes")(ProductTypeSchema);
require("./productType.virtuals")(ProductTypeSchema);

module.exports = mongoose.model("ProductType", ProductTypeSchema);
