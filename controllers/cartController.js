const asyncHandler = require("express-async-handler");
const Cart = require("../models/Cart");
const GuestCart = require("../models/GuestCart");
// const GuestCart = require("../models/guestCart");
const Product = require("../models/product");
const ProductVariant = require("../models/productVariant");
// const formatCart = require("../utils/cartFormatter");

// GET: Fetch current cart (user or guest)
// const getCart = asyncHandler(async (req, res) => {
//   const userId = req.user && req.user.id;
//   const sessionId = req.sessionId;

//   const simplifyCart = (cartDoc) => {
//     if (!cartDoc) return null;

//     const simplifiedItems = cartDoc.items.map((item) => {
//       const product = item.product
//         ? {
//             _id: item.product._id,
//             title: item.product.title,
//             slug: item.product.slug,
//             price: item.product.price,
//           }
//         : null;

//       const variant = item.variant
//         ? {
//             _id: item.variant._id,
//             color: item.variant.color,
//             image: item.variant.images?.length ? item.variant.images[0] : null, // 👈 أول صورة فقط
//           }
//         : null;

//       return {
//         product,
//         variant,
//         size: item.size,
//         color: item.color,
//         quantity: item.quantity,
//         price: item.price,
//       };
//     });

//     return {
//       _id: cartDoc._id,
//       sessionId: cartDoc.sessionId,
//       totalItems: simplifiedItems.length,
//       subtotal: simplifiedItems.reduce(
//         (sum, item) => sum + (item.price || 0) * (item.quantity || 0),
//         0
//       ),
//       items: simplifiedItems,
//     };
//   };

//   let cart;
//   if (userId) {
//     cart = await Cart.findOne({ user: userId, isActive: true })
//       .populate({
//         path: "items.product",
//         select: "title slug price",
//       })
//       .populate({
//         path: "items.variant",
//         select: "color images",
//       });
//     return res.status(200).json({
//       type: "user",
//       cart: simplifyCart(cart),
//     });
//   }

//   cart = await GuestCart.findOne({ sessionId, isActive: true })
//     .populate({
//       path: "items.product",
//       select: "title slug price",
//     })
//     .populate({
//       path: "items.variant",
//       select: "color images",
//     });

//   return res.status(200).json({
//     type: "guest",
//     sessionId,
//     cart: simplifyCart(cart),
//   });
// });

// const formatCart = require("../utils/cartFormatter");

// const getCart = asyncHandler(async (req, res) => {
//   const userId = req.user?.id;
//   const sessionId = req.sessionId;

//   const query = userId
//     ? { user: userId, isActive: true }
//     : { sessionId, isActive: true };

//   const Model = userId ? Cart : GuestCart;

//   const cart = await Model.findOne(query)
//     // .populate({
//     //   path: "items.product",
//     //   select: "title slug price",
//     // })
//     // .populate({
//     //   path: "items.variant",
//     //   select: "color images",
//     // })
//     .lean();
//   console.log("cart", cart);

//   return res.status(200).json({
//     type: userId ? "user" : "guest",
//     sessionId,
//     cart: formatCart(cart),
//   });
// });

// const addItem = asyncHandler(async (req, res) => {
//   const { product, variant, size, quantity } = req.body;
//   const userId = req.user?.id;
//   const sessionId = req.sessionId;

//   // 1. Validation (Centralized)
//   if (!product || !variant || !size || !quantity) {
//     return res.status(400).json({ message: "Missing required fields" });
//   }

//   // 2. جلب بيانات السعر والتحقق من التوافر (Single DB Call)
//   const [prodDoc, varDoc] = await Promise.all([
//     Product.findById(product).select("price"),
//     ProductVariant.findById(variant).select("color sizes images"),
//   ]);

//   if (!prodDoc || !varDoc) {
//     return res.status(404).json({ message: "Product not found" });
//   }

//   // التحقق من المقاس
//   const isSizeAvailable = varDoc.sizes.some((s) => s.size === size);
//   if (!isSizeAvailable) {
//     return res.status(400).json({ message: "Size not available" });
//   }

//   // تجهيز البيانات
//   const itemPayload = {
//     product,
//     variant,
//     size,
//     color: varDoc.color?.name || varDoc.color?.value || "",
//     quantity,
//     price: prodDoc.price,
//   };

//   // 3. التنفيذ (Logic Abstraction)
//   const CartModel = userId ? UserCart : GuestCart;
//   const query = userId ? { user: userId } : { sessionId };

//   const updatedCart = await CartModel.addItemToCart(query, itemPayload);

