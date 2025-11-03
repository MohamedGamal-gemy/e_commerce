const mongoose = require("mongoose");

const ProductVariantSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    // sku: { type: String, required: true, trim: true, index: true },
    sku: { type: String, trim: true, index: true },
    color: {
      name: { type: String, required: true, trim: true },
      value: { type: String, required: true, trim: true, lowercase: true },
    },
    sizes: [
      {
        size: { type: String, required: true, trim: true },
        stock: { type: Number, default: 0, min: 0 },
      },
    ],
    images: [
      {
        url: { type: String, required: true, trim: true },
        publicId: String,
        alt: String,
      },
    ],
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Hooks
const getProductModel = () => mongoose.model("Product");

ProductVariantSchema.post("save", async function () {
  const Product = getProductModel();
  await Product.findByIdAndUpdate(this.productId, {
    $addToSet: { variants: this._id },
  });
  await Product.recalcAggregates(this.productId);
});

ProductVariantSchema.post("findOneAndUpdate", async function (doc) {
  if (doc) {
    const Product = getProductModel();
    await Product.recalcAggregates(doc.productId);
  }
});

ProductVariantSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    const Product = getProductModel();
    await Product.findByIdAndUpdate(doc.productId, {
      $pull: { variants: doc._id },
    });
    await Product.recalcAggregates(doc.productId);
  }
});

module.exports = ProductVariantSchema;
