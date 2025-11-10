const asyncHandler = require("express-async-handler");
const Cart = require("../models/cart");
const GuestCart = require("../models/guestCart");
const Product = require("../models/product");
const ProductVariant = require("../models/productVariant");

// GET: Fetch current cart (user or guest)
const getCart = asyncHandler(async (req, res) => {
  const userId = req.user && req.user.id;
  const sessionId = req.sessionId;

  // دالة مساعدة لتبسيط بيانات المنتج والڤاريانت
  const simplifyCart = (cartDoc) => {
    if (!cartDoc) return null;

    const simplifiedItems = cartDoc.items.map((item) => {
      const product = item.product
        ? {
            _id: item.product._id,
            title: item.product.title,
            slug: item.product.slug,
            price: item.product.price,
          }
        : null;

      const variant = item.variant
        ? {
            _id: item.variant._id,
            color: item.variant.color,
            image: item.variant.images?.length ? item.variant.images[0] : null, // 👈 أول صورة فقط
          }
        : null;

      return {
        product,
        variant,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        price: item.price,
      };
    });

    return {
      _id: cartDoc._id,
      sessionId: cartDoc.sessionId,
      totalItems: simplifiedItems.length,
      subtotal: simplifiedItems.reduce(
        (sum, item) => sum + (item.price || 0) * (item.quantity || 0),
        0
      ),
      items: simplifiedItems,
    };
  };

  let cart;
  if (userId) {
    cart = await Cart.findOne({ user: userId, isActive: true })
      .populate({
        path: "items.product",
        select: "title slug price",
      })
      .populate({
        path: "items.variant",
        select: "color images",
      });
    return res.status(200).json({
      type: "user",
      cart: simplifyCart(cart),
    });
  }

  cart = await GuestCart.findOne({ sessionId, isActive: true })
    .populate({
      path: "items.product",
      select: "title slug price",
    })
    .populate({
      path: "items.variant",
      select: "color images",
    });

  return res.status(200).json({
    type: "guest",
    sessionId,
    cart: simplifyCart(cart),
  });
});
// POST: Add item to cart (user or guest)
const addItem = asyncHandler(async (req, res) => {
  const userId = req.user && req.user.id;
  const sessionId = req.sessionId;

  const { product, variant, size, quantity } = req.body;
  if (!product || !variant || !size || !quantity)
    return res
      .status(400)
      .json({ message: "product, variant, size, quantity are required" });

  const [prodDoc, varDoc] = await Promise.all([
    Product.findById(product).select("price"),
    ProductVariant.findById(variant).select("color sizes"),
  ]);

  if (!prodDoc || !varDoc)
    return res.status(404).json({ message: "Product or Variant not found" });

  const sizeInfo = (varDoc.sizes || []).find((s) => s.size === size);
  if (!sizeInfo)
    return res
      .status(400)
      .json({ message: `Size ${size} is not available for this variant` });

  const color =
    (varDoc.color && (varDoc.color.name || varDoc.color.value)) || "";
  const price = prodDoc.price;

  if (userId) {
    const cart = await Cart.addItem(userId, {
      product,
      variant,
      size,
      color,
      quantity,
      price,
    });
    const populatedCart = await Cart.findById(cart._id)
      .populate({ path: "items.product", select: "title slug price" })
      .populate({
        path: "items.variant",
        select: "color images",
        transform: (doc) => {
          if (!doc) return doc;
          const obj = doc.toObject();
          return { ...obj, images: obj.images?.length ? [obj.images[0]] : [] };
        },
      });
    return res
      .status(201)
      .json({ message: "Item added", cart: populatedCart, type: "user" });
  }

  const cart = await GuestCart.addItem(sessionId, {
    product,
    variant,
    size,
    color,
    quantity,
    price,
  });
  const populatedCart = await GuestCart.findById(cart._id)
    .populate({ path: "items.product", select: "title slug price" })
    .populate({ path: "items.variant", select: "color images" });
  return res.status(201).json({
    message: "Item added",
    cart: populatedCart,
    type: "guest",
    sessionId,
  });
});

// PATCH: Update item quantity (user or guest)
const updateItemQuantity = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const sessionId = req.sessionId;
  const { variant, size, quantity } = req.body;

  if (!variant || !size || typeof quantity !== "number") {
    return res.status(400).json({
      message: "variant, size, and quantity are required",
    });
  }

  const Model = userId ? Cart : GuestCart;
  const findKey = userId
    ? { user: userId, isActive: true }
    : { sessionId, isActive: true };

  const cart = await Model.findOne(findKey);
  if (!cart) return res.status(404).json({ message: "Cart not found" });

  const index = cart.items.findIndex(
    (i) => i.variant.toString() === variant.toString() && i.size === size
    // &&
    // (!color || i.color === color)
  );

  if (index === -1)
    return res.status(404).json({ message: "Item not found in cart" });

  // 🔥 لو الكمية <= 0 احذف العنصر
  if (quantity <= 0) {
    cart.items.splice(index, 1);
  } else {
    cart.items[index].quantity = quantity;
  }

  await cart.save();

  // ✅ Populate خفيف + أول صورة فقط
  // const populatedCart = await Model.findById(cart._id)
  //   .populate({
  //     path: "items.product",
  //     select: "title slug price",
  //   })
  //   .populate({
  //     path: "items.variant",
  //     select: "color images",
  //     transform: (doc) => {
  //       if (!doc) return doc;
  //       const obj = doc.toObject();
  //       return { ...obj, images: obj.images?.length ? [obj.images[0]] : [] };
  //     },
  //   })
  //   .lean(); // مهم لتخفيف الحمل

  return res.status(200).json({
    message: "Cart updated successfully",
    // cart: populatedCart,
    type: userId ? "user" : "guest",
  });
});

// DELETE: Remove item (user or guest)
const removeItem = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const sessionId = req.sessionId;
  const { variant, size, color } = req.body;

  if (!variant || !size)
    return res.status(400).json({ message: "variant and size are required" });

  const model = userId ? Cart : GuestCart;
  const key = userId ? userId : sessionId;

  const cart = await model.removeItem(key, variant, size, color);
  if (!cart) return res.status(404).json({ message: "Cart not found" });

  const populatedCart = await model
    .findById(cart._id)
    .populate({ path: "items.product", select: "title slug price" })
    .populate({ path: "items.variant", select: "color images" });

  return res.status(200).json({
    message: "Item removed",
    cart: populatedCart,
    type: userId ? "user" : "guest",
    sessionId,
  });
});

// DELETE: Clear cart (user or guest)
const clearCart = asyncHandler(async (req, res) => {
  const userId = req.user && req.user.id;
  const sessionId = req.sessionId;

  if (userId) {
    const cart = await Cart.clearCart(userId);
    return res
      .status(200)
      .json({ message: "Cart cleared", cart, type: "user" });
  }

  const cart = await GuestCart.clearCart(sessionId);
  return res
    .status(200)
    .json({ message: "Cart cleared", cart, type: "guest", sessionId });
});

module.exports = {
  getCart,
  addItem,
  updateItemQuantity,
  removeItem,
  clearCart,
};
