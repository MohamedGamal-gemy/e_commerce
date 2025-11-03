const mongoose = require("mongoose");

const SubcategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, lowercase: true, unique: true, sparse: true },
    description: { type: String, trim: true },
    image: {
      url: { type: String, trim: true },
      publicId: String,
      alt: String,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = SubcategorySchema;
