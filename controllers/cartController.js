const asyncHandler = require("express-async-handler");
const Product = require("../models/product");
const ProductVariant = require("../models/productVariant");
const CartService = require("../services/cart.service");

//
const getCart = asyncHandler(async (req, res) => {
  const cart = await CartService.getCart({
    userId: req.user?.id,
    sessionId: req.sessionId,
  });

  res.json({
    success: true,
    cart: cart || {
      items: [],
      totalItems: 0,
      totalPrice: 0,
      currency: "EGP",
    },
  });
});

const getCartCount = asyncHandler(async (req, res) => {
  const count = await CartService.getCartCount({
    userId: req.user?.id,
    sessionId: req.sessionId,
  });

  res.json({
    success: true,
    count,
  });
});

//
const addItem = asyncHandler(async (req, res) => {
  const { product, variant, size, quantity } = req.body;
  const userId = req.user?.id;
  const sessionId = req.sessionId;

  const qty = Number(quantity);
  if (!product || !variant || !size || qty <= 0) {
    return res.status(400).json({ message: "Invalid payload" });
  }

  const [productDoc, variantDoc] = await Promise.all([
    Product.findById(product).select("price"),
    ProductVariant.findById(variant).select("color"),
  ]);

  if (!productDoc || !variantDoc) {
    return res.status(404).json({ message: "Not found" });
  }

  const cart = await CartService.addItem({
    userId,
    sessionId,
    item: {
      product,
      variant,
      size,
      color: variantDoc.color?.name,
      quantity: qty,
      price: productDoc.price,
    },
  });

  res.status(201).json({
    success: true,
    cart: {
      totalItems: cart.totalItems,
      totalPrice: cart.totalPrice,
    },
  });
});

//
const updateQuantity = asyncHandler(async (req, res) => {
  const { variant, size, quantity } = req.body;

  const cart = await CartService.updateQuantity({
    userId: req.user?.id,
    sessionId: req.sessionId,
    variant,
    size,
    quantity,
  });

  // res.json({
  //   success: true,
  //   cartId: cart._id,
  //   // totals: {
  //   //   totalItems: cart.totalItems,
  //   //   totalPrice: cart.totalPrice,
  //   // },
  // });

  res.json({ success: true, cart });
});

//
const removeItem = asyncHandler(async (req, res) => {
  const { variant, size } = req.body;

  const cart = await CartService.removeItem({
    userId: req.user?.id,
    sessionId: req.sessionId,
    variant,
    size,
  });

  res.json({ success: true, cart });
});

//
const clearCart = asyncHandler(async (req, res) => {
  await CartService.clearCart({
    userId: req.user?.id,
    sessionId: req.sessionId,
  });

  res.json({ success: true });
});

module.exports = {
  getCart,
  addItem,
  updateQuantity,
  removeItem,
  clearCart,
  getCartCount,
};
