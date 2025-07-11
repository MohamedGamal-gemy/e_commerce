const Order = require("../models/Order");

const express = require("express");

const router = express.Router();

// 🔹 Add new order
router.post("/", async (req, res) => {
  try {
    const newOrder = new Order(req.body);
    const saved = await newOrder.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ message: "Error creating order", error: err });
  }
});

// 🔹 Get all orders
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Error fetching orders", error: err });
  }
});

module.exports = router;
