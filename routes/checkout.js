// routes/checkout.js
const express = require("express");
const router = express.Router();
const asyncHandler = require("express-async-handler");

const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
// const Cart = require("../models/cart");
const User = require("../models/user");
const Product = require("../models/product");
// const GuestCart = require("../models/guestCart");
const Order = require("../models/order/order.schema");
const ProductVariant = require("../models/productVariant");
const { protect } = require("../middlewares/protect");
const GuestCart = require("../models/GuestCart");
const Cart = require("../models/Cart");

router.post(
  "/create-order",
  // protect,
  asyncHandler(async (req, res) => {
    const {
      billingDetails,
      shipping = 50,
      discount = 0,
      shippingAddress,
    } = req.body;

    const userId = req.user.id || req.user._id;
    // const sessionId = req.cookies?.sessionId || req.headers["x-session-id"];

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
    // if (sessionId) {
    //   const guestCart = await GuestCart.findOne({ sessionId, isActive: true });
    //   if (guestCart?.items?.length) {
    //     for (const item of guestCart.items) {
    //       await Cart.addItem(userId, item);
    //     }
    //     await GuestCart.deleteOne({ sessionId });
    //   }
    // }

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

    res.json(order);
  })
);
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
// done
router.get(
  "/admin/orders",
  asyncHandler(async (req, res) => {
    const { search, status, page = 1, limit = 10 } = req.query;
    const filter = {};
    const pageNum = Math.max(1, Number(page));
    const limitNum = Number(limit);

    if (status && status !== "all") filter.status = status;

    if (search) {
      const regex = new RegExp(String(search), "i");
      filter.$or = [
        { orderNumber: regex },
        { "billingDetails.fullName": regex },
        { "billingDetails.phone": regex },
        { "billingDetails.email": regex },
      ];
    }

    const [orders, totalOrders] = await Promise.all([
      Order.find(filter)
        // .populate("user", "username email")
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
  })
);

//
router.get(
  "/admin/order-stats",
  asyncHandler(async (req, res) => {
    const range = Number(req.query.range) || 7;

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - range);

    const [result] = await Order.aggregate([
      {
        $facet: {
          /* ================= SUMMARY ================= */
          summary: [
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: "$totalPrice" },
                totalOrders: { $sum: 1 },
                pendingShipment: {
                  $sum: {
                    $cond: [{ $in: ["$status", ["paid", "processing"]] }, 1, 0],
                  },
                },
              },
            },
          ],

          /* ================= DAILY SALES ================= */
          dailySales: [
            {
              $match: {
                createdAt: { $gte: fromDate },
                status: { $ne: "cancelled" },
              },
            },
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$createdAt",
                  },
                },
                sales: { $sum: "$totalPrice" },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ],

          /* ================= TOP PRODUCTS ================= */
          topProducts: [
            { $unwind: "$items" },
            { $match: { "items.product": { $ne: null } } },
            {
              $group: {
                _id: "$items.product",
                image: { $first: "$items.productSnapshot.image" },
                title: { $first: "$items.productSnapshot.title" },
                totalSold: { $sum: "$items.quantity" },
                revenue: {
                  $sum: {
                    $multiply: ["$items.price", "$items.quantity"],
                  },
                },
              },
            },
            { $sort: { totalSold: -1 } },
            { $limit: 5 },
          ],
        },
      },
    ]);

    res.json({
      summary: result?.summary?.[0] || {
        totalRevenue: 0,
        totalOrders: 0,
        pendingShipment: 0,
      },
      dailySales: result?.dailySales || [],
      topProducts: result?.topProducts || [],
      meta: {
        range,
        fromDate,
      },
    });
  })
);

router.patch("/admin/orders/:id/status", async (req, res) => {
  const { status, note } = req.body;

  // 1. Validation for allowed statuses
  const validStatuses = [
    "pending",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ];

  if (!validStatuses.includes(status)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid status value" });
  }

  try {
    // 2. Find and Update the order with status history
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        $set: { status },
        $push: {
          statusHistory: {
            status,
            note: note || `Order status updated to ${status}`,
            changedAt: new Date(),
            // actionBy: req.user._id||null, // Assumes admin ID is in req.user
            // actionBy: req.user._id || null, // Assumes admin ID is in req.user
          },
        },
      },
      { new: true }
    ).populate("user", "username email");

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // 3. Automated logic based on status
    if (status === "shipped") {
      order.shippedAt = Date.now();

      // 📧 Trigger Shipping Email Notification
      try {
        await sendOrderEmail(order.billingDetails.email, order, "shipped");
        console.log(`Shipment email sent to: ${order.billingDetails.email}`);
      } catch (mailError) {
        console.error("Mail Error: Status updated but email failed to send.");
      }
    }

    if (status === "delivered") {
      order.deliveredAt = Date.now();
      // You can also update payment status to 'paid' if it's COD
      if (order.payment.method === "cash") {
        order.payment.status = "paid";
      }
    }

    // 4. Save any additional changes (shippedAt/deliveredAt)
    await order.save();

    res.json({
      success: true,
      message: `Order status updated to ${status}`,
      order,
    });
  } catch (error) {
    console.error("Update Status Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.patch("/admin/orders/bulk-status", async (req, res) => {
  try {
    const { orderIds, newStatus, note } = req.body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No order IDs provided" });
    }

    const validStatuses = [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!validStatuses.includes(newStatus)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status value" });
    }

    const bulkUpdate = await Order.updateMany(
      { _id: { $in: orderIds } },
      {
        $set: { status: newStatus },
        $push: {
          statusHistory: {
            status: newStatus,
            changedAt: new Date(),
            note: note || "Bulk update performed by admin",
            // actionBy: req.user._id, // Assumes user is attached via auth middleware
          },
        },
      }
    );

    res.json({
      success: true,
      message: `Successfully updated ${bulkUpdate.modifiedCount} orders to ${newStatus}`,
      data: { modifiedCount: bulkUpdate.modifiedCount },
    });
  } catch (error) {
    console.error("Bulk Update Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});

// router.get(
//   "/inventory/low-stock",
//   asyncHandler(async (req, res) => {
//     const threshold = 5; // You can make this dynamic via query param

//     // Find products where any size variant has stock less than threshold
//     const lowStockProducts = await Product.find({
//       "colors.sizes.stock": { $lt: threshold },
//     }).select("title colors totalStock mainImage");

//     res.json({
//       success: true,
//       count: lowStockProducts.length,
//       data: lowStockProducts,
//     });
//   })
// );

router.get(
  "/inventory/low-stock",
  asyncHandler(async (req, res) => {
    const threshold = Number(req.query.threshold) || 5;

    const data = await Product.aggregate([
      { $unwind: "$colors" },
      { $unwind: "$colors.sizes" },
      {
        $match: {
          "colors.sizes.stock": { $lt: threshold },
        },
      },
      {
        $project: {
          title: 1,
          // mainImage: 1,
          // image: 1,
          color: {
            name: "$colors.name",
            value: "$colors.value",
            image: "$colors.image",
          },
          size: "$colors.sizes.size",
          stock: "$colors.sizes.stock",
        },
      },
      { $sort: { stock: 1 } },
    ]);

    res.json({
      success: true,
      count: data.length,
      data,
    });
  })
);

module.exports = router;
