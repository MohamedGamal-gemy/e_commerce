module.exports = (schema) => {
  // Compound indexes for common queries
  schema.index({ status: 1, isAvailable: 1 });
  schema.index({ productType: 1, status: 1 });
  // schema.index({ productTypeName: 1 });
  schema.index({ productId: 1, "color.name": 1 });
  schema.index({ productId: 1, createdAt: -1 });
  schema.index({ price: 1 });
  schema.index({ isFeatured: 1, createdAt: -1 });
  schema.index({ totalStock: -1 });

  // Text search index
  schema.index({ searchableText: "text" });

  // Slug index for unique lookups (sparse: allows null/undefined values)
  schema.index({ slug: 1 }, { unique: true, sparse: true });

  // SKU index for product lookups (sparse: allows null/undefined values)
  schema.index({ sku: 1 }, { sparse: true });
};
