// const express = require("express");
// const Stripe = require("stripe");
// const bodyParser = require("body-parser");
// const mongoose = require("mongoose");
// const Order = require("../models/order/order.schema");
// const ProductVariant = require("../models/productVariant");
// const Product = require("../models/product");
// // const Cart = require("../models/cart");
// const Cart = require("../models/Cart");
// const sendOrderEmail = require("../utils/sendEmail"); // استيراد خدمة الإيميل

// const router = express.Router();
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
// const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

// router.post(
//   "/",
//   bodyParser.raw({ type: "application/json" }),
//   async (req, res) => {
//     const sig = req.headers["stripe-signature"];
//     let event;
//     console.log("🔥 Stripe Webhook HIT");

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
//         // const order = await Order.findById(orderId).session(dbSession);
//         const order = await Order.findOne({
//           stripeSessionId: session.id,
//         }).session(dbSession);

//         if (!order) {
//           console.error("⚠️ Order not found in database:", orderId);
//           await dbSession.abortTransaction();
//           return res.sendStatus(404);
//         }

//         // 🛑 Idempotency Check: Avoid double processing
//         if (order.payment?.status === "paid") {
//           console.log("ℹ️ Order already paid, skipping:", order._id);
//           await dbSession.abortTransaction();
//           dbSession.endSession();
//           return res.sendStatus(200);
//         }

//         // 🟢 Update Order Payment Status
//         order.payment = {
//           method: "card",
//           status: "paid",
//           transactionId: session.payment_intent,
//           amount_paid: session.amount_total / 100, // حفظ المبلغ المدفع فعلياً
//         };
//         order.status = "processing";

//         await order.save({ session: dbSession });

//         for (const item of order.items) {
//           if (item.variant) {
//             console.log(
//               `🔄 Processing: Variant ${item.variant}, Size ${item.size}`
//             );

//             // 1️⃣ تحديث الـ Variant (المصدر الأساسي)
//             // نستخدم findOneAndUpdate للحصول على قيمة الـ color.value لاستخدامها في الخطوة التالية
//             const updatedVariant = await ProductVariant.findOneAndUpdate(
//               {
//                 _id: item.variant,
//                 "sizes.size": item.size.toUpperCase(),
//                 "sizes.stock": { $gte: item.quantity },
//               },
//               { $inc: { "sizes.$.stock": -item.quantity } },
//               { session: dbSession, new: true } // new: true يعيد البيانات بعد التحديث
//             );

//             if (!updatedVariant) {
//               console.error(
//                 `❌ Stock insufficient for Variant: ${item.variant}`
//               );
//               throw new Error(`Insufficient stock for variant ${item.variant}`);
//             }

//             // 2️⃣ تحديث الـ Product (المصفوفة المتداخلة: colors -> sizes)
//             // نستخدم arrayFilters للوصول لـ colors[index].sizes[index]
//             const productUpdate = await Product.updateOne(
//               { _id: item.product },
//               {
//                 $inc: {
//                   "colors.$[colorNode].sizes.$[sizeNode].stock": -item.quantity,
//                   totalStock: -item.quantity,
//                   purchases: item.quantity,
//                 },
//               },
//               {
//                 arrayFilters: [
//                   {
//                     "colorNode.value": updatedVariant.color.value.toLowerCase(),
//                   },
//                   { "sizeNode.size": item.size.toUpperCase() },
//                 ],
//                 session: dbSession,
//               }
//             );

//             if (productUpdate.modifiedCount === 0) {
//               console.warn(
//                 `⚠️ Warning: Product embedded stock not updated. Check if color value '${updatedVariant.color.value}' and size '${item.size}' exist in Product ID: ${item.product}`
//               );
//             } else {
//               console.log(`✅ Success: Variant and Product stock updated.`);
//             }
//           }
//         }
//         // ✨ Clear User's Cart
//         await Cart.findOneAndUpdate(
//           { user: order.user },
//           { $set: { items: [], isActive: true } },
//           { session: dbSession }
//         );

//         // تأكيد كل العمليات في قاعدة البيانات
//         await dbSession.commitTransaction();
//         dbSession.endSession();

//         console.log("✅ DB Updated successfully for order:", order._id);

//         // 📧 3. Send Confirmation Email (After DB Success)
//         try {
//           const customerEmail = session.customer_details.email;
//           await sendOrderEmail(customerEmail, order);
//           console.log("📧 Confirmation email sent to:", customerEmail);
//         } catch (emailErr) {
//           console.error(
//             "❌ Email failed (Order still valid):",
//             emailErr.message
//           );
//         }

