const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, lowercase: true, unique: true, sparse: true },
    description: { type: String, trim: true },
    image: {
      url: { type: String, trim: true },
      publicId: String,
      alt: String,
    },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 }, // ترتيب العرض
  },
  { timestamps: true }
);

module.exports = CategorySchema;
