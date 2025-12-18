// routes/checkout.js
const express = require("express");
const router = express.Router();
const asyncHandler = require("express-async-handler");

const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const Cart = require("../models/cart");
const User = require("../models/user");
const GuestCart = require("../models/guestCart");
const Order = require("../models/order/order.schema");
const ProductVariant = require("../models/productVariant");
const { protect } = require("../middlewares/protect");

// router.post(
//   "/create-order",
//   protect,
//   asyncHandler(async (req, res) => {
//     try {
//       const { billingDetails, shipping = 50, discount = 0 } = req.body;
//       const userId = req.user && (req.user.id || req.user._id?.toString());
//       const sessionId =
//         req.cookies?.sessionId || req.headers["x-session-id"] || null;

//       if (
//         !billingDetails ||
//         !billingDetails.fullName ||
//         !billingDetails.email ||
//         !billingDetails.phone ||
//         !billingDetails.address
//       ) {
//         return res
//           .status(400)
//           .json({ error: "Billing details are incomplete" });
//       }

//       // 🛡️ إجبار تسجيل الدخول للـ checkout (مفروض عبر protect)
//       if (!userId) {
//         return res.status(401).json({
//           code: "NEED_AUTH",
//           message: "Authentication required for checkout",
//         });
//       }

//       // 🔀 دمج سلة الضيف (إن وُجدت) إلى سلة المستخدم
//       if (sessionId) {
//         const guest = await GuestCart.findOne({ sessionId, isActive: true });
//         if (guest && Array.isArray(guest.items) && guest.items.length) {
//           for (const it of guest.items) {
//             await Cart.addItem(userId, {
//               product: it.product,
//               variant: it.variant,
//               size: it.size,
//               color: it.color,
//               quantity: it.quantity,
//               price: it.price,
//             });
//           }
//           // نظّف سلة الضيف بعد الدمج
//           await GuestCart.findOneAndUpdate(
//             { sessionId },
//             { items: [], totalItems: 0, totalPrice: 0 }
//           );
//         }
//       }

//       // 🛒 جلب سلة المستخدم بعد الدمج (إن وُجد)
//       const cart = await Cart.findOne({ user: userId, isActive: true })
//         .populate({ path: "items.product", select: "title price slug" })
//         .populate({ path: "items.variant", select: "color images" });

//       if (!cart || !cart.items.length) {
//         return res.status(400).json({ error: "Cart is empty or not found" });
//       }

//       // إجمالي السعر
//       const subtotal = cart.items.reduce(
//         (acc, item) => acc + (item.price || 0) * (item.quantity || 0),
//         0
//       );
//       const total = subtotal + shipping - discount;

//       // تجهيز عناصر الطلب (snapshot وقت الشراء)
//       const orderItems = cart.items.map((item) => {
//         const image =
//           Array.isArray(item.variant?.images) && item.variant.images.length
//             ? item.variant.images[0].url || item.variant.images[0]
//             : "";
//         return {
//           product: item.product._id,
//           variant: item.variant._id,
//           size: item.size,
//           color: item.variant?.color || undefined,
//           quantity: item.quantity,
//           price: item.price,
//           productSnapshot: {
//             title: item.product.title,
//             image,
//             color: item.variant?.color || undefined,
//           },
//         };
//       });

//       // إنشاء order أولاً (status pending)
//       const order = new Order({
//         user: userId,
//         sessionId: userId ? null : sessionId,
//         items: orderItems,
//         subtotal,
//         shippingPrice: shipping,
//         discount,
//         totalPrice: total,
//         billingDetails,
//         payment: { method: "card", status: "pending" },
//         status: "pending",
//       });

//       await order.save();

//       // إعداد عناصر Stripe
//       const line_items = orderItems.map((item) => ({
//         price_data: {
//           currency: "egp",
//           product_data: {
//             name: item.productSnapshot?.title || "Unknown Product",
//             description: `Size: ${item.size}`,
//             images: item.productSnapshot?.image
//               ? [item.productSnapshot.image]
//               : [],
//           },
//           unit_amount: Math.round(item.price * 100),
//         },
//         quantity: item.quantity,
//       }));

