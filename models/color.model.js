const mongoose = require("mongoose");

const ColorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    group: { type: String, required: true, trim: true }, // Primary filter group
    value: { type: String, required: true }, // Display swatch
    synonyms: { type: [String], default: [] }, // Search improvements

    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Color", ColorSchema);
