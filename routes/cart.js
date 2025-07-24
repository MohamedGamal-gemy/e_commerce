const express = require("express");
const asyncHandler = require("express-async-handler");
const Joi = require("joi");
const Cart = require("../models/CartItem");
const { protect } = require("../middlewares/protect");
const ProductVariant = require("../models/productModel");

const router = express.Router();

// ✅ Validation schema for adding item to cart
const validateAddToCart = (data) => {
  const schema = Joi.object({
    productId: Joi.string().required(),
    variantId: Joi.string().required(),
    size: Joi.string().required(),
    stock: Joi.number().integer().min(1).required(),
  });
  return schema.validate(data);
};

router.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { page = 1, limit = 5 } = req.query;

    const cart = await Cart.findOne({ userId })
      .populate({
        path: "items.productId",
        select: "title price",
      })
      .populate({
        path: "items.variantId",
        select: "images",
      })
      .lean();

    if (!cart) return res.json({ items: [], totalPages: 0, currentPage: 1 });

    const filteredItems = cart.items.map((item) => {
      const product = item.productId;
      const variant = Array.isArray(item.variantId) ? item.variantId[0] : null;

      return {
        _id: item._id,
        title: product?.title,
        price: product?.price,
        color: item.color,
        size: item.size,
        stock: item.stock,
        image: variant?.images?.[0]?.url || null,
      };
    });

    // Pagination logic
    const startIndex = (page - 1) * limit;
    const paginatedItems = filteredItems.slice(
      startIndex,
      startIndex + parseInt(limit)
    );
    const totalPages = Math.ceil(filteredItems.length / limit);

    res.json({
      items: paginatedItems,
      totalPages,
      currentPage: parseInt(page),
      totalItems: filteredItems.length,
    });
  })
);

// ✅ Add item to cart
// router.post(
//   "/",
//   protect,
//   asyncHandler(async (req, res) => {
//     const userId = req.user._id;
//     const { productId, variantId, size, stock } = req.body;

//     const { error } = validateAddToCart(req.body);
//     if (error)
//       return res.status(400).json({ message: error.details[0].message });

//     let cart = await Cart.findOne({ userId });

//     if (!cart) {
//       cart = new Cart({
//         userId,
//         items: [{ productId, variantId, size, stock }],
//       });
//     } else {
//       const existingItem = cart.items.find(
//         (item) =>
//           item.productId.toString() === productId &&
//           item.size === size &&
//           item.variantId?.toString() === variantId
//       );

//       if (existingItem) {
//         existingItem.stock += stock;
//       } else {
//         cart.items.push({ productId, variantId, size, stock });
//       }
//     }

//     const savedCart = await cart.save();
//     res.status(201).json(savedCart);
//   })
// );

// ✅ Delete an item from cart
router.post(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { productId, variantId, size, stock } = req.body;

    if (!productId || !variantId || !size || !stock) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // ✅ Start MongoDB session for Transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // ✅ 1. Check if stock is available
      const variant = await ProductVariant.findById(variantId).session(session);
      if (!variant) {
        throw new Error("Variant not found");
      }

      const sizeData = variant.sizes.find((s) => s.size === size);
      if (!sizeData) {
        throw new Error("Size not found for this variant");
      }

      if (sizeData.stock < stock) {
        throw new Error("Not enough stock available");
      }

      // ✅ 2. Deduct stock
      await ProductVariant.updateOne(
        { _id: variantId, "sizes.size": size },
        { $inc: { "sizes.$.stock": -stock } },
        { session }
      );

      // ✅ 3. Add or update cart item
      let cart = await Cart.findOne({ userId }).session(session);
      if (!cart) {
        cart = new Cart({
          userId,
          items: [{ productId, variantId, size, stock }],
        });
      } else {
        const existingItem = cart.items.find(
          (item) =>
            item.productId.toString() === productId &&
            item.size === size &&
            item.variantId?.toString() === variantId
        );

        if (existingItem) {
          existingItem.stock += stock;
        } else {
          cart.items.push({ productId, variantId, size, stock });
        }
      }

      await cart.save({ session });

      // ✅ Commit transaction
      await session.commitTransaction();
      session.endSession();

      res.status(201).json({ message: "Item added to cart", cart });
    } catch (error) {
      // ❌ Rollback if something fails
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ message: error.message });
    }
  })
);

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

    if (cart.items.length === 0) {
      await Cart.deleteOne({ userId });
      return res.json({ message: "Cart emptied and deleted" });
    }

    await cart.save();
    res.json({ message: "Item removed successfully" });
  })
);

// ✅ Update stock (increment/decrement)
router.put(
  "/item/:itemId",
  protect,
  asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { itemId } = req.params;
    const { action } = req.body; // "increment" or "decrement"

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const item = cart.items.id(itemId);
    if (!item) return res.status(404).json({ message: "Item not found" });

    if (action === "increment") {
      item.stock += 1;
    } else if (action === "decrement") {
      item.stock -= 1;
      if (item.stock < 1) {
        cart.items = cart.items.filter((i) => i._id.toString() !== itemId);
      }
    } else {
      return res.status(400).json({ message: "Invalid action" });
    }

    if (cart.items.length === 0) {
      await Cart.deleteOne({ userId });
      return res.json({ message: "Cart is empty and deleted" });
    }

    await cart.save();
    res.json({ message: "stock updated", cart });
  })
);

module.exports = router;
