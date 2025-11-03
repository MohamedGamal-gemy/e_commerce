module.exports = (schema) => {
  schema.pre("save", function (next) {
    if (this.isModified("items") || this.isNew) {
      const total = this.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      this.totalPrice = total + (this.shippingPrice || 0) - (this.discount || 0);
    }
    next();
  });
};
