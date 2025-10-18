// routes/checkout.js
const express = require("express");
const router = express.Router();
const asyncHandler = require("express-async-handler");

const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const Cart = require("../models/CartItem");
const Order = require("../models/Order");

// router.post("/create-order", async (req, res) => {
//   try {
//     const { sessionId } = req.body;

//     if (!sessionId) {
//       return res.status(400).json({ error: "Session ID is required" });
//     }

//     // 🛒 جلب بيانات الكارت بالـ sessionId
//     const cart = await Cart.findOne({ sessionId })
//       .populate({
//         path: "items.productId",
//         select: "title price slug",
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
//       });

//     if (!cart || !cart.items.length) {
//       return res.status(400).json({ error: "Cart is empty or not found" });
//     }

//     // 🧾 إنشاء order أولاً (status pending)
//     const order = new Order({
//       sessionId,
//       items: cart.items,
//       totalAmount: cart.subtotal,
//       status: "pending",
//       subtotal: cart.subtotal,
//       total: cart.subtotal + 50,
//     });

//     await order.save();

//     // 🧮 إعداد عناصر Stripe
//     const line_items = cart.items.map((item) => ({
//       price_data: {
//         currency: "egp",
//         product_data: {
//           name: item.productId?.title || "Unknown Product",
//           description: `Color: ${item.variantId?.color?.name} | Size: ${item.size}`,
//           images: [item.variantId?.images?.[0]?.url || ""],
//         },
//         unit_amount: Math.round(item.price * 100),
//       },
//       quantity: item.quantity,
//     }));

//     // 💳 إنشاء Stripe session باستخدام orderId الحقيقي
//     const session = await stripe.checkout.sessions.create({
//       payment_method_types: ["card"],
//       line_items,
//       mode: "payment",
//       success_url: `${process.env.CLIENT_URL}/checkout/success?orderId=${order._id}`,
//       cancel_url: `${process.env.CLIENT_URL}/checkout/cancel`,
//     });

//     // 🔗 حفظ stripeSessionId جوّه الـ order
//     order.stripeSessionId = session.id;
//     await order.save();

//     res.json({ url: session.url });
//   } catch (error) {
//     console.error("❌ Error creating order:", error);
//     res.status(500).json({ error: "Failed to create order" });
//   }
// });

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


router.get("/orders/analytics", async (req, res) => {
  try {
    const { range } = req.query; // "day" | "week" | "month" | "year"

    const now = new Date();
    let startDate;

    switch (range) {
      case "day":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(0); // كل الوقت
    }

    // 📊 إجماليات عامة
    const generalStats = await Order.aggregate([
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

    // 📈 الإيرادات حسب التاريخ للفترة المختارة
    const revenueTrend = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: "paid",
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          totalRevenue: { $sum: "$total" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({ ...totals, revenueTrend });
  } catch (error) {
    console.error("❌ Analytics Error:", error);
    res.status(500).json({ error: "Failed to get analytics" });
  }
});


module.exports = router;
