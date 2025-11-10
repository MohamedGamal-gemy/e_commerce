module.exports = (schema) => {
  schema.index({ sessionId: 1, isActive: 1 });
  schema.index({ "items.product": 1 });
  schema.index({ "items.variant": 1 });
};
