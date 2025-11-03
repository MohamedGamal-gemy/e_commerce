module.exports = (schema) => {
  schema.index({ status: 1, isAvailable: 1 });
  schema.index({ price: 1 });
  schema.index({ category: 1, subcategory: 1 });
  schema.index({ isFeatured: 1, createdAt: -1 });
  schema.index({ totalStock: -1 });
  schema.index({ searchableText: "text" });
};
