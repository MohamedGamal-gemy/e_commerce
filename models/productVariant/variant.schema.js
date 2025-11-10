
const mongoose = require("mongoose");

const ProductVariantSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    sku: { type: String, trim: true, index: true, sparse: true },
    color: {
      name: { type: String, required: true, trim: true, index: true },
      value: { type: String, required: true, trim: true, lowercase: true },
    },
    sizes: [
      {
        size: { type: String, required: true, trim: true, uppercase: true },
        stock: { type: Number, default: 0, min: 0 },
      },
    ],
    images: [
      {
        url: { type: String, required: true, trim: true },
        publicId: { type: String, trim: true },
        alt: { type: String, trim: true },
      },
    ],
    isDefault: { type: Boolean, default: false, index: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

module.exports = ProductVariantSchema;