//       // إنشاء Stripe session وربطها بالـ order
//       const session = await stripe.checkout.sessions.create({
//         payment_method_types: ["card"],
//         line_items,
//         mode: "payment",
//         success_url: `${process.env.CLIENT_URL}/checkout/success?orderId=${order._id}`,
//         cancel_url: `${process.env.CLIENT_URL}/checkout/cancel`,
//         metadata: { orderId: order._id.toString() },
//       });

//       // حفظ stripeSessionId جوه الطلب
//       order.stripeSessionId = session.id;
//       await order.save();

//       res.json({ url: session.url });
//     } catch (error) {
//       console.error("❌ Error creating order:", error);
//       res.status(500).json({ error: "Failed to create order" });
//     }
//   })
// );

//
// router.post(
//   "/create-order",
//   protect,
//   asyncHandler(async (req, res) => {
//     const {
//       billingDetails,
//       shipping = 50,
//       discount = 0,
//       shippingAddress,
//     } = req.body;
//     const userId = req.user.id || req.user._id;
//     const sessionId = req.cookies?.sessionId || req.headers["x-session-id"];

//     // 1. التحقق من البيانات الأساسية
//     if (
//       !billingDetails?.fullName ||
//       !billingDetails?.phone ||
//       !billingDetails?.address
//     ) {
//       return res.status(400).json({ error: "بيانات الفواتير غير مكتملة" });
//     }

//     // 2. دمج سلة الضيف تلقائياً في سلة المستخدم المسجل (Logic احترافي)
//     if (sessionId) {
//       const guestCart = await GuestCart.findOne({ sessionId, isActive: true });
//       if (guestCart?.items?.length) {
//         for (const item of guestCart.items) {
//           await Cart.addItem(userId, item);
//         }
//         await GuestCart.deleteOne({ sessionId }); // تنظيف السلة المؤقتة
//       }
//     }

//     // 3. جلب سلة المستخدم النهائية
//     const cart = await Cart.findOne({ user: userId, isActive: true })
//       .populate({ path: "items.product", select: "title price slug" })
//       .populate({ path: "items.variant", select: "color images" });

//     if (!cart || !cart.items.length) {
//       return res
//         .status(400)
//         .json({ error: "السلة فارغة، لا يمكن إتمام الطلب" });
//     }

//     // 4. تجهيز الـ Order Items مع عمل Snapshot كامل
//     const orderItems = cart.items.map((item) => {
//       const variantColor = item.variant?.color || {}; // ضمان أنه Object
//       const mainImg = item.variant?.images?.[0]?.url || "";

//       return {
//         product: item.product._id,
//         variant: item.variant._id,
//         size: item.size,
//         color: {
//           name: variantColor.name || "",
//           value: variantColor.value || "",
//         },
//         quantity: item.quantity,
//         price: item.product.price, // السعر الحالي من الداتابيز وليس السلة
//         productSnapshot: {
//           title: item.product.title,
//           image: mainImg,
//           colorName: variantColor.name || "",
//           colorValue: variantColor.value || "",
//         },
//       };
//     });

//     // 5. إنشاء الطلب (الـ Hooks ستتكفل بحساب المبالغ ورقم الطلب ORD-XXX)
//     const order = new Order({
//       user: userId,
//       items: orderItems,
//       shippingPrice: shipping,
//       discount: discount,
//       billingDetails,
//       shippingAddress: shippingAddress || {}, // إضافة تفاصيل الشحن لو وجدت
//       payment: { method: "card", status: "pending" },
//       status: "pending",
//     });

//     await order.save();

//     // 6. تجهيز Stripe Session
//     const line_items = orderItems.map((item) => ({
//       price_data: {
//         currency: "egp",
//         product_data: {
//           name: item.productSnapshot.title,
//           description: `المقاس: ${item.size} - اللون: ${item.productSnapshot.colorName}`,
//           images: [item.productSnapshot.image],
//         },
//         unit_amount: Math.round(item.price * 100),
//       },
//       quantity: item.quantity,
//     }));

