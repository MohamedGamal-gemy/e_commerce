function recalcCart(cart) {
  cart.totalItems = cart.items.reduce((s, i) => s + i.quantity, 0);
  cart.totalPrice = cart.items.reduce((s, i) => s + i.quantity * i.price, 0);
}

module.exports = { recalcCart };
