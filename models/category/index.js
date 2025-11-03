const mongoose = require("mongoose");
const CategorySchema = require("./category.schema");

require("./category.hooks")(CategorySchema);
require("./category.indexes")(CategorySchema);

module.exports = mongoose.model("Category", CategorySchema);
