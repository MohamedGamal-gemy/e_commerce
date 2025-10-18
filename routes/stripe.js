const express = require("express");
const Stripe = require("stripe");

const router = express.Router();
const stripe = new Stripe(process.env.Secret_key);

// ✅ إنشاء Payment Intent
router.post("/create-payment-intent", async (req, res) => {
  try {
    const { amount } = req.body;

    // ⚠️ المبلغ يكون بالمليم (مثلاً 100 جنيه = 10000)
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "egp",
      automatic_payment_methods: { enabled: true },
    });

    res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