//     const session = await stripe.checkout.sessions.create({
//       payment_method_types: ["card"],
//       line_items,
//       mode: "payment",
//       success_url: `${process.env.CLIENT_URL}/checkout/success?orderId=${order._id}`,
//       cancel_url: `${process.env.CLIENT_URL}/checkout/cancel`,
//       metadata: { orderId: order._id.toString() },
//     });

//     order.stripeSessionId = session.id;
//     await order.save();

//     res.json({ url: session.url, orderNumber: order.orderNumber });
//   })
// );

router.post(
  "/create-order",
  protect,
  asyncHandler(async (req, res) => {
    const {
      billingDetails,
      shipping = 50,
      discount = 0,
      shippingAddress,
    } = req.body;

    const userId = req.user.id || req.user._id;
    const sessionId = req.cookies?.sessionId || req.headers["x-session-id"];

    // 1. Validation (English Messages)
    if (
      !billingDetails?.fullName ||
      !billingDetails?.phone ||
      !billingDetails?.address
    ) {
      return res.status(400).json({
        error:
          "Incomplete billing details. Please provide name, phone, and address.",
      });
    }

    // 2. Merge Guest Cart (Professional Logic)
    if (sessionId) {
      const guestCart = await GuestCart.findOne({ sessionId, isActive: true });
      if (guestCart?.items?.length) {
        for (const item of guestCart.items) {
          await Cart.addItem(userId, item);
        }
        await GuestCart.deleteOne({ sessionId });
      }
    }

    // 3. Fetch User Cart
    const cart = await Cart.findOne({ user: userId, isActive: true })
      .populate({ path: "items.product", select: "title price slug" })
      .populate({ path: "items.variant", select: "color images" });

    if (!cart || !cart.items.length) {
      return res
        .status(400)
        .json({ error: "Your cart is empty. Cannot proceed to checkout." });
    }

    // 4. Prepare Order Items with Snapshot
    const orderItems = cart.items.map((item) => {
      const variantColor = item.variant?.color || {};
      const mainImg = item.variant?.images?.[0]?.url || "";

      return {
        product: item.product._id,
        variant: item.variant._id,
        size: item.size,
        color: {
          name: variantColor.name || "",
          value: variantColor.value || "",
        },
        quantity: item.quantity,
        price: item.product.price, // Live price from DB
        productSnapshot: {
          title: item.product.title,
          image: mainImg,
          colorName: variantColor.name || "",
          colorValue: variantColor.value || "",
        },
      };
    });

    // 5. Create Order
    const order = new Order({
      user: userId,
      items: orderItems,
      shippingPrice: shipping,
      discount: discount,
      billingDetails,
      shippingAddress: shippingAddress || {},
      payment: { method: "card", status: "pending" },
      status: "pending",
    });

    await order.save();

    // 6. Prepare Stripe Session (English Descriptions)
    const line_items = orderItems.map((item) => ({
      price_data: {
        currency: "egp",
        product_data: {
          name: item.productSnapshot.title,
          description: `Size: ${item.size} - Color: ${item.productSnapshot.colorName}`,
          images: item.productSnapshot.image
            ? [item.productSnapshot.image]
            : [],
        },
        unit_amount: Math.round(item.price * 100), // Stripe handles amounts in cents/piastres
      },
      quantity: item.quantity,
    }));

    // Optional: Add shipping as a separate line item if you want it visible in Stripe
    if (shipping > 0) {
      line_items.push({
        price_data: {
          currency: "egp",
          product_data: {
            name: "Shipping Fees",
          },
          unit_amount: Math.round(shipping * 100),
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      customer_email: req.user.email, // Best practice for auto-filling Stripe field
      success_url: `${process.env.CLIENT_URL}/checkout/success?orderId=${order._id}`,
      cancel_url: `${process.env.CLIENT_URL}/checkout/cancel`,
      metadata: { orderId: order._id.toString() },
    });

    order.stripeSessionId = session.id;
    await order.save();

    // 7. Clear or Deactivate Cart after session creation
    // Important: Usually we keep the cart until the payment is CONFIRMED via webhook
    // but we can mark it as "processing" here if your logic requires.

    res.json({ url: session.url, orderNumber: order.orderNumber });
  })
);
//
// جلب بيانات طلب معين بواسطة الـ ID
router.get(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    // 1. البحث عن الطلب في قاعدة البيانات
    const order = await Order.findById(req.params.id);

    // 2. التحقق من وجود الطلب
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // 3. التحقق من أن الطلب يخص المستخدم المسجل حالياً (أمان إضافي)
    if (order.user.toString() !== req.user.id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to view this order" });
    }

    // 4. إرسال بيانات الطلب (هذا هو الـ JSON الذي يحتاجه الفرونت إند)
    res.json(order);
  })
);
//
// router.post("/confirm", async (req, res) => {
//   try {
//     const { orderId } = req.body;