//         res.sendStatus(200);
//       } catch (err) {
//         if (dbSession.inAtomicityStatus !== "COMMITTED") {
//           await dbSession.abortTransaction();
//           dbSession.endSession();
//         }
//         console.error("❌ Processing Error (Rolling Back):", err.message);
//         res.status(500).send("Internal Server Error");
//       }
//     } else {
//       res.sendStatus(200);
//     }
//   }
// );

// module.exports = router;

const express = require("express");
const Stripe = require("stripe");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const Order = require("../models/order/order.schema");
const ProductVariant = require("../models/productVariant");
const Product = require("../models/product");
const Cart = require("../models/Cart");
const sendOrderEmail = require("../utils/sendEmail");

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

router.post(
  "/",
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    // 1. التحقق من صحة الـ Webhook
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error("❌ Webhook Signature Error:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const dbSession = await mongoose.startSession();
      dbSession.startTransaction();

      try {
        // البحث عن الطلب باستخدام Session ID (أكثر أماناً من Metadata)
        const order = await Order.findOne({
          stripeSessionId: session.id,
        }).session(dbSession);

        if (!order) {
          console.error("⚠️ Order not found for session:", session.id);
          await dbSession.abortTransaction();
          return res.sendStatus(404);
        }

        // 🛑 Idempotency Check: لضمان عدم تكرار المعالجة
        if (order.payment?.status === "paid") {
          await dbSession.abortTransaction();
          dbSession.endSession();
          return res.sendStatus(200);
        }

        // 🟢 تحديث حالة الدفع مبدئياً داخل الـ Transaction
        order.payment = {
          method: "card",
          status: "paid",
          transactionId: session.payment_intent,
          amount_paid: session.amount_total / 100,
        };
        order.status = "processing";

        // مصفوفة لتتبع العناصر التي قد تفشل بسبب المخزون
        for (const item of order.items) {
          const targetSize = item.size.toUpperCase(); // توحيد الحالة لـ XL, L, M

          // 1️⃣ خصم المخزون من الـ Variant (Atomic Update)
          const updatedVariant = await ProductVariant.findOneAndUpdate(
            {
              _id: item.variant,
              "sizes.size": targetSize,
              "sizes.stock": { $gte: item.quantity }, // التأكد من كفاية المخزون
            },
            { $inc: { "sizes.$.stock": -item.quantity } },
            { session: dbSession, new: true }
          );

          if (!updatedVariant) {
            // 🚨 حالة حرجة: العميل دفع ولكن المخزون انتهى الآن!
            console.error(
              `🚨 STOCK CONFLICT: Order ${order._id}, Variant ${item.variant}`
            );

            // تحديث حالة الطلب لـ "مشكلة في المخزون" بدلاً من إيقاف السيستم
            order.status = "inventory_conflict";
            order.internalNotes = `Paid but item ${item.variant} size ${targetSize} ran out.`;
            await order.save({ session: dbSession });

            // ننهي المعاملة هنا ونرسل تنبيه للمدير (Admin)
            await dbSession.commitTransaction();
            dbSession.endSession();

            // إرسال إيميل تنبيه للدعم الفني (اختياري)
            return res.sendStatus(200);
          }

          // 2️⃣ تحديث الـ Product (Denormalized Data)
          await Product.updateOne(
            { _id: item.product },
            {
              $inc: {
                "colors.$[colorNode].sizes.$[sizeNode].stock": -item.quantity,
                totalStock: -item.quantity,
                purchases: item.quantity,
              },
            },
            {
              arrayFilters: [
                { "colorNode.value": updatedVariant.color.value }, // مطابقة دقيقة
                { "sizeNode.size": targetSize },
              ],
              session: dbSession,
            }
          );
        }

        // ✨ تفريغ سلة المستخدم (بما أن الطلب نجح)
        await Cart.findOneAndUpdate(
          { user: order.user },
          { $set: { items: [], isActive: true } },
          { session: dbSession }
        );

        await order.save({ session: dbSession });

        // تأكيد كل التغييرات
        await dbSession.commitTransaction();
        dbSession.endSession();

        console.log("✅ Order Processed Successfully:", order._id);

        // 📧 إرسال إيميل التأكيد للعميل (خارج الـ Transaction لضمان السرعة)
        const customerEmail = session.customer_details.email;
        sendOrderEmail(customerEmail, order).catch((err) =>
          console.error("📧 Email Error:", err)
        );

        res.sendStatus(200);
      } catch (err) {
        if (dbSession.inAtomicityStatus !== "COMMITTED") {
          await dbSession.abortTransaction();
          dbSession.endSession();
        }
        console.error("❌ Webhook Processing Failed:", err.message);
        res.status(500).send("Internal Server Error");
      }
    } else {
      res.sendStatus(200);
    }
  }
);

module.exports = router;
