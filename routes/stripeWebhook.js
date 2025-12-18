// const express = require("express");
// const Stripe = require("stripe");
// const bodyParser = require("body-parser");
// const Order = require("../models/order");
// const ProductVariant = require("../models/productVariant");
// const Product = require("../models/product");

// const router = express.Router();
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
// const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// router.post(
//   "/",
//   bodyParser.raw({ type: "application/json" }),
//   async (req, res) => {
//     const sig = req.headers["stripe-signature"];
//     let event;

//     try {
//       event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
//     } catch (err) {
//       console.error("❌ Webhook signature verification failed:", err.message);
//       return res.status(400).send(`Webhook Error: ${err.message}`);
//     }

//     // ✅ عند نجاح الدفع
//     if (event.type === "checkout.session.completed") {
//       const session = event.data.object;
//       const orderId = session.metadata?.orderId;

//       try {
//         const order = await Order.findById(orderId);

//         if (!order) {
//           console.error("⚠️ Order not found:", orderId);
//           return res.sendStatus(404);
//         }

//         // 🟢 تحديث حالة الطلب
//         order.payment = order.payment || {};
//         order.payment.status = "paid";
//         order.isPaid = true;
//         order.paidAt = new Date();
//         order.status = "processing";
//         await order.save();

//         // 📦 خصم الـ stock + 📈 تحديث مشتريات المنتج
//         for (const item of order.items) {
//           if (item.variant) {
//             await ProductVariant.updateOne(
//               { _id: item.variant, "sizes.size": item.size },
//               { $inc: { "sizes.$.stock": -item.quantity } }
//             );
//           }
//           if (item.product) {
//             await Product.updateOne(
//               { _id: item.product },
//               { $inc: { purchases: item.quantity, totalStock: -item.quantity } }
//             );
//           }
//         }

//         console.log("✅ Stock updated successfully for order:", order._id);
//         res.sendStatus(200);
//       } catch (err) {
//         console.error("❌ Error updating stock:", err);
//         res.sendStatus(500);
//       }
//     } else {
//       res.sendStatus(200);
//     }
//   }
// );

// module.exports = router;

// const express = require("express");
// const Stripe = require("stripe");
// const bodyParser = require("body-parser");
// const mongoose = require("mongoose"); // تم إضافته لدعم الـ Transactions
// const Order = require("../models/order");
// const ProductVariant = require("../models/productVariant");
// const Product = require("../models/product");

// const router = express.Router();
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
// const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// router.post(
//   "/",
//   bodyParser.raw({ type: "application/json" }),
//   async (req, res) => {
//     const sig = req.headers["stripe-signature"];
//     let event;

//     // 1. التحقق من صحة الـ Webhook Signature
//     try {
//       event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
//     } catch (err) {
//       console.error("❌ Webhook signature verification failed:", err.message);
//       return res.status(400).send(`Webhook Error: ${err.message}`);
//     }

//     // 2. معالجة حدث نجاح الدفع فقط
//     if (event.type === "checkout.session.completed") {
//       const session = event.data.object;
//       const orderId = session.metadata?.orderId;

//       // بدء عملية Transaction لضمان تنفيذ كل التعديلات أو تراجعها بالكامل في حال الخطأ
//       const dbSession = await mongoose.startSession();
//       dbSession.startTransaction();

//       try {
//         // جلب الطلب مع ربطه بالجلسة الحالية
//         const order = await Order.findById(orderId).session(dbSession);

//         if (!order) {
//           console.error("⚠️ Order not found:", orderId);
//           await dbSession.abortTransaction();
//           return res.sendStatus(404);
//         }

//         // 🛑 حماية من التكرار (Idempotency Check)
//         if (order.isPaid) {
//           console.log("ℹ️ Order already processed and marked as paid.");
//           await dbSession.abortTransaction();
//           dbSession.endSession();
//           return res.sendStatus(200);
//         }

//         // 🟢 تحديث بيانات الدفع والطلب
//         order.payment = {
//           method: "card",
//           status: "paid",
//           transactionId: session.payment_intent, // تخزين معرف العملية للرجوع إليه
//         };
//         order.isPaid = true;
//         order.paidAt = new Date();
//         order.status = "processing";

//         await order.save({ session: dbSession });

