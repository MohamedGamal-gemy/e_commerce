module.exports = (schema) => {
  schema.index({ name: 1 });
  schema.index({ isActive: 1 });
  schema.index({ order: 1 });
};
