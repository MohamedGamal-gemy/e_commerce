const mongoose = require("mongoose");

const ProductVariantSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    color: {
      name: {
        type: String,
        required: [true, "Color name is required"],
      },
      value: {
        type: String,
        required: [true, "Color value is required"],
      },
    },
    images: [
      {
        url: { type: String, required: [true, "Image URL is required"] },
        publicId: { type: String },
      },
    ],
    sizes: [
      {
        size: {
          type: String,
          required: [true, "Size is required"],
        },
        stock: {
          type: Number,
          default: 0,
          min: [0, "Stock can't be negative"],
        },
      },
    ],
  },
  { timestamps: true }
);

const ProductVariant = mongoose.model("ProductVariant", ProductVariantSchema);
module.exports = ProductVariant;
