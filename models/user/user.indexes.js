module.exports = (schema) => {
  // schema.index({ email: 1 });
  schema.index({ role: 1 });
  schema.index({ isActive: 1 });
};
