module.exports = (schema) => {
  schema.pre("save", function (next) {
    if (!this.items || this.items.length === 0) {
      this.totalItems = 0;
      this.totalPrice = 0;
    } else {
      this.totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
      this.totalPrice = this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    }
    next();
  });
};
