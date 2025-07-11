const express = require("express");
const asyncHandler = require("express-async-handler");
const Cart = require("../models/CartItem");
const { protect } = require("../middlewares/protect");
const router = express.Router();

// 🔸 Get cart by userId
router.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const userId = req.user._id; // ← مأخوذ من التوكن

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

    await cart.save();
    res.json({ message: "Item removed successfully" });
  })
);

// 🔸 Add item to cart
router.post(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const userId = req.user._id; // ← مأخوذ من التوكن
    const { productId, variantId, size, quantity } = req.body;

    if (!productId || !variantId || !size || !quantity) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      // ⬅️ إنشاء سلة جديدة
      cart = new Cart({
        userId,
        items: [{ productId, variantId, size, quantity }],
      });
    } else {
      // ⬅️ البحث عن العنصر الموجود بالفعل بنفس product + variant + size
      const existingItem = cart.items.find(
        (item) =>
          item.productId.toString() === productId &&
          item.size === size &&
          item.variantId?.toString() === variantId?.toString()
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
