const express = require("express");
const asyncHandler = require("express-async-handler");
const Cart = require("../models/CartItem");
const Product = require("../models/productModel");
const ProductVariant = require("../models/variantsModel");
const { addToCartSchema, getCartSchema } = require("../validations/cartValidation");

const router = express.Router();

// ==========================
// 🧾 GET CART
// ==========================
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { error, value } = getCartSchema.validate(req.query);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { userId, sessionId } = value;
    const findCriteria = userId ? { userId } : { sessionId };

    const cart = await Cart.findOne(findCriteria)
      .populate({
        path: "items.productId",
        select: "title price slug",
      })
      .populate({
        path: "items.variantId",
        select: "color images",
        transform: (doc) => {
          if (!doc) return doc;
          return {
            ...doc.toObject(),
            images: doc.images?.length ? [doc.images[0]] : [],
          };
        },
      });

    res.status(200).json({
      message: "Cart fetched successfully",
      cart: cart || { items: [], subtotal: 0, totalItems: 0 },
    });
  })
);

// ==========================
// ➕ ADD TO CART
// ==========================
router.post(
  "/add",
  asyncHandler(async (req, res) => {
    const { error, value } = addToCartSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { productId, variantId, size, quantity, sessionId } = value;
    const userId = req.user ? req.user.id : null;

    if (!sessionId && !userId) {
      return res.status(400).json({
        message: "Authentication required: userId or sessionId must exist.",
      });
    }

    const [product, variant] = await Promise.all([
      Product.findById(productId).select("price"),
      ProductVariant.findById(variantId).select("sizes"),
    ]);

    if (!product || !variant) {
      return res.status(404).json({ message: "Product or Variant not found." });
    }

    const sizeInfo = variant.sizes.find((s) => s.size === size);
    if (!sizeInfo) {
      return res
        .status(400)
        .json({ message: `Size ${size} is not available for this variant.` });
    }

    const isAvailable = sizeInfo.stock > 0;
    const cartKey = userId ? { userId } : { sessionId };

    let cart = await Cart.findOneAndUpdate(
      cartKey,
      { $setOnInsert: { ...cartKey, sessionId, items: [] } },
      { new: true, upsert: true }
    );

    const existingIndex = cart.items.findIndex(
      (item) =>
        item.productId.toString() === productId &&
        item.variantId.toString() === variantId &&
        item.size === size
    );

    if (existingIndex > -1) {
      cart.items[existingIndex].quantity += quantity;
    } else {
      cart.items.push({
        productId,
        variantId,
        size,
        quantity,
        price: product.price,
        isAvailable,
      });
    }

    await cart.save();

    res.status(201).json({
      message: "Product added to cart successfully.",
      cart,
    });
  })
);

/**
 * @desc    Delete a specific item from the cart or delete the entire cart
 * @route   DELETE /api/v1/cart
 * @access  Public (uses sessionId) or Private (uses userId)
 * * @body    { variantId, size } : لحذف عنصر محدد
 * @body    { deleteAll: true } : لحذف السلة بالكامل
 */
router.delete(
  "/",
  asyncHandler(async (req, res) => {
    const { variantId, size, deleteAll, sessionId } = req.body;
    const userId = req.user ? req.user.id : null; // 1. تحديد مفتاح السلة (Find Cart Key)

    const cartKey = userId ? { userId } : { sessionId }; // يجب التحقق من وجود مفتاح البحث
    if (Object.keys(cartKey).length === 0) {
      res.status(400);
      throw new Error("Authentication (userId) or sessionId required.");
    } // 2. البحث عن السلة

    const cart = await Cart.findOne(cartKey);

    if (!cart) {
      return res.status(404).json({ message: "Cart not found." });
    } // ------------------------------------ // A. حالة حذف السلة بالكامل (Delete All) // ------------------------------------

    if (deleteAll) {
      await Cart.deleteOne(cartKey);

      return res.status(200).json({
        message: "Cart successfully deleted.",
        deleted: true,
      });
    } // ------------------------------------ // B. حالة حذف عنصر محدد (Delete Item) // ------------------------------------ // التحقق من المتطلبات

    if (!variantId || !size) {
      res.status(400);
      throw new Error(
        "variantId and size are required to delete a specific item."
      );
    } // إزالة العنصر من مصفوفة items

    const initialLength = cart.items.length;
    cart.items = cart.items.filter(
      (item) => !(item.variantId.toString() === variantId && item.size === size)
    ); // التحقق إذا تم حذف أي عنصر

    if (cart.items.length === initialLength) {
      return res.status(404).json({ message: "Item not found in cart." });
    } // 3. حفظ السلة بعد الحذف // (يجب أن يتم تفعيل pre('save') middleware لحساب subtotal و totalItems قبل الحفظ)

    await cart.save();

    res.status(200).json({
      message: "Item removed from cart successfully.",
      cart,
    });
  })
);

//

router.put(
  "/",
  asyncHandler(async (req, res) => {
    const { variantId, size, quantity, sessionId } = req.body;
    const userId = req.user ? req.user.id : null;

    // 1️⃣ تحديد مفتاح السلة (User أو Session)
    const cartKey = userId ? { userId } : { sessionId };
    if (Object.keys(cartKey).length === 0) {
      res.status(400);
      throw new Error("Authentication (userId) or sessionId required.");
    }

    // 2️⃣ البحث عن السلة
    const cart = await Cart.findOne(cartKey);
    if (!cart) {
      return res.status(404).json({ message: "Cart not found." });
    }

    // 3️⃣ البحث عن العنصر داخل السلة
    const itemIndex = cart.items.findIndex(
      (item) => item.variantId.toString() === variantId && item.size === size
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: "Item not found in cart." });
    }

    // 4️⃣ التحقق من القيمة الجديدة للكمية
    if (quantity <= 0) {
      // حذف العنصر بدل الكمية 0
      cart.items.splice(itemIndex, 1);
    } else {
      // تحديث الكمية
      cart.items[itemIndex].quantity = quantity;
    }

    // 5️⃣ حفظ السلة بعد التعديل
    await cart.save();

    res.status(200).json({
      message: "Cart updated successfully.",
      cart,
    });
  })
);

module.exports = router;
