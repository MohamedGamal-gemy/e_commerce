// const express = require("express");
// const router = express.Router();
// const Stripe = require("stripe");
// const stripe = new Stripe(process.env.STRIPE_KEY);

// router.post("/create-checkout-session", async (req, res) => {
//   const { cartItems } = req.body;

//   const line_items = cartItems.map((item) => ({
//     price_data: {
//       currency: "usd",
//       product_data: {
//         name: item.title,
//       },
//       unit_amount: item.price * 100,
//     },
//     quantity: item.quantity,
//   }));

//   try {
//     const session = await stripe.checkout.sessions.create({
//       payment_method_types: ["card"],
//       line_items,
//       mode: "payment",
//       success_url: "http://localhost:5173/success",
//       cancel_url: "http://localhost:5173/cancel",
//     });

//     res.json({ url: session.url });
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({ error: "Something went wrong." });
//   }
// });

// module.exports = router;