//     const order = await Order.findById(orderId);
//     if (!order) return res.status(404).json({ message: "Order not found" });

//     // ✅ تحديث حالة الطلب
//     order.status = "paid";
//     await order.save();

//     // 🧹 حذف الكارت (اختياري بعد الدفع)
//     await Cart.deleteOne({ sessionId: order.sessionId });

//     res.json({ success: true, message: "Order confirmed successfully" });
//   } catch (err) {
//     console.error("❌ Error confirming order:", err.message);
//     res.status(500).json({ message: "Internal server error" });
//   }
// });
//
// 🧾 Get Orders by sessionId or userId
router.get("/get-orders", async (req, res) => {
  try {
    const { sessionId, userId } = req.query;

    if (!sessionId && !userId) {
      return res.status(400).json({ error: "sessionId or userId is required" });
    }

    // 🎯 تحديد معيار البحث
    const filter = userId ? { userId } : { sessionId };

    // 🔍 جلب الطلبات
    const orders = await Order.find(filter)
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
      })
      .sort({ createdAt: -1 }); // الأحدث أولاً

    if (!orders.length) {
      return res.status(404).json({ message: "No orders found" });
    }

    res.json({ orders });
  } catch (error) {
    console.error("❌ Error fetching orders:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});
// GET /api/checkout/admin/orders
// router.get("/admin/orders", async (req, res) => {
//   try {
//     const {
//       search,
//       status,
//       from,
//       to,
//       minTotal,
//       maxTotal,
//       page = 1,
//       limit = 10,
//     } = req.query;

//     const filter = {};
//     const pageNum = Math.max(1, Number(page) || 1);
//     const limitNum = Math.min(100, Math.max(1, Number(limit) || 10));
//     const skip = (pageNum - 1) * limitNum;

//     // Dates
//     if (from || to) {
//       filter.createdAt = {};
//       if (from) filter.createdAt.$gte = new Date(from);
//       if (to) {
//         const toDate = new Date(to);
//         toDate.setHours(23, 59, 59, 999);
//         filter.createdAt.$lte = toDate;
//       }
//     }

//     // Totals
//     const minT = Number(minTotal);
//     const maxT = Number(maxTotal);
//     if (!Number.isNaN(minT) || !Number.isNaN(maxT)) {
//       filter.totalPrice = {};
//       if (!Number.isNaN(minT)) filter.totalPrice.$gte = minT;
//       if (!Number.isNaN(maxT)) filter.totalPrice.$lte = maxT;
//     }

//     // Status
//     if (status && status !== "all") filter.status = status;

//     // Search (billingDetails + _id + user.name/email)
//     if (search) {
//       const regex = new RegExp(String(search), "i");
//       const or = [
//         { "billingDetails.fullName": regex },
//         { "billingDetails.email": regex },
//       ];
//       if (typeof search === "string" && search.length === 24) {
//         or.push({ _id: search });
//       }

//       // Find users matching search to include in OR
//       const users = await User.find(
//         { $or: [{ name: regex }, { email: regex }] },
//         { _id: 1 }
//       ).lean();
//       if (users.length) {
//         or.push({ user: { $in: users.map((u) => u._id) } });
//       }

//       filter.$or = or;
//     }

//     const [orders, totalOrders] = await Promise.all([
//       Order.find(filter)
//         .populate({ path: "user", select: "name email" })
//         .populate({ path: "items.product", select: "title price" })
//         .populate({
//           path: "items.variant",
//           select: "color images",
//           // transform: (doc) => {
//           //   if (!doc) return doc;
//           //   const o = doc.toObject();
//           //   return { ...o, images: o.images?.length ? [o.images[0]] : [] };
//           // },
//           transform: (doc) => {
//             if (!doc) return doc;
//             return {
//               ...doc,
//               images: doc.images?.length ? [doc.images[0]] : [],
//             };
//           },
//         })
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(limitNum)
//         .lean(),
//       Order.countDocuments(filter),
//     ]);

//     const totalPages = Math.ceil(totalOrders / limitNum);

//     res.json({
//       orders,
//       totalOrders,
//       totalPages,
//       currentPage: pageNum,
//     });
//   } catch (error) {
//     console.error("❌ Error fetching admin orders:", error);
//     res.status(500).json({ error: "Failed to fetch admin orders" });
//   }
// });
//

router.get("/admin/orders", async (req, res) => {
  try {
    const { search, status, page = 1, limit = 10 } = req.query;
    const filter = {};
    const pageNum = Math.max(1, Number(page));
    const limitNum = Number(limit);

    if (status && status !== "all") filter.status = status;

    if (search) {
      const regex = new RegExp(String(search), "i");
      filter.$or = [
        { orderNumber: regex }, // البحث برقم الطلب ORD-XXX
        { "billingDetails.fullName": regex },
        { "billingDetails.phone": regex },
        { "billingDetails.email": regex },
      ];
    }

    const [orders, totalOrders] = await Promise.all([
      Order.find(filter)
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(filter),
    ]);

    res.json({
      orders,
      totalOrders,
      totalPages: Math.ceil(totalOrders / limitNum),
      currentPage: pageNum,
    });
  } catch (error) {
    res.status(500).json({ error: "فشل جلب الطلبات" });
  }
});
//
router.get(
  "/admin/order-stats",
  // protect,
  // admin,
  asyncHandler(async (req, res) => {
    // 1. إحصائيات عامة
    const stats = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalPrice" },
          totalOrders: { $sum: 1 },
          pendingShipment: {
            $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] },
          },
        },
      },
    ]);

    // 2. مبيعات آخر 7 أيام (للـ Chart)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailySales = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo },
          status: { $ne: "cancelled" },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          sales: { $sum: "$totalPrice" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 3. أفضل المنتجات مبيعاً (بناءً على الـ Snapshots)
    const topProducts = await Order.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          title: { $first: "$items.productSnapshot.title" },
          totalSold: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
    ]);

    res.json({
      summary: stats[0] || {
        totalRevenue: 0,
        totalOrders: 0,
        pendingShipment: 0,
      },
      dailySales,
      topProducts,
    });
  })
);
// update status
router.patch("/orders/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = [
      "pending",
      "paid",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!order) return res.status(404).json({ error: "Order not found" });

    res.json({ order });
  } catch (error) {
    console.error("❌ Error updating status:", error);
    res.status(500).json({ error: "Failed to update order status" });
  }
});

