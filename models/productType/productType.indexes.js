module.exports = (schema) => {
  schema.index({ name: 1 }, { unique: true });
  schema.index({ isActive: 1 });
  schema.index({ order: 1 });
};
