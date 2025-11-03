const mongoose = require("mongoose");
const SubcategorySchema = require("./subcategory.schema");

require("./subcategory.hooks")(SubcategorySchema);
require("./subcategory.indexes")(SubcategorySchema);

module.exports = mongoose.model("Subcategory", SubcategorySchema);
