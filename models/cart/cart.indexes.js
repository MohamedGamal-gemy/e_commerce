module.exports = (schema) => {
  schema.index({ user: 1, isActive: 1 });
  schema.index({ "items.product": 1 });
  schema.index({ "items.variant": 1 });
};