//         // 📦 تحديث المخزون (Stock) والمبيعات
//         for (const item of order.items) {
//           if (item.variant) {
//             // خصم الكمية من الـ Variant مع التأكد من وجود مخزون كافٍ ($gte)
//             const variantUpdate = await ProductVariant.updateOne(
//               {
//                 _id: item.variant,
//                 "sizes.size": item.size,
//                 "sizes.stock": { $gte: item.quantity }, // شرط لضمان عدم النزول تحت الصفر
//               },
//               { $inc: { "sizes.$.stock": -item.quantity } },
//               { session: dbSession }
//             );

//             if (variantUpdate.modifiedCount === 0) {
//               throw new Error(
//                 `Insufficient stock for variant ${item.variant} size ${item.size}`
//               );
//             }
//           }

//           if (item.product) {
//             // تحديث إحصائيات المنتج الرئيسي
//             await Product.updateOne(
//               { _id: item.product },
//               {
//                 $inc: { purchases: item.quantity, totalStock: -item.quantity },
//               },
//               { session: dbSession }
//             );
//           }
//         }

//         // تنفيذ كل التغييرات في قاعدة البيانات
//         await dbSession.commitTransaction();
//         console.log(
//           "✅ Order marked as paid and stock updated for:",
//           order._id
//         );
//         res.sendStatus(200);
//       } catch (err) {
//         // في حال حدوث أي خطأ، يتم إلغاء كل ما تم تنفيذه داخل الـ Transaction
//         await dbSession.abortTransaction();
//         console.error(
//           "❌ Transaction failed, all changes rolled back:",
//           err.message
//         );
//         res.status(500).send("Internal Server Error during order processing");
//       } finally {
//         dbSession.endSession();
//       }
//     } else {
//       // إرسال 200 لأي أحداث أخرى لا نهتم بها حالياً
//       res.sendStatus(200);
//     }
//   }
// );

// module.exports = router;

// const express = require("express");
// const Stripe = require("stripe");
// const bodyParser = require("body-parser");
// const mongoose = require("mongoose");
// const Order = require("../models/order");
// const ProductVariant = require("../models/productVariant");
// const Product = require("../models/product");
// const Cart = require("../models/cart"); // Import Cart to clear it

// const router = express.Router();
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
// const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// router.post(
//   "/",
//   bodyParser.raw({ type: "application/json" }),
//   async (req, res) => {
//     const sig = req.headers["stripe-signature"];
//     let event;

//     // 1. Verify Webhook Signature
//     try {
//       event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
//     } catch (err) {
//       console.error("❌ Webhook signature verification failed:", err.message);
//       return res.status(400).send(`Webhook Error: ${err.message}`);
//     }

//     // 2. Process Checkout Completed Event
//     if (event.type === "checkout.session.completed") {
//       const session = event.data.object;
//       const orderId = session.metadata?.orderId;

//       const dbSession = await mongoose.startSession();
//       dbSession.startTransaction();

//       try {
//         const order = await Order.findById(orderId).session(dbSession);

//         if (!order) {
//           console.error("⚠️ Order not found in database:", orderId);
//           await dbSession.abortTransaction();
//           return res.sendStatus(404);
//         }

//         // 🛑 Idempotency Check: Avoid processing the same order twice
//         if (order.isPaid) {
//           console.log(
//             "ℹ️ Order already processed and marked as paid:",
//             orderId
//           );
//           await dbSession.abortTransaction();
//           dbSession.endSession();
//           return res.sendStatus(200);
//         }

//         // 🟢 Update Order Payment Status
//         order.payment = {
//           method: "card",
//           status: "paid",
//           transactionId: session.payment_intent,
//         };
//         order.isPaid = true;
//         order.paidAt = new Date();
//         order.status = "processing";

//         await order.save({ session: dbSession });

//         // 📦 Update Stock and Purchases
//         for (const item of order.items) {
//           if (item.variant) {
//             const variantUpdate = await ProductVariant.updateOne(
//               {
//                 _id: item.variant,
//                 "sizes.size": item.size,
//                 "sizes.stock": { $gte: item.quantity },
//               },
//               { $inc: { "sizes.$.stock": -item.quantity } },
//               { session: dbSession }
//             );

//             if (variantUpdate.modifiedCount === 0) {
//               throw new Error(
//                 `Insufficient stock for variant ${item.variant} size ${item.size}`
//               );
//             }
//           }

