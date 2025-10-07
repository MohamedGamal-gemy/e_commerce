const express = require("express");
const asyncHandler = require("express-async-handler");
const Cart = require("../models/CartItem");
const { Product } = require("../models/productModel");
const ProductVariant = require("../models/variantsModel");

const router = express.Router();

// 🧱 GET /cart

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { userId, sessionId } = req.query;

    if (!userId && !sessionId)
      return res.status(400).json({ message: "userId or sessionId required" });

    const cart = await Cart.findOne({
      $or: [{ userId }, { sessionId }],
    })
      .populate({
        path: "items.productId",
        select: "title price slug",
      })
      .populate({
        path: "items.variantId",
        select: "color images ",
        transform: (doc) => {
          if (!doc) return doc;
          doc.images = doc.images?.length ? [doc.images[0]] : [];
          return doc;
        },
      });

    res.json(cart || { items: [] });
  })
);
//
// POST /api/cart
// @desc    إضافة منتج جديد لسلة التسوق أو زيادة كميته
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { userId, sessionId } = req.query; // لتحديد السلة
    const { productId, variantId, size, quantity } = req.body; // بيانات المنتج المراد إضافته

    // 1. التحقق من وجود userId أو sessionId
    if (!userId && !sessionId) {
      return res.status(400).json({ message: "userId or sessionId required" });
    }

    // 2. جلب تفاصيل المنتج (السعر الأصلي، السعر الحالي، حالة التوفر)
    // تحتاج لاستيراد موديل Product هنا
    const product = await Product.findById(productId).select("price");

    // if (!product || !product.isAvailable) {
    if (!product ) {
      return res
        .status(404)
        .json({ message: "Product not found or currently unavailable." });
    }

    // 3. البحث عن السلة الحالية
    let cart = await Cart.findOne({ $or: [{ userId }, { sessionId }] });

    // 4. إذا لم توجد سلة، قم بإنشاء واحدة جديدة
    if (!cart) {
      cart = new Cart({
        userId: userId || null,
        sessionId: sessionId || null,
        items: [],
      });
    }

    // 5. التحقق مما إذا كان المنتج (بكل تفاصيله) موجوداً بالفعل في السلة
    const existingItemIndex = cart.items.findIndex(
      (item) =>
        item.productId.toString() === productId &&
        item.variantId.toString() === variantId &&
        item.size === size
    );

    if (existingItemIndex > -1) {
      // المنتج موجود: قم بزيادة الكمية
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      // المنتج غير موجود: قم بإضافته كعنصر جديد
      cart.items.push({
        productId,
        variantId,
        size,
        quantity,
        // 🔥 المنطق الحاسم: تخزين السعر هنا
        price: product.price,
        originalPrice: product.originalPrice,
      });
    }

    // 6. حفظ السلة (سيتم تشغيل الـ pre('save') middleware لحساب subtotal و totalItems)
    await cart.save();

    // 7. جلب السلة بالـ population الكامل للرد على المستخدم
    const populatedCart = await Cart.findById(cart._id)
      .populate({ path: "items.productId", select: "title slug" })
      .populate({
        path: "items.variantId",
        select: "color images ",
        transform: (doc) => {
          /* منطق جلب صورة واحدة */ return doc;
        },
      });

    res.status(200).json(populatedCart);
  })
);
//
// ➕ POST /cart/add — إضافة منتج للكارت
//
router.post(
  "/add",
  asyncHandler(async (req, res) => {
    const {
      userId,
      sessionId,
      productId,
      variantId,
      size,
      quantity = 1,
    } = req.body;

    if (!userId && !sessionId)
      return res.status(400).json({ message: "userId or sessionId required" });

    if (!productId || !variantId || !size)
      return res.status(400).json({ message: "Missing required fields" });

    console.log(req.body);
    // ✅ تحقق من المنتج
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // ✅ تحقق من الـ variant
    const variant = await ProductVariant.findById(variantId);
    if (!variant) return res.status(404).json({ message: "Variant not found" });

    // ✅ تحقق من المخزون
    const sizeData = variant.sizes.find((s) => s.size === size);
    if (!sizeData)
      return res.status(400).json({ message: `Size ${size} not found` });

    if (sizeData.stock < quantity)
      return res
        .status(400)
        .json({ message: "Not enough stock for this size" });

    // ✅ ابحث عن الكارت (بناءً على userId أو sessionId)
    let cart = await Cart.findOne({
      $or: [{ userId }, { sessionId }],
    });

    if (!cart) {
      cart = new Cart({ userId, sessionId, items: [] });
    }

    // ✅ تحقق لو المنتج بنفس الـ variant والمقاس موجود بالفعل
    const existingItem = cart.items.find(
      (item) =>
        item.productId.toString() === productId &&
        item.variantId.toString() === variantId &&
        item.size === size
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({ productId, variantId, size, quantity });
    }

    await cart.save();

    // Populate قبل الإرجاع
    const populatedCart = await Cart.findById(cart._id)
      .populate({
        path: "items.productId",
        select: "title price slug",
      })
      .populate({
        path: "items.variantId",
        select: "color images sizes",
      });

    res.status(201).json(populatedCart);
  })
);
module.exports = router;

// export default router;