// router.get("/orders/analytics", async (req, res) => {
//   try {
//     const { range = "month", status } = req.query;
//     const now = new Date();
//     let startDate, dateFormat;

//     // 🗓️ تحديد النطاق الزمني
//     switch (range) {
//       case "day":
//         startDate = new Date(now);
//         startDate.setHours(0, 0, 0, 0);
//         dateFormat = "%Y-%m-%d %H:00";
//         break;
//       case "week":
//         startDate = new Date(now);
//         startDate.setDate(now.getDate() - 7);
//         dateFormat = "%Y-%m-%d";
//         break;
//       case "month":
//         startDate = new Date(now.getFullYear(), now.getMonth(), 1);
//         dateFormat = "%Y-%m-%d";
//         break;
//       case "year":
//         startDate = new Date(now.getFullYear(), 0, 1);
//         dateFormat = "%Y-%m";
//         break;
//       default:
//         startDate = new Date(0);
//         dateFormat = "%Y-%m-%d";
//     }

//     // 🧩 الفلاتر الديناميكية
//     const matchStage = { createdAt: { $gte: startDate } };
//     if (status) matchStage.status = status;

//     // 📊 إجماليات عامة
//     const generalStats = await Order.aggregate([
//       { $match: matchStage },
//       {
//         $group: {
//           _id: "$status",
//           count: { $sum: 1 },
//           totalRevenue: { $sum: "$total" },
//         },
//       },
//     ]);

