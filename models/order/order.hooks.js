// module.exports = (schema) => {
//   schema.pre("save", function (next) {
//     if (this.isModified("items") || this.isNew) {
//       const total = this.items.reduce(
//         (sum, item) => sum + item.price * item.quantity,
//         0
//       );
//       this.totalPrice = total + (this.shippingPrice || 0) - (this.discount || 0);
//     }
//     next();
//   });
// };

const crypto = require("crypto");

module.exports = (schema) => {
  schema.pre("save", async function (next) {
    // 1. توليد رقم طلب احترافي (مثال: ORD-A12B3)
    if (!this.orderNumber) {
      this.orderNumber = `ORD-${crypto
        .randomBytes(3)
        .toString("hex")
        .toUpperCase()}`;
    }

    // 2. حساب السعر الإجمالي
    if (this.isModified("items") || this.isNew) {
      const total = this.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      this.subtotal = total;
      this.totalPrice =
        total + (this.shippingPrice || 0) - (this.discount || 0);
    }
    next();
  });
};