//   // 4. الـ Populate المركزى (Clean)
//   const populatedCart = await updatedCart.populate([
//     { path: "items.product", select: "title slug price" },
//     {
//       path: "items.variant",
//       select: "color images",
//       transform: (doc) =>
//         doc ? { ...doc.toObject(), images: doc.images?.slice(0, 1) } : doc,
//     },
//   ]);

//   return res.status(201).json({
//     message: "Item added successfully",
//     cart: populatedCart,
//     type: userId ? "user" : "guest",
//   });
// });

/**
 * @desc    جلب الكارت الخاص بالمستخدم أو الزائر
 * @route   GET /api/cart
 */
// const getCart = asyncHandler(async (req, res) => {
//   const userId = req.user?.id;
//   const sessionId = req.sessionId;

//   // 1. تحديد نوع الموديل والاستعلام (Query) بناءً على حالة الـ Auth
//   const Model = userId ? UserCart : GuestCart;
//   const query = userId
//     ? { user: userId, isActive: true }
//     : { sessionId, isActive: true };

//   // 2. جلب الكارت مع عمل Populate احترافي
//   // استخدمنا .lean() عشان نرجع Plain JS Object وده بيسرع الطلب جداً
//   const cart = await Model.findOne(query)
//     .populate([
//       {
//         path: "items.product",
//         select: "title slug price thumbnail", // جلب الحقول الأساسية فقط
//       },
//       {
//         path: "items.variant",
//         select: "color images sizes",
//         // الـ transform ده بيضمن إننا نبعت أول صورة فقط عشان نوفر في حجم الداتا
//         transform: (doc) => {
//           if (!doc) return doc;
//           const obj = doc.toObject();
//           return {
//             ...obj,
//             images: obj.images?.length ? [obj.images[0]] : [],
//           };
//         },
//       },
//     ])
//     .lean();

//   // 3. التحقق إذا كان الكارت فارغ أو غير موجود
//   if (!cart) {
//     return res.status(200).json({
//       success: true,
//       message: "Cart is empty",
//       cart: { items: [], totalItems: 0, totalPrice: 0 },
//       type: userId ? "user" : "guest",
//     });
//   }

//   // 4. الرد بالبيانات
//   return res.status(200).json({
//     success: true,
//     type: userId ? "user" : "guest",
//     sessionId: userId ? undefined : sessionId, // بنبعت الـ sessionId للجيست فقط
//     cart: cart,
//   });
// });
const getCart = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const sessionId = req.sessionId;

  const Model = userId ? Cart : GuestCart;
  const query = userId
    ? { user: userId, isActive: true }
    : { sessionId, isActive: true };

  // 1. نفذ الـ Query مع lean بدون transform داخلي
  const cart = await Model.findOne(query)
    .populate([
      { path: "items.product", select: "title slug price thumbnail" },
      { path: "items.variant", select: "color images" },
    ])
    .lean(); // هنا الداتا بتتحول لـ JSON سريع جداً

  if (!cart) {
    return res.status(200).json({ success: true, cart: { items: [] } });
  }

  // 2. اعمل الـ Transform يدوياً على الـ Object (سريع جداً في الذاكرة)
  cart.items = cart.items.map((item) => {
    if (item.variant && item.variant.images) {
      item.variant.images = item.variant.images.slice(0, 1); // خد أول صورة بس
    }
    return item;
  });

  return res.status(200).json({
    success: true,
    type: userId ? "user" : "guest",
    cart,
  });
});
// POST: Add item to cart (user or guest)
// const addItem = asyncHandler(async (req, res) => {
//   const userId = req.user && req.user.id;
//   const sessionId = req.sessionId;

//   const { product, variant, size, quantity } = req.body;
//   if (!product || !variant || !size || !quantity)
//     return res
//       .status(400)
//       .json({ message: "product, variant, size, quantity are required" });

//   const [prodDoc, varDoc] = await Promise.all([
//     Product.findById(product).select("price"),
//     ProductVariant.findById(variant).select("color sizes"),
//   ]);

//   if (!prodDoc || !varDoc)
//     return res.status(404).json({ message: "Product or Variant not found" });

//   const sizeInfo = (varDoc.sizes || []).find((s) => s.size === size);
//   if (!sizeInfo)
//     return res
//       .status(400)
//       .json({ message: `Size ${size} is not available for this variant` });

//   const color =
//     (varDoc.color && (varDoc.color.name || varDoc.color.value)) || "";
//   const price = prodDoc.price;

