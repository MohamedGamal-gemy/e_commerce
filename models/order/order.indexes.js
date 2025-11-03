module.exports = (schema) => {
  schema.index({ user: 1 });
  schema.index({ status: 1 });
  schema.index({ createdAt: -1 });
  schema.index({ "payment.status": 1 });
};
