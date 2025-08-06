const express = require("express");
const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const Joi = require("joi");
const Cart = require("../models/CartItem");
const { protect } = require("../middlewares/protect");
const ProductVariant = require("../models/variantsModel");

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

// router.get(
//   "/",
//   protect,
//   asyncHandler(async (req, res) => {
//     const userId = req.user._id;
//     const { page = 1, limit = 5 } = req.query;

//     const cart = await Cart.findOne({ userId })
//       .populate({
//         path: "items.productId",
//         select: "title price",
//       })
//       .populate({
//         path: "items.variantId",
//         select: "images",
//       })
//       .lean();

//     if (!cart) return res.json({ items: [], totalPages: 0, currentPage: 1 });

//     const filteredItems = cart.items.map((item) => {
//       const product = item.productId;
//       const variant = Array.isArray(item.variantId) ? item.variantId[0] : null;

//       return {
//         _id: item._id,
//         title: product?.title,
//         price: product?.price,
//         color: item.color,
//         size: item.size,
//         stock: item.stock,
//         image: variant?.images?.[0]?.url || null,
//       };
//     });

//     // Pagination logic
//     const startIndex = (page - 1) * limit;
//     const paginatedItems = filteredItems.slice(
//       startIndex,
//       startIndex + parseInt(limit)
//     );
//     const totalPages = Math.ceil(filteredItems.length / limit);

//     res.json({
//       items: paginatedItems,
//       totalPages,
//       currentPage: parseInt(page),
//       totalItems: filteredItems.length,
//     });
//   })
// );

router.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const pipeline = [
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $unwind: "$items" },

      // ✅ Join مع Products
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },

      // ✅ Join مع Variants
      {
        $lookup: {
          from: "productvariants",
          localField: "items.variantId",
          foreignField: "_id",
          as: "variant",
        },
      },
      { $unwind: "$variant" },

      // ✅ Add fields for clean response
      {
        $project: {
          _id: "$items._id",
          title: "$product.title",
          price: "$product.price",
          size: "$items.size",
          stock: "$items.stock",
          color: "$variant.color",
          image: { $arrayElemAt: ["$variant.images.url", 0] },
        },
      },

      // ✅ Pagination + Count
      {
        $facet: {
          items: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const result = await Cart.aggregate(pipeline);
    const items = result[0].items || [];
    const totalItems = result[0].totalCount[0]?.count || 0;
    const totalPages = Math.ceil(totalItems / limit);

    res.json({
      items,
      totalItems,
      totalPages,
      currentPage: page,
    });
  })
);

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

// ✅ DELETE ITEM
router.delete(
  "/item/:itemId",
  protect,
  asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { itemId } = req.params;

    // ✅ Start Transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const cart = await Cart.findOne({ userId }).session(session);
      if (!cart) throw new Error("Cart not found");

      const item = cart.items.id(itemId);
      if (!item) throw new Error("Item not found");

      // ✅ Restore stock
      await ProductVariant.updateOne(
        { _id: item.variantId, "sizes.size": item.size },
        { $inc: { "sizes.$.stock": item.stock } },
        { session }
      );

      // ✅ Remove item
      cart.items = cart.items.filter((i) => i._id.toString() !== itemId);

      if (cart.items.length === 0) {
        await Cart.deleteOne({ userId }, { session });
      } else {
        await cart.save({ session });
      }

      await session.commitTransaction();
      session.endSession();

      res.json({ message: "Item removed and stock restored" });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ message: error.message });
    }
  })
);

// ✅ UPDATE ITEM QUANTITY
router.put(
  "/item/:itemId",
  protect,
  asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { itemId } = req.params;
    const { action } = req.body; // increment | decrement

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const cart = await Cart.findOne({ userId }).session(session);
      if (!cart) throw new Error("Cart not found");

      const item = cart.items.id(itemId);
      if (!item) throw new Error("Item not found");

      const variant = await ProductVariant.findById(item.variantId).session(
        session
      );
      if (!variant) throw new Error("Variant not found");

      const sizeData = variant.sizes.find((s) => s.size === item.size);
      if (!sizeData) throw new Error("Size not found");

      if (action === "increment") {
        if (sizeData.stock < 1) throw new Error("No stock available");
        item.stock += 1;
        await ProductVariant.updateOne(
          { _id: item.variantId, "sizes.size": item.size },
          { $inc: { "sizes.$.stock": -1 } },
          { session }
        );
      } else if (action === "decrement") {
        item.stock -= 1;
        await ProductVariant.updateOne(
          { _id: item.variantId, "sizes.size": item.size },
          { $inc: { "sizes.$.stock": 1 } },
          { session }
        );
        if (item.stock < 1) {
          cart.items = cart.items.filter((i) => i._id.toString() !== itemId);
        }
      } else {
        throw new Error("Invalid action");
      }

      if (cart.items.length === 0) {
        await Cart.deleteOne({ userId }, { session });
      } else {
        await cart.save({ session });
      }

      await session.commitTransaction();
      session.endSession();

      res.json({ message: "Cart updated and stock synced", cart });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      res.status(400).json({ message: error.message });
    }
  })
);

// router.delete(
//   "/item/:itemId",
//   protect,
//   asyncHandler(async (req, res) => {
//     const userId = req.user._id;
//     const { itemId } = req.params;

//     const cart = await Cart.findOne({ userId });
//     if (!cart) return res.status(404).json({ message: "Cart not found" });

//     const initialLength = cart.items.length;
//     cart.items = cart.items.filter((item) => item._id.toString() !== itemId);

//     if (cart.items.length === initialLength) {
//       return res.status(404).json({ message: "Item not found in cart" });
//     }

//     if (cart.items.length === 0) {
//       await Cart.deleteOne({ userId });
//       return res.json({ message: "Cart emptied and deleted" });
//     }

//     await cart.save();
//     res.json({ message: "Item removed successfully" });
//   })
// );

// // ✅ Update stock (increment/decrement)
// router.put(
//   "/item/:itemId",
//   protect,
//   asyncHandler(async (req, res) => {
//     const userId = req.user._id;
//     const { itemId } = req.params;
//     const { action } = req.body; // "increment" or "decrement"

//     const cart = await Cart.findOne({ userId });
//     if (!cart) return res.status(404).json({ message: "Cart not found" });

//     const item = cart.items.id(itemId);
//     if (!item) return res.status(404).json({ message: "Item not found" });

//     if (action === "increment") {
//       item.stock += 1;
//     } else if (action === "decrement") {
//       item.stock -= 1;
//       if (item.stock < 1) {
//         cart.items = cart.items.filter((i) => i._id.toString() !== itemId);
//       }
//     } else {
//       return res.status(400).json({ message: "Invalid action" });
//     }

//     if (cart.items.length === 0) {
//       await Cart.deleteOne({ userId });
//       return res.json({ message: "Cart is empty and deleted" });
//     }

//     await cart.save();
//     res.json({ message: "stock updated", cart });
//   })
// );

module.exports = router;
