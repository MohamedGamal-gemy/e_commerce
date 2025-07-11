const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const Cart = require("../models/CartItem");
const { Product } = require("../models/productModel");

const addToCart = asyncHandler(async (req, res) => {
  const { userId, productId, variantId, size, quantity } = req.body;

  if (!userId || !productId || !variantId || !size || !quantity) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  const variant = product.variants.find(
    (v) => v._id.toString() === variantId.toString()
  );
  if (!variant) {
    return res.status(400).json({ message: "Selected variant not available" });
  }

  const sizeData = variant.sizes.find((s) => s.size === size);
  if (!sizeData) {
    return res.status(400).json({ message: "Selected size not available" });
  }

  if (sizeData.quantity < quantity) {
    return res.status(400).json({
      message: `Only ${sizeData.quantity} items available in stock for this size`,
    });
  }

  let cart = await Cart.findOne({ userId });

  if (!cart) {
    cart = new Cart({ userId, items: [] });
  }

  const existingItem = cart.items.find(
    (item) =>
      item.productId.toString() === productId &&
      item.variantId.toString() === variantId &&
      item.size === size
  );

  if (existingItem) {
    const totalRequested = existingItem.quantity + quantity;

    if (sizeData.quantity < totalRequested) {
      return res.status(400).json({
        message: `You already have ${existingItem.quantity} in cart. Only ${
          sizeData.quantity - existingItem.quantity
        } more can be added.`,
      });
    }

    existingItem.quantity = totalRequested;
  } else {
    cart.items.push({ productId, variantId, size, quantity });
  }

  await cart.save();

  res.status(200).json({
    message: "Item added to cart successfully",
    cart,
  });
});

const getCart = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  const cart = await Cart.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $unwind: "$items" },
    {
      $lookup: {
        from: "products",
        localField: "items.productId",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    {
      $addFields: {
        filteredVariant: {
          $arrayElemAt: [
            {
              $filter: {
                input: "$product.variants",
                as: "variant",
                cond: { $eq: ["$$variant._id", "$items.variantId"] },
              },
            },
            0,
          ],
        },
      },
    },
    {
      $project: {
        _id: 1,
        userId: 1,
        item: {
          productId: "$items.productId",
          size: "$items.size",
          quantity: "$items.quantity",
          variant: {
            _id: "$filteredVariant._id",
            color: "$filteredVariant.color",
            images: { $slice: ["$filteredVariant.images", 1] }, // أول صورة فقط
            // sizes: "$filteredVariant.sizes",
          },
        },
        productTitle: "$product.title",
        productPrice: "$product.price",
      },
    },
    {
      $group: {
        _id: "$_id",
        userId: { $first: "$userId" },
        items: {
          $push: {
            productId: "$item.productId",
            size: "$item.size",
            quantity: "$item.quantity",
            variant: "$item.variant",
            productTitle: "$productTitle",
            productPrice: "$productPrice",
          },
        },
      },
    },
  ]);

  if (!cart || cart.length === 0) {
    return res.status(404).json({ message: "Cart not found" });
  }

  res.status(200).json(cart[0]); // aggregation بيرجع array فبنرجع أول عنصر
});

module.exports = {
  getCart,
};

module.exports = {
  addToCart,
  getCart,
};
