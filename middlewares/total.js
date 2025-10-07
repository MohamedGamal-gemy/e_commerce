// middlewares / total

ProductSchema.add({
  totalStock: {
    type: Number,
    default: 0,
    min: [0, "Total stock can't be negative"],
  },
});

ProductSchema.pre("save", async function (next) {
  const variants = await ProductVariant.find({ productId: this._id });
  this.totalStock = variants.reduce((sum, variant) => {
    return sum + variant.sizes.reduce((s, size) => s + (size.stock || 0), 0);
  }, 0);
  next();
});

ProductVariantSchema.pre("save", async function (next) {
  const product = await Product.findById(this.productId);
  const variants = await ProductVariant.find({ productId: this.productId });
  product.totalStock = variants.reduce((sum, variant) => {
    return sum + variant.sizes.reduce((s, size) => s + (size.stock || 0), 0);
  }, 0);
  await product.save();
  next();
});