//     const totals = {
//       totalOrders: 0,
//       pending: 0,
//       paid: 0,
//       cancelled: 0,
//       totalRevenue: 0,
//     };

//     generalStats.forEach((s) => {
//       totals.totalOrders += s.count;
//       totals.totalRevenue += s.totalRevenue || 0;
//       if (s._id === "pending") totals.pending = s.count;
//       if (s._id === "paid") totals.paid = s.count;
//       if (s._id === "cancelled") totals.cancelled = s.count;
//     });

//     // 📈 الإيرادات حسب الفترة الزمنية
//     const revenueTrend = await Order.aggregate([
//       { $match: { ...matchStage, status: "paid" } },
//       {
//         $group: {
//           _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
//           totalRevenue: { $sum: "$total" },
//         },
//       },
//       { $sort: { _id: 1 } },
//     ]);

//     // 📊 توزيع الحالات مع الوقت (optional)
//     const ordersTrend = await Order.aggregate([
//       { $match: matchStage },
//       {
//         $group: {
//           _id: {
//             date: { $dateToString: { format: dateFormat, date: "$createdAt" } },
//             status: "$status",
//           },
//           count: { $sum: 1 },
//         },
//       },
//       {
//         $group: {
//           _id: "$_id.date",
//           statuses: {
//             $push: {
//               status: "$_id.status",
//               count: "$count",
//             },
//           },
//         },
//       },
//       {
//         $project: {
//           _id: 0,
//           date: "$_id",
//           statuses: 1,
//         },
//       },
//       { $sort: { date: 1 } },
//     ]);

//     // 🏆 أعلى المنتجات مبيعًا (مع الصور)
//     const topProducts = await Order.aggregate([
//       { $unwind: "$items" },
//       {
//         $group: {
//           _id: "$items.productId",
//           totalSold: { $sum: "$items.quantity" },
//           totalRevenue: { $sum: "$items.price" },
//           variantId: { $first: "$items.variantId" },
//         },
//       },
//       {
//         $lookup: {
//           from: "products",
//           localField: "_id",
//           foreignField: "_id",
//           as: "product",
//         },
//       },
//       { $unwind: "$product" },
//       {
//         $lookup: {
//           from: "productvariants",
//           localField: "variantId",
//           foreignField: "_id",
//           as: "variant",
//         },
//       },
//       { $unwind: "$variant" },
//       {
//         $project: {
//           _id: 1,
//           totalSold: 1,
//           totalRevenue: 1,
//           name: "$product.title",
//           image: { $arrayElemAt: ["$variant.images", 0] }, // ✅ أول صورة
//         },
//       },
//       { $sort: { totalSold: -1 } },
//       { $limit: 5 },
//     ]);

//     // 👥 المستخدمين الجدد
//     const newUsers = await User.countDocuments({
//       createdAt: { $gte: startDate },
//     });

//     // 💹 مقارنة بالفترة السابقة
//     const previousPeriodStart = new Date(startDate);
//     const diffDays = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
//     previousPeriodStart.setDate(previousPeriodStart.getDate() - diffDays);

//     const previousRevenue = await Order.aggregate([
//       {
//         $match: {
//           createdAt: { $gte: previousPeriodStart, $lt: startDate },
//           status: "paid",
//         },
//       },
//       {
//         $group: { _id: null, total: { $sum: "$total" } },
//       },
//     ]);

//     const growthRate =
//       previousRevenue.length > 0
//         ? (
//             ((totals.totalRevenue - previousRevenue[0].total) /
//               previousRevenue[0].total) *
//             100
//           ).toFixed(2)
//         : 0;

//     const previousOrders = await Order.countDocuments({
//       createdAt: { $gte: previousPeriodStart, $lt: startDate },
//       ...(status ? { status } : {}),
//     });

//     const avgOrderValue =
//       totals.totalOrders > 0
//         ? (totals.totalRevenue / totals.totalOrders).toFixed(2)
//         : 0;

