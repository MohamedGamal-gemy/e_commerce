// import express from "express";
// import Order from "../models/Order.js";

// import express from "express";
// import Order from "../models/Order";
const express = require("express");
const Order = require("../models/Order");
const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { userId, items, total, shippingInfo, paymentIntentId } = req.body;

    const order = await Order.create({
      userId,
      items,
      total,
      shippingInfo,
      paymentStatus: "paid",
      paymentIntentId,
    });

    res.status(201).json(order);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
