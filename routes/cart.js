
const express = require("express");
const asyncHandler = require("express-async-handler");
const Joi = require("joi");
const Cart = require("../models/CartItem");
const { protect } = require("../middlewares/protect");

const router = express.Router();

// Validation schema for adding item to cart
const validateAddToCart = (data) => {
  const schema = Joi.object({
    productId: Joi.string().required(), // Assuming ObjectId is sent as string
    variantId: Joi.string().required(),
    size: Joi.string().required(),
    quantity: Joi.number().integer().min(1).required(),
  });
  return schema.validate(data);
};

// 🔸 Get cart by userId
router.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const cart = await Cart.findOne({ userId })
      .populate({
        path: "items.productId",
        select: "title price",
      })
      .populate({
        path: "items.variantId",
        select: "images",
      });

    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const filteredItems = cart.items.map((item) => {
      const product = item.productId;
      const variant = Array.isArray(item.variantId) ? item.variantId[0] : null;

      return {
        _id: item._id,
        title: product?.title,
        price: product?.price,
        color: item.color,
        size: item.size,
        quantity: item.quantity,
        image: variant?.images?.[0]?.url || null,
      };
    });

    res.json({ items: filteredItems });
  })
);

// 🔸 Delete item from cart
router.delete(
  "/item/:itemId",
  protect,
  asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { itemId } = req.params;

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const initialLength = cart.items.length;
    cart.items = cart.items.filter((item) => item._id.toString() !== itemId);

    if (cart.items.length === initialLength) {
      return res.status(404).json({ message: "Item not found in cart" });
    }

    // Delete cart if empty
    if (cart.items.length === 0) {
      await Cart.deleteOne({ userId });
      return res.json({ message: "Cart emptied and deleted" });
    }

    await cart.save();
    res.json({ message: "Item removed successfully" });
  })
);

router.post(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { productId, variantId, size, quantity } = req.body;

    const { error } = validateAddToCart(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({
        userId,
        items: [{ productId, variantId, size, quantity }],
      });
    } else {
      const existingItem = cart.items.find(
        (item) =>
          item.productId.toString() === productId &&
          item.size === size &&
          item.variantId?.toString() === variantId
      );

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        cart.items.push({ productId, variantId, size, quantity });
      }
    }

    const savedCart = await cart.save();
    res.status(201).json(savedCart);
  })
);
module.exports = router;
