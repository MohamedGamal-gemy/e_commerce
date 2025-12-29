module.exports = (schema) => {
  schema.statics.addItem = async function (userId, newItem) {
    let cart = await this.findOne({ user: userId, isActive: true });

    if (!cart) {
      cart = new this({ user: userId, items: [newItem] });
    } else {
      const index = cart.items.findIndex(
        (i) =>
          i.product.toString() === newItem.product.toString() &&
          i.variant.toString() === newItem.variant.toString() &&
          i.size === newItem.size &&
          i.color === newItem.color
      );

      if (index > -1) {
        cart.items[index].quantity += newItem.quantity;
      } else {
        cart.items.push(newItem);
      }
    }

    await cart.save();
    return cart;
  };

  schema.statics.removeItem = async function (userId, variantId, size, color) {
    const cart = await this.findOne({ user: userId, isActive: true });
    if (!cart) return null;

    cart.items = cart.items.filter(
      (i) =>
        !(
          i.variant.toString() === variantId.toString() &&
          i.size === size &&
          i.color === color
        )
    );

    await cart.save();
    return cart;
  };

  schema.statics.clearCart = async function (userId) {
    return await this.findOneAndUpdate(
      { user: userId, isActive: true },
      { items: [], totalItems: 0, totalPrice: 0 },
      { new: true }
    );
  };
};