//   if (userId) {
//     const cart = await Cart.addItem(userId, {
//       product,
//       variant,
//       size,
//       color,
//       quantity,
//       price,
//     });
//     const populatedCart = await Cart.findById(cart._id)
//       .populate({ path: "items.product", select: "title slug price" })
//       .populate({
//         path: "items.variant",
//         select: "color images",
//         transform: (doc) => {
//           if (!doc) return doc;
//           const obj = doc.toObject();
//           return { ...obj, images: obj.images?.length ? [obj.images[0]] : [] };
//         },
//       });
//     return res
//       .status(201)
//       .json({ message: "Item added", cart: populatedCart, type: "user" });
//   }

//   const cart = await GuestCart.addItem(sessionId, {
//     product,
//     variant,
//     size,
//     color,
//     quantity,
//     price,
//   });
//   const populatedCart = await GuestCart.findById(cart._id)
//     .populate({ path: "items.product", select: "title slug price" })
//     .populate({ path: "items.variant", select: "color images" });
//   return res.status(201).json({
//     message: "Item added",
//     cart: populatedCart,
//     type: "guest",
//     sessionId,
//   });
// });

// const addItem = asyncHandler(async (req, res) => {
//   const userId = req.user?.id;
//   const sessionId = req.sessionId;

//   const { productId, variantId, size, quantity } = req.body;
//   if (!productId || !variantId || !size || !quantity)
//     return res.status(400).json({ message: "Missing fields" });

//   const variant = await ProductVariant.findById(variantId).lean();
//   if (!variant) return res.status(404).json({ message: "Variant not found" });

//   const sizeInfo = variant.sizes.find((s) => s.siz e === size);
//   if (!sizeInfo || sizeInfo.stock < quantity)
//     return res.status(400).json({ message: "Out of stock" });

//   const product = await Product.findById(productId)
//     .select("title slug price")
//     .lean();

//   if (!product) return res.status(404).json({ message: "Product not found" });

//   const image = variant.images?.[0]?.url || null;

//   const itemPayload = {
//     productId,
//     variantId,
//     productTitle: product.title,
//     productSlug: product.slug,
//     variantColor: variant.color,
//     image,
//     size,
//     price: product.price,
//     quantity,
//   };

//   const Model = userId ? Cart : GuestCart;
//   const cartKey = userId ? userId : sessionId;

//   const cart = await Model.addItem(cartKey, itemPayload);

//   return res.status(201).json({
//     message: "Item added",
//     type: userId ? "user" : "guest",
//     cart,
//   });
// });

// PATCH: Update item quantity (user or guest)
// const updateItemQuantity = asyncHandler(async (req, res) => {
//   const userId = req.user?.id;
//   const sessionId = req.sessionId;
//   const { variant, size, quantity } = req.body;

//   if (!variant || !size || typeof quantity !== "number") {
//     return res.status(400).json({
//       message: "variant, size, and quantity are required",
//     });
//   }

//   const Model = userId ? Cart : GuestCart;
//   const findKey = userId
//     ? { user: userId, isActive: true }
//     : { sessionId, isActive: true };

//   const cart = await Model.findOne(findKey);
//   if (!cart) return res.status(404).json({ message: "Cart not found" });

//   const index = cart.items.findIndex(
//     (i) => i.variant.toString() === variant.toString() && i.size === size
//     // &&
//     // (!color || i.color === color)
//   );

//   if (index === -1)
//     return res.status(404).json({ message: "Item not found in cart" });

//   // 🔥 لو الكمية <= 0 احذف العنصر
//   if (quantity <= 0) {
//     cart.items.splice(index, 1);
//   } else {
//     cart.items[index].quantity = quantity;
//   }

//   await cart.save();

//   // ✅ Populate خفيف + أول صورة فقط
//   // const populatedCart = await Model.findById(cart._id)
//   //   .populate({
//   //     path: "items.product",
//   //     select: "title slug price",
//   //   })
//   //   .populate({
//   //     path: "items.variant",
//   //     select: "color images",
//   //     transform: (doc) => {
//   //       if (!doc) return doc;
//   //       const obj = doc.toObject();
//   //       return { ...obj, images: obj.images?.length ? [obj.images[0]] : [] };
//   //     },
//   //   })
//   //   .lean(); // مهم لتخفيف الحمل

//   return res.status(200).json({
//     message: "Cart updated successfully",
//     // cart: populatedCart,
//     type: userId ? "user" : "guest",
//   });
// });

/**
 * @desc    إضافة منتج للكارت (يوزر أو جيست) مع تحديث الكمية لو المنتج موجود
 * @route   POST /api/cart/items
 */