//           if (item.product) {
//             await Product.updateOne(
//               { _id: item.product },
//               {
//                 $inc: { purchases: item.quantity, totalStock: -item.quantity },
//               },
//               { session: dbSession }
//             );
//           }
//         }

//         // ✨ NEW: Clear User's Cart after successful payment
//         await Cart.findOneAndUpdate(
//           { user: order.user },
//           { $set: { items: [], isActive: true } },
//           { session: dbSession }
//         );

//         await dbSession.commitTransaction();
//         console.log(
//           "✅ Success: Stock updated and cart cleared for order:",
//           order._id
//         );
//         res.sendStatus(200);
//       } catch (err) {
//         await dbSession.abortTransaction();
//         console.error("❌ Processing Error (Rolling Back):", err.message);
//         res.status(500).send("Internal Server Error during order processing");
//       } finally {
//         dbSession.endSession();
//       }
//     } else {
//       res.sendStatus(200);
//     }
//   }
// );

// module.exports = router;

// new

const express = require("express");
const Stripe = require("stripe");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const Order = require("../models/order");
const ProductVariant = require("../models/productVariant");
const Product = require("../models/product");
const Cart = require("../models/cart");
const sendOrderEmail = require("../utils/sendEmail"); // استيراد خدمة الإيميل

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

router.post(
  "/",
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    // 1. Verify Webhook Signature
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error("❌ Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // 2. Process Checkout Completed Event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;

      const dbSession = await mongoose.startSession();
      dbSession.startTransaction();

      try {
        const order = await Order.findById(orderId).session(dbSession);

        if (!order) {
          console.error("⚠️ Order not found in database:", orderId);
          await dbSession.abortTransaction();
          return res.sendStatus(404);
        }

        // 🛑 Idempotency Check: Avoid double processing
        if (order.isPaid) {
          console.log("ℹ️ Order already processed:", orderId);
          await dbSession.abortTransaction();
          dbSession.endSession();
          return res.sendStatus(200);
        }

        // 🟢 Update Order Payment Status
        order.payment = {
          method: "card",
          status: "paid",
          transactionId: session.payment_intent,
          amount_paid: session.amount_total / 100, // حفظ المبلغ المدفع فعلياً
        };
        order.isPaid = true;
        order.paidAt = new Date();
        order.status = "processing";

        await order.save({ session: dbSession });

        // 📦 Update Stock and Purchases
        for (const item of order.items) {
          if (item.variant) {
            const variantUpdate = await ProductVariant.updateOne(
              {
                _id: item.variant,
                "sizes.size": item.size,
                "sizes.stock": { $gte: item.quantity },
              },
              { $inc: { "sizes.$.stock": -item.quantity } },
              { session: dbSession }
            );

            if (variantUpdate.modifiedCount === 0) {
              throw new Error(`Insufficient stock for variant ${item.variant}`);
            }
          }

          if (item.product) {
            await Product.updateOne(
              { _id: item.product },
              {
                $inc: { purchases: item.quantity, totalStock: -item.quantity },
              },
              { session: dbSession }
            );
          }
        }

        // ✨ Clear User's Cart
        await Cart.findOneAndUpdate(
          { user: order.user },
          { $set: { items: [], isActive: true } },
          { session: dbSession }
        );

        // تأكيد كل العمليات في قاعدة البيانات
        await dbSession.commitTransaction();
        dbSession.endSession();

        console.log("✅ DB Updated successfully for order:", order._id);

        // 📧 3. Send Confirmation Email (After DB Success)
        try {
          const customerEmail = session.customer_details.email;
          await sendOrderEmail(customerEmail, order);
          console.log("📧 Confirmation email sent to:", customerEmail);
        } catch (emailErr) {
          console.error(
            "❌ Email failed (Order still valid):",
            emailErr.message
          );
        }

        res.sendStatus(200);
      } catch (err) {
        if (dbSession.inAtomicityStatus !== "COMMITTED") {
          await dbSession.abortTransaction();
          dbSession.endSession();
        }
        console.error("❌ Processing Error (Rolling Back):", err.message);
        res.status(500).send("Internal Server Error");
      }
    } else {
      res.sendStatus(200);
    }
  }
);

module.exports = router;
