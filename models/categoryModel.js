const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema({
  name: { type: String, unique: true, required: true, trim: true },
});

const Category = mongoose.model("Category", CategorySchema);

module.exports = Category;
