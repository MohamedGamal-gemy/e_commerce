// routes/checkout.js
const express = require("express");
const router = express.Router();
const asyncHandler = require("express-async-handler");

const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const Cart = require("../models/cart");
const User = require("../models/user");
const GuestCart = require("../models/guestCart");
const Order = require("../models/order");
const ProductVariant = require("../models/productVariant");
const { protect } = require("../middlewares/protect");

router.post(
  "/create-order",
  protect,
  asyncHandler(async (req, res) => {
    try {
      const { billingDetails, shipping = 50, discount = 0 } = req.body;
      const userId = req.user && (req.user.id || req.user._id?.toString());
      const sessionId =
        req.cookies?.sessionId || req.headers["x-session-id"] || null;

      if (
        !billingDetails ||
        !billingDetails.fullName ||
        !billingDetails.email ||
        !billingDetails.phone ||
        !billingDetails.address
      ) {
        return res
          .status(400)
          .json({ error: "Billing details are incomplete" });
      }

      // 🛡️ إجبار تسجيل الدخول للـ checkout (مفروض عبر protect)
      if (!userId) {
        return res.status(401).json({
          code: "NEED_AUTH",
          message: "Authentication required for checkout",
        });
      }

      // 🔀 دمج سلة الضيف (إن وُجدت) إلى سلة المستخدم
      if (sessionId) {
        const guest = await GuestCart.findOne({ sessionId, isActive: true });
        if (guest && Array.isArray(guest.items) && guest.items.length) {
          for (const it of guest.items) {
            await Cart.addItem(userId, {
              product: it.product,
              variant: it.variant,
              size: it.size,
              color: it.color,
              quantity: it.quantity,
              price: it.price,
            });
          }
          // نظّف سلة الضيف بعد الدمج
          await GuestCart.findOneAndUpdate(
            { sessionId },
            { items: [], totalItems: 0, totalPrice: 0 }
          );
        }
      }

      // 🛒 جلب سلة المستخدم بعد الدمج (إن وُجد)
      const cart = await Cart.findOne({ user: userId, isActive: true })
        .populate({ path: "items.product", select: "title price slug" })
        .populate({ path: "items.variant", select: "color images" });

      if (!cart || !cart.items.length) {
        return res.status(400).json({ error: "Cart is empty or not found" });
      }

      // إجمالي السعر
      const subtotal = cart.items.reduce(
        (acc, item) => acc + (item.price || 0) * (item.quantity || 0),
        0
      );
      const total = subtotal + shipping - discount;

      // تجهيز عناصر الطلب (snapshot وقت الشراء)
      const orderItems = cart.items.map((item) => {
        const image =
          Array.isArray(item.variant?.images) && item.variant.images.length
            ? item.variant.images[0].url || item.variant.images[0]
            : "";
        return {
          product: item.product._id,
          variant: item.variant._id,
          size: item.size,
          color: item.variant?.color || undefined,
          quantity: item.quantity,
          price: item.price,
          productSnapshot: {
            title: item.product.title,
            image,
            color: item.variant?.color || undefined,
          },
        };
      });

      // إنشاء order أولاً (status pending)
      const order = new Order({
        user: userId,
        sessionId: userId ? null : sessionId,
        items: orderItems,
        subtotal,
        shippingPrice: shipping,
        discount,
        totalPrice: total,
        billingDetails,
        payment: { method: "card", status: "pending" },
        status: "pending",
      });

      await order.save();

      // إعداد عناصر Stripe
      const line_items = orderItems.map((item) => ({
        price_data: {
          currency: "egp",
          product_data: {
            name: item.productSnapshot?.title || "Unknown Product",
            description: `Size: ${item.size}`,
            images: item.productSnapshot?.image
              ? [item.productSnapshot.image]
              : [],
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      }));

      // إنشاء Stripe session وربطها بالـ order
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items,
        mode: "payment",
        success_url: `${process.env.CLIENT_URL}/checkout/success?orderId=${order._id}`,
        cancel_url: `${process.env.CLIENT_URL}/checkout/cancel`,
        metadata: { orderId: order._id.toString() },
      });

      // حفظ stripeSessionId جوه الطلب
      order.stripeSessionId = session.id;
      await order.save();

      res.json({ url: session.url });
    } catch (error) {
      console.error("❌ Error creating order:", error);
      res.status(500).json({ error: "Failed to create order" });
    }
  })
);

