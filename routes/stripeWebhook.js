const express = require("express");
const Stripe = require("stripe");
const bodyParser = require("body-parser");
const Order = require("../models/order");
const ProductVariant = require("../models/productVariant");
const Product = require("../models/product");

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

router.post(
  "/",
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error("❌ Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // ✅ عند نجاح الدفع
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;

      try {
        const order = await Order.findById(orderId);

        if (!order) {
          console.error("⚠️ Order not found:", orderId);
          return res.sendStatus(404);
        }

        // 🟢 تحديث حالة الطلب
        order.payment = order.payment || {};
        order.payment.status = "paid";
        order.isPaid = true;
        order.paidAt = new Date();
        order.status = "processing";
        await order.save();

        // 📦 خصم الـ stock + 📈 تحديث مشتريات المنتج
        for (const item of order.items) {
          if (item.variant) {
            await ProductVariant.updateOne(
              { _id: item.variant, "sizes.size": item.size },
              { $inc: { "sizes.$.stock": -item.quantity } }
            );
          }
          if (item.product) {
            await Product.updateOne(
              { _id: item.product },
              { $inc: { purchases: item.quantity, totalStock: -item.quantity } }
            );
          }
        }

        console.log("✅ Stock updated successfully for order:", order._id);
        res.sendStatus(200);
      } catch (err) {
        console.error("❌ Error updating stock:", err);
        res.sendStatus(500);
      }
    } else {
      res.sendStatus(200);
    }
  }
);

module.exports = router;
