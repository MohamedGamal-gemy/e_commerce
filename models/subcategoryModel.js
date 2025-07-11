const mongoose = require("mongoose");

const SubcategorySchema = new mongoose.Schema({
  name: { type: String, unique: true, required: true, trim: true },
});
const Subcategory = mongoose.model("Subcategory", SubcategorySchema);

module.exports = Subcategory;