const addItem = asyncHandler(async (req, res) => {
  const { product, variant, size, quantity } = req.body;
  const userId = req.user?.id;
  const sessionId = req.sessionId;

  // 1. Validation: التحقق الأساسي من المدخلات
  if (!product || !variant || !size || !quantity) {
    return res.status(400).json({
      success: false,
      message: "Required fields: product, variant, size, quantity",
    });
  }

  // 2. Data Integrity: جلب البيانات من المصدر للتأكد من السعر والتوافر
  // بنستخدم Promise.all عشان الطلبات تتم بالتوازي (Performance)
  const [prodDoc, varDoc] = await Promise.all([
    Product.findById(product).select("price"),
    ProductVariant.findById(variant).select("color sizes images"),
  ]);

  if (!prodDoc || !varDoc) {
    return res
      .status(404)
      .json({ success: false, message: "Product or Variant not found" });
  }

  // 3. Inventory Check: التأكد من وجود المقاس المطلوب
  const isSizeAvailable = varDoc.sizes.some((s) => s.size === size);
  if (!isSizeAvailable) {
    return res
      .status(400)
      .json({ success: false, message: "Requested size is not available" });
  }

  // 4. Payload Preparation: تجهيز الداتا اللي هتتخزن
  const itemPayload = {
    product,
    variant,
    size,
    color: varDoc.color?.name || varDoc.color?.value || "Standard",
    quantity: Number(quantity),
    price: prodDoc.price, // بناخد السعر من الداتابيز مش من الفرونت
  };

  // 5. Execution: اختيار الموديل الصحيح بناءً على حالة المستخدم
  const CartModel = userId ? UserCart : GuestCart;
  const query = userId ? { user: userId } : { sessionId };

  // استدعاء الـ Static Method الموحدة اللي عملناها في الـ Base Schema
  const updatedCart = await CartModel.addItemToCart(query, itemPayload);

  // 6. Response Formatting: الـ Populate الذكي (أول صورة فقط وتخفيف الوزن)
  const populatedCart = await updatedCart.populate([
    {
      path: "items.product",
      select: "title slug price",
    },
    {
      path: "items.variant",
      select: "color images",
      transform: (doc) => {
        if (!doc) return doc;
        const obj = doc.toObject();
        // بنبعت أول صورة فقط عشان نوفر Bandwidth في صفحة الكارت
        return { ...obj, images: obj.images?.slice(0, 1) || [] };
      },
    },
  ]);
  console.log("userId", userId);

  // بنستخدم .lean() أو بنحوله لـ Object عادي لزيادة الأداء قبل الإرسال
  return res.status(201).json({
    success: true,
    message: "Item added to cart",
    type: userId ? "user" : "guest",
    cart: populatedCart,
  });
});

const updateItemQuantity = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const sessionId = req.sessionId;
  const { variant, size, quantity } = req.body;

  // 1. التحقق من البيانات
  if (!variant || !size || typeof quantity !== "number") {
    return res.status(400).json({ message: "Invalid input data" });
  }

  // 2. اختيار الموديل ومفتاح البحث ديناميكياً
  const Model = userId ? Cart : GuestCart;
  const query = userId
    ? { user: userId, isActive: true }
    : { sessionId, isActive: true };

  const cart = await Model.findOne(query);
  if (!cart) return res.status(404).json({ message: "Cart not found" });

  // 3. تحديث أو حذف العنصر
  const itemIndex = cart.items.findIndex(
    (i) => i.variant.toString() === variant.toString() && i.size === size
  );

  if (itemIndex === -1)
    return res.status(404).json({ message: "Item not found" });

  if (quantity <= 0) {
    cart.items.splice(itemIndex, 1);
  } else {
    cart.items[itemIndex].quantity = quantity;
  }

  await cart.save();

  // 4. الـ Populate الاحترافي (أول صورة فقط وخفيف جداً)
  const populatedCart = await Model.findById(cart._id)
    .populate({ path: "items.product", select: "title slug price" })
    .populate({
      path: "items.variant",
      select: "color images",
      transform: (doc) => {
        if (!doc) return doc;
        const obj = doc.toObject();
        // نرسل أول صورة فقط لتقليل حجم الـ JSON
        return { ...obj, images: obj.images?.length ? [obj.images[0]] : [] };
      },
    })
    .lean(); // يحسن الأداء جداً لأنه يرجع Plain JS Object

  return res.status(200).json({
    message: "Cart updated",
    cart: populatedCart,
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