//
router.post("/confirm", async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // ✅ تحديث حالة الطلب
    order.status = "paid";
    await order.save();

    // 🧹 حذف الكارت (اختياري بعد الدفع)
    await Cart.deleteOne({ sessionId: order.sessionId });

    res.json({ success: true, message: "Order confirmed successfully" });
  } catch (err) {
    console.error("❌ Error confirming order:", err.message);
    res.status(500).json({ message: "Internal server error" });
  }
});
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
router.get("/admin/orders", async (req, res) => {
  try {
    const {
      search,
      status,
      from,
      to,
      minTotal,
      maxTotal,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 10));
    const skip = (pageNum - 1) * limitNum;

    // Dates
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = toDate;
      }
    }

    // Totals
    const minT = Number(minTotal);
    const maxT = Number(maxTotal);
    if (!Number.isNaN(minT) || !Number.isNaN(maxT)) {
      filter.totalPrice = {};
      if (!Number.isNaN(minT)) filter.totalPrice.$gte = minT;
      if (!Number.isNaN(maxT)) filter.totalPrice.$lte = maxT;
    }

    // Status
    if (status && status !== "all") filter.status = status;

    // Search (billingDetails + _id + user.name/email)
    if (search) {
      const regex = new RegExp(String(search), "i");
      const or = [
        { "billingDetails.fullName": regex },
        { "billingDetails.email": regex },
      ];
      if (typeof search === "string" && search.length === 24) {
        or.push({ _id: search });
      }

      // Find users matching search to include in OR
      const users = await User.find(
        { $or: [{ name: regex }, { email: regex }] },
        { _id: 1 }
      ).lean();
      if (users.length) {
        or.push({ user: { $in: users.map((u) => u._id) } });
      }

      filter.$or = or;
    }

    const [orders, totalOrders] = await Promise.all([
      Order.find(filter)
        .populate({ path: "user", select: "name email" })
        .populate({ path: "items.product", select: "title price" })
        .populate({
          path: "items.variant",
          select: "color images",
          // transform: (doc) => {
          //   if (!doc) return doc;
          //   const o = doc.toObject();
          //   return { ...o, images: o.images?.length ? [o.images[0]] : [] };
          // },
          transform: (doc) => {
            if (!doc) return doc;
            return {
              ...doc,
              images: doc.images?.length ? [doc.images[0]] : [],
            };
          },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalOrders / limitNum);

    res.json({
      orders,
      totalOrders,
      totalPages,
      currentPage: pageNum,
    });
  } catch (error) {
    console.error("❌ Error fetching admin orders:", error);
    res.status(500).json({ error: "Failed to fetch admin orders" });
  }
});
//
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

router.get("/orders/analytics", async (req, res) => {
  try {
    const { range = "month", status } = req.query;
    const now = new Date();
    let startDate, dateFormat;

    // 🗓️ تحديد النطاق الزمني
    switch (range) {
      case "day":
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        dateFormat = "%Y-%m-%d %H:00";
        break;
      case "week":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        dateFormat = "%Y-%m-%d";
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFormat = "%Y-%m-%d";
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        dateFormat = "%Y-%m";
        break;
      default:
        startDate = new Date(0);
        dateFormat = "%Y-%m-%d";
    }

    // 🧩 الفلاتر الديناميكية
    const matchStage = { createdAt: { $gte: startDate } };
    if (status) matchStage.status = status;

    // 📊 إجماليات عامة
    const generalStats = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalRevenue: { $sum: "$total" },
        },
      },
    ]);

    const totals = {
      totalOrders: 0,
      pending: 0,
      paid: 0,
      cancelled: 0,
      totalRevenue: 0,
    };

    generalStats.forEach((s) => {
      totals.totalOrders += s.count;
      totals.totalRevenue += s.totalRevenue || 0;
      if (s._id === "pending") totals.pending = s.count;
      if (s._id === "paid") totals.paid = s.count;
      if (s._id === "cancelled") totals.cancelled = s.count;
    });

    // 📈 الإيرادات حسب الفترة الزمنية
    const revenueTrend = await Order.aggregate([
      { $match: { ...matchStage, status: "paid" } },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
          totalRevenue: { $sum: "$total" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 📊 توزيع الحالات مع الوقت (optional)
    const ordersTrend = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: dateFormat, date: "$createdAt" } },
            status: "$status",
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.date",
          statuses: {
            $push: {
              status: "$_id.status",
              count: "$count",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          statuses: 1,
        },
      },
      { $sort: { date: 1 } },
    ]);

    // 🏆 أعلى المنتجات مبيعًا (مع الصور)
    const topProducts = await Order.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          totalSold: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.price" },
          variantId: { $first: "$items.variantId" },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $lookup: {
          from: "productvariants",
          localField: "variantId",
          foreignField: "_id",
          as: "variant",
        },
      },
      { $unwind: "$variant" },
      {
        $project: {
          _id: 1,
          totalSold: 1,
          totalRevenue: 1,
          name: "$product.title",
          image: { $arrayElemAt: ["$variant.images", 0] }, // ✅ أول صورة
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
    ]);

    // 👥 المستخدمين الجدد
    const newUsers = await User.countDocuments({
      createdAt: { $gte: startDate },
    });

    // 💹 مقارنة بالفترة السابقة
    const previousPeriodStart = new Date(startDate);
    const diffDays = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
    previousPeriodStart.setDate(previousPeriodStart.getDate() - diffDays);

    const previousRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: previousPeriodStart, $lt: startDate },
          status: "paid",
        },
      },
      {
        $group: { _id: null, total: { $sum: "$total" } },
      },
    ]);

    const growthRate =
      previousRevenue.length > 0
        ? (
            ((totals.totalRevenue - previousRevenue[0].total) /
              previousRevenue[0].total) *
            100
          ).toFixed(2)
        : 0;

    const previousOrders = await Order.countDocuments({
      createdAt: { $gte: previousPeriodStart, $lt: startDate },
      ...(status ? { status } : {}),
    });

    const avgOrderValue =
      totals.totalOrders > 0
        ? (totals.totalRevenue / totals.totalOrders).toFixed(2)
        : 0;

    // ✅ الرد النهائي
    res.json({
      summary: {
        ...totals,
        avgOrderValue: Number(avgOrderValue),
      },
      trend: revenueTrend,
      ordersTrend,
      growthRate: Number(growthRate),
      topProducts,
      newUsers,
    });
  } catch (error) {
    console.error("❌ Analytics Error:", error);
    res.status(500).json({ error: "Failed to get analytics" });
  }
});


module.exports = router;