//     // ✅ الرد النهائي
//     res.json({
//       summary: {
//         ...totals,
//         avgOrderValue: Number(avgOrderValue),
//       },
//       trend: revenueTrend,
//       ordersTrend,
//       growthRate: Number(growthRate),
//       topProducts,
//       newUsers,
//     });
//   } catch (error) {
//     console.error("❌ Analytics Error:", error);
//     res.status(500).json({ error: "Failed to get analytics" });
//   }
// });

router.get("/orders/analytics", async (req, res) => {
  try {
    const { range = "month", status, paymentMethod } = req.query;
    const now = new Date();
    let startDate, dateFormat, groupBy;

    // 🗓️ Time range configuration
    switch (range) {
      case "day":
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        dateFormat = "%Y-%m-%d %H:00";
        groupBy = "hour";
        break;
      case "week":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        dateFormat = "%Y-%m-%d";
        groupBy = "day";
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFormat = "%Y-%m-%d";
        groupBy = "day";
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        dateFormat = "%Y-%m";
        groupBy = "month";
        break;
      default:
        startDate = new Date(0);
        dateFormat = "%Y-%m-%d";
        groupBy = "day";
    }

    // 🧩 Base match conditions
    const matchStage = {
      createdAt: { $gte: startDate },
      ...(status && { status }),
      ...(paymentMethod && { "payment.method": paymentMethod }),
    };

    // 📊 1. General Statistics
    const [generalStats, paymentMethods] = await Promise.all([
      // General order stats
      Order.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalRevenue: { $sum: "$totalPrice" },
            avgOrderValue: { $avg: "$totalPrice" },
            minOrderValue: { $min: "$totalPrice" },
            maxOrderValue: { $max: "$totalPrice" },
          },
        },
      ]),

      // Payment method distribution
      Order.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: "$payment.method",
            count: { $sum: 1 },
            totalAmount: { $sum: "$totalPrice" },
          },
        },
      ]),
    ]);

    // Calculate totals
    const totals = {
      totalOrders: 0,
      totalRevenue: 0,
      avgOrderValue: 0,
      byStatus: {},
      paymentMethods: paymentMethods.reduce((acc, method) => {
        acc[method._id] = {
          count: method.count,
          totalAmount: method.totalAmount,
        };
        return acc;
      }, {}),
    };

    generalStats.forEach((stat) => {
      totals.totalOrders += stat.count;
      totals.totalRevenue += stat.totalRevenue || 0;
      totals.byStatus[stat._id] = {
        count: stat.count,
        totalRevenue: stat.totalRevenue,
        avgOrderValue: stat.avgOrderValue,
        minOrderValue: stat.minOrderValue,
        maxOrderValue: stat.maxOrderValue,
      };
    });

    totals.avgOrderValue =
      totals.totalOrders > 0 ? totals.totalRevenue / totals.totalOrders : 0;

    // 📈 2. Time-based Analytics
    const [revenueTrend, ordersByTime, topProducts, userAcquisition] =
      await Promise.all([
        // Revenue trend
        Order.aggregate([
          { $match: { ...matchStage, "payment.status": "paid" } },
          {
            $group: {
              _id: {
                $dateToString: { format: dateFormat, date: "$createdAt" },
              },
              totalRevenue: { $sum: "$totalPrice" },
              orderCount: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),

        // Orders by time of day
        Order.aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: { $hour: "$createdAt" },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),

        // Top selling products
        Order.aggregate([
          { $match: matchStage },
          { $unwind: "$items" },
          {
            $group: {
              _id: {
                productId: "$items.product",
                variantId: "$items.variant",
                size: "$items.size",
                color: "$items.color",
              },
              name: { $first: "$items.productSnapshot.title" },
              image: { $first: "$items.productSnapshot.image" },
              totalSold: { $sum: "$items.quantity" },
              totalRevenue: {
                $sum: { $multiply: ["$items.quantity", "$items.price"] },
              },
            },
          },
          { $sort: { totalRevenue: -1 } },
          { $limit: 10 },
        ]),

        // User acquisition
        Order.aggregate([
          { $match: matchStage },
          {
            $lookup: {
              from: "users",
              localField: "user",
              foreignField: "_id",
              as: "userData",
            },
          },
          { $unwind: "$userData" },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: dateFormat,
                  date: "$userData.createdAt",
                },
              },
              newUsers: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
      ]);

    // 📊 3. Customer Analytics
    const customerStats = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$user",
          orderCount: { $sum: 1 },
          totalSpent: { $sum: "$totalPrice" },
        },
      },
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
          repeatCustomers: {
            $sum: { $cond: [{ $gt: ["$orderCount", 1] }, 1, 0] },
          },
          avgOrdersPerCustomer: { $avg: "$orderCount" },
          avgCustomerValue: { $avg: "$totalSpent" },
          topSpenders: {
            $push: {
              userId: "$_id",
              orderCount: "$orderCount",
              totalSpent: "$totalSpent",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalCustomers: 1,
          repeatCustomers: 1,
          repeatCustomerRate: {
            $cond: [
              { $eq: ["$totalCustomers", 0] },
              0,
              { $divide: ["$repeatCustomers", "$totalCustomers"] },
            ],
          },
          avgOrdersPerCustomer: 1,
          avgCustomerValue: 1,
          topSpenders: { $slice: ["$topSpenders", 5] },
        },
      },
    ]);

    // 🚚 4. Shipping Analytics
    const shippingStats = await Order.aggregate([
      { $match: { ...matchStage, shippingPrice: { $gt: 0 } } },
      {
        $group: {
          _id: null,
          totalShippingRevenue: { $sum: "$shippingPrice" },
          avgShippingCost: { $avg: "$shippingPrice" },
          byCity: {
            $addToSet: {
              city: "$shippingAddress.city",
              count: { $sum: 1 },
            },
          },
        },
      },
    ]);

    // 📊 5. Discount Analysis
    const discountAnalysis = await Order.aggregate([
      { $match: { ...matchStage, discount: { $gt: 0 } } },
      {
        $group: {
          _id: null,
          totalDiscounts: { $sum: "$discount" },
          avgDiscount: { $avg: "$discount" },
          discountOrders: { $sum: 1 },
          totalDiscountPercentage: {
            $avg: {
              $multiply: [
                {
                  $divide: [
                    "$discount",
                    { $add: ["$totalPrice", "$discount"] },
                  ],
                },
                100,
              ],
            },
          },
        },
      },
    ]);

    // 📈 6. Growth Metrics
    const previousPeriodStart = new Date(startDate);
    const diffTime = now - startDate;
    previousPeriodStart.setTime(previousPeriodStart.getTime() - diffTime);

    const previousPeriodStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: previousPeriodStart, $lt: startDate },
          ...(status && { status }),
          ...(paymentMethod && { "payment.method": paymentMethod }),
        },
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$totalPrice" },
          avgOrderValue: { $avg: "$totalPrice" },
        },
      },
    ]);

    const previousPeriod = previousPeriodStats[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      avgOrderValue: 0,
    };

    const calculateGrowth = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const growthMetrics = {
      ordersGrowth: calculateGrowth(
        totals.totalOrders,
        previousPeriod.totalOrders
      ),
      revenueGrowth: calculateGrowth(
        totals.totalRevenue,
        previousPeriod.totalRevenue
      ),
      aovGrowth: calculateGrowth(
        totals.avgOrderValue,
        previousPeriod.avgOrderValue
      ),
    };

    // ✅ Final Response
    res.json({
      summary: {
        ...totals,
        growth: growthMetrics,
        timeRange: {
          start: startDate,
          end: now,
          range,
          groupBy,
        },
      },
      trends: {
        revenue: revenueTrend,
        ordersByTime,
        userAcquisition,
      },
      products: {
        topSelling: topProducts,
      },
      customers: customerStats[0] || {},
      shipping: shippingStats[0] || {},
      discounts: discountAnalysis[0] || {},
      previousPeriodComparison: {
        current: {
          start: startDate,
          end: now,
          ...totals,
        },
        previous: {
          start: previousPeriodStart,
          end: startDate,
          ...previousPeriod,
        },
      },
    });
  } catch (error) {
    console.error("❌ Analytics Error:", error);
    res.status(500).json({
      error: "Failed to generate analytics",
      details: error.message,
    });
  }
});
module.exports = router;
