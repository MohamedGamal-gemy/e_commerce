// productType.schema.js
const mongoose = require("mongoose");

const ProductTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, lowercase: true, unique: true, sparse: true },
    description: { type: String, trim: true },

    image: {
      url: { type: String, trim: true },
      publicId: String,
      alt: String,
    },

    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },

    productCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = ProductTypeSchema;
