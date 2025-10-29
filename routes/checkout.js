// routes/checkout.js
const express = require("express");
const router = express.Router();
const asyncHandler = require("express-async-handler");

const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const Cart = require("../models/CartItem");
const Order = require("../models/Order");
const { User } = require("../models/userModel");


router.post("/create-order", async (req, res) => {
  try {
    const {
      sessionId,
      userId,
      billingDetails, // 🧾 بيانات العميل
      shipping = 50,
      discount = 0,
    } = req.body;

    if (!sessionId && !userId) {
      return res
        .status(400)
        .json({ error: "Session ID or User ID is required" });
    }

    if (
      !billingDetails ||
      !billingDetails.fullName ||
      !billingDetails.email ||
      !billingDetails.phone ||
      !billingDetails.address
    ) {
      return res.status(400).json({ error: "Billing details are incomplete" });
    }

    // 🛒 جلب بيانات الكارت بالـ sessionId أو userId
    const cart = await Cart.findOne(userId ? { userId } : { sessionId })
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

    if (!cart || !cart.items.length) {
      return res.status(400).json({ error: "Cart is empty or not found" });
    }

    // 🧮 إجمالي السعر
    const subtotal = cart.items.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    );
    const total = subtotal + shipping - discount;

    // 📦 تجهيز عناصر الطلب (snapshot وقت الشراء)
    const orderItems = cart.items.map((item) => ({
      productId: item.productId._id,
      variantId: item.variantId._id,
      size: item.size,
      quantity: item.quantity,
      price: item.price,
      title: item.productId.title,
      image: item.variantId?.images?.[0]?.url || "",
    }));

    // 🧾 إنشاء order أولاً (status pending)
    const order = new Order({
      userId: userId || null,
      sessionId: sessionId || null,
      items: orderItems,
      subtotal,
      shipping,
      discount,
      total,
      billingDetails,
      status: "pending",
      paymentStatus: "unpaid",
      paymentMethod: "stripe",
    });

    await order.save();

    // 💳 إعداد عناصر Stripe
    const line_items = orderItems.map((item) => ({
      price_data: {
        currency: "egp",
        product_data: {
          name: item.title || "Unknown Product",
          description: `Color: ${
            item.variantId?.color?.name || "N/A"
          } | Size: ${item.size}`,
          images: item.image ? [item.image] : [],
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    // 💰 إنشاء Stripe session وربطها بالـ order
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/checkout/success?orderId=${order._id}`,
      cancel_url: `${process.env.CLIENT_URL}/checkout/cancel`,
      metadata: { orderId: order._id.toString() },
    });

    // 🔗 حفظ stripeSessionId جوه الطلب
    order.stripeSessionId = session.id;
    await order.save();

    res.json({ url: session.url });
  } catch (error) {
    console.error("❌ Error creating order:", error);
    res.status(500).json({ error: "Failed to create order" });
  }
});

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
// admin
// 🛠️ Admin: get all orders
// router.get("/admin/orders", async (req, res) => {
//   try {

//     const orders = await Order.find()
//       .populate({
//         path: "userId",
//         select: "name email",
//       })
//       .populate({
//         path: "items.productId",
//         select: "title price",
//       })
//       .populate({
//         path: "items.variantId",
//         select: "color images",
//         transform: (doc) => {
//           if (!doc) return doc;
//           return {
//             ...doc.toObject(),
//             images: doc.images?.length ? [doc.images[0]] : [],
//           };
//         },
//       })
//       .sort({ createdAt: -1 });

//     res.json({ orders });
//   } catch (error) {
//     console.error("❌ Error fetching admin orders:", error);
//     res.status(500).json({ error: "Failed to fetch admin orders" });
//   }
// });

// desd
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

    // 🔍 بحث بالاسم أو الإيميل أو ID
    if (search) {
      const regex = new RegExp(search, "i");
      filter.$or = [
        { "billingDetails.fullName": regex },
        { "billingDetails.email": regex },
        { _id: search.length === 24 ? search : undefined }, // لو كتب الـ ID كامل
      ].filter(Boolean);
    }

    // 📦 فلترة بالحالة
    if (status && status !== "all") {
      filter.status = status;
    }

    // 🗓️ فلترة بالتاريخ
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = toDate;
      }
    }

    // 💰 فلترة بالسعر
    if (minTotal || maxTotal) {
      filter.total = {};
      if (minTotal) filter.total.$gte = Number(minTotal);
      if (maxTotal) filter.total.$lte = Number(maxTotal);
    }

    // 📄 Pagination
    const skip = (Number(page) - 1) * Number(limit);

    const [orders, totalOrders] = await Promise.all([
      Order.find(filter)
        .populate({
          path: "userId",
          select: "name email",
        })
        .populate({
          path: "items.productId",
          select: "title price",
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
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),

      Order.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalOrders / limit);

    res.json({
      orders,
      totalOrders,
      totalPages,
      currentPage: Number(page),
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

//
/**
 * @route   GET /api/checkout/admin/orders/analytics
 * @desc    Get detailed analytics for orders (dashboard)
 * @query   ?range=month&status=paid
 */
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
//         dateFormat = "%Y-%m-%d %H:00"; // ساعات اليوم
//         break;
//       case "week":
//         startDate = new Date(now);
//         startDate.setDate(now.getDate() - 7);
//         dateFormat = "%Y-%m-%d"; // أيام الأسبوع
//         break;
//       case "month":
//         startDate = new Date(now.getFullYear(), now.getMonth(), 1);
//         dateFormat = "%Y-%m-%d"; // أيام الشهر
//         break;
//       case "year":
//         startDate = new Date(now.getFullYear(), 0, 1);
//         dateFormat = "%Y-%m"; // شهور السنة
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

//     // 🏆 أعلى المنتجات مبيعًا
//     const topProducts = await Order.aggregate([
//       { $unwind: "$items" },
//       {
//         $group: {
//           _id: "$items.productId",
//           totalSold: { $sum: "$items.quantity" },
//           totalRevenue: { $sum: "$items.price" },
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
//       {
//         $unwind: {
//           path: "$product",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//       {
//         $project: {
//           _id: 1,
//           totalSold: 1,
//           totalRevenue: 1,
//           name: "$product.name",
//         },
//       },
//       { $sort: { totalSold: -1 } },
//       { $limit: 5 },
//     ]);

//     // 👥 المستخدمين الجدد خلال نفس الفترة
//     const newUsers = await User.countDocuments({
//       createdAt: { $gte: startDate },
//     });

//     // 📊 مقارنة الفترة السابقة (growth rate)
//     const previousPeriodStart = new Date(startDate);
//     const diffDays = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
//     previousPeriodStart.setDate(previousPeriodStart.getDate() - diffDays);

//     const avgOrderValue =
//       totals.totalOrders > 0
//         ? (totals.totalRevenue / totals.totalOrders).toFixed(2)
//         : 0;

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

//     // ✅ النتيجة النهائية
//     res.json({
//       summary: {
//         ...totals,
//         avgOrderValue: Number(avgOrderValue),
//       },
//       trend: revenueTrend,
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

// router.get("/orders/analytics", async (req, res) => {
//   try {
//     const { range } = req.query; // "day" | "week" | "month" | "year"

//     const now = new Date();
//     let startDate;

//     switch (range) {
//       case "day":
//         startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
//         break;
//       case "week":
//         startDate = new Date(now);
//         startDate.setDate(now.getDate() - 7);
//         break;
//       case "month":
//         startDate = new Date(now.getFullYear(), now.getMonth(), 1);
//         break;
//       case "year":
//         startDate = new Date(now.getFullYear(), 0, 1);
//         break;
//       default:
//         startDate = new Date(0); // كل الوقت
//     }

//     // 📊 إجماليات عامة
//     const generalStats = await Order.aggregate([
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

//     // 📈 الإيرادات حسب التاريخ للفترة المختارة
//     const revenueTrend = await Order.aggregate([
//       {
//         $match: {
//           createdAt: { $gte: startDate },
//           status: "paid",
//         },
//       },
//       {
//         $group: {
//           _id: {
//             $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
//           },
//           totalRevenue: { $sum: "$total" },
//         },
//       },
//       { $sort: { _id: 1 } },
//     ]);

//     res.json({ ...totals, revenueTrend });
//   } catch (error) {
//     console.error("❌ Analytics Error:", error);
//     res.status(500).json({ error: "Failed to get analytics" });
//   }
// });

module.exports = router;
