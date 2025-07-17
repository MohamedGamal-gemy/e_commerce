// // routes/orderRoutes.js
// const express = require("express");
// const router = express.Router();
// const Order = require("../models/Order");

// // @route   POST /api/orders
// // @desc    Create new order
// router.post("/", async (req, res) => {
//   try {
//     const {
//       userId,
//       orderItems,
//       shippingAddress,
//       paymentMethod,
//       itemsPrice,
//       shippingPrice,
//       taxPrice,
//       totalPrice,
//     } = req.body;

//     if (!orderItems || orderItems.length === 0) {
//       return res.status(400).json({ message: "No order items" });
//     }

//     const order = new Order({
//       userId,
//       orderItems,
//       shippingAddress,
//       paymentMethod,
//       itemsPrice,
//       shippingPrice,
//       taxPrice,
//       totalPrice,
//     });

//     const createdOrder = await order.save();
//     res.status(201).json(createdOrder);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server Error" });
//   }
// });

// module.exports = router;

// routes/orderRoutes.js
const express = require("express");
const asyncHandler = require("express-async-handler");
const Order = require("../models/Order");
const Cart = require("../models/CartItem");
const { Product } = require("../models/productModel");
const ProductVariant = require("../models/variantsModel");
const { protect } = require("../middlewares/protect");
// const protect = require("../middlewares/");

const router = express.Router();

// // POST /api/orders
// router.post(
//   "/",
//   protect,
//   asyncHandler(async (req, res) => {
//     const userId = req.user._id;
//     const { shippingAddress, paymentMethod } = req.body;

//     // 1. Get cart
//     const cart = await Cart.findOne({ userId });

//     if (!cart || cart.items.length === 0) {
//       return res.status(400).json({ message: "Cart is empty" });
//     }

//     // 2. Prepare order items
//     const orderItems = await Promise.all(
//       cart.items.map(async (item) => {
//         const product = await Product.findById(item.productId).lean();
//         const variant = await ProductVariant.findById(item.variantId).lean();
//         if (!product || !variant) {
//           throw new Error("Product or variant not found");
//         }

//         const selectedSize = variant.sizes.find((s) => s.size === item.size);
//         if (!selectedSize) {
//           throw new Error(`Size ${item.size} not available`);
//         }

//         return {
//           productId: item.productId,
//           productTitle: product.title,
//           variantId: item.variantId,
//           color: variant.color,
//           image: variant.images[0]?.url || "",
//           size: item.size,
//           quantity: item.quantity,
//           price: item.price || 0,
//         };
//       })
//     );

//     // 3. Calculate prices
//     const itemsPrice = orderItems.reduce(
//       (sum, item) => sum + item.price * item.quantity,
//       0
//     );
//     const shippingPrice = itemsPrice > 1000 ? 0 : 50;
//     const taxPrice = Number((itemsPrice * 0.14).toFixed(2)); // 14% VAT
//     const totalPrice = itemsPrice + shippingPrice + taxPrice;

//     // 4. Create order
//     const order = new Order({
//       userId,
//       orderItems,
//       shippingAddress,
//       paymentMethod,
//       itemsPrice,
//       shippingPrice,
//       taxPrice,
//       totalPrice,
//     });

//     const createdOrder = await order.save();

//     // 5. Clear cart
//     await Cart.deleteOne({ userId });

//     // 6. Send response
//     res.status(201).json(createdOrder);
//   })
// );
// // ######################
// router.get(
//   "/",
//   protect,
//   asyncHandler(async (req, res) => {
//     const userId = req.user._id;

//     const orders = await Order.find({ userId }).sort({ createdAt: -1 });

//     if (!orders) {
//       return res.status(404).json({ message: "No orders found" });
//     }

//     res.json(orders);
//   })
// );
// // ######################

// router.delete(
//   "/:id",
//   protect,
//   asyncHandler(async (req, res) => {
//     const orderId = req.params.id;
//     const userId = req.user._id;

//     const order = await Order.findOneAndDelete({ _id: orderId, userId });

//     if (!order) {
//       return res
//         .status(404)
//         .json({ message: "Order not found or not authorized" });
//     }

//     res.json({ message: "Order deleted successfully" });
//   })
// );

// module.exports = router;

// POST /api/orders
router.post(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const {
      shippingAddress,
      paymentMethod = "cash", // default
      shippingMethod = "standard", // default
    } = req.body;

    // 1. Get cart
    const cart = await Cart.findOne({ userId });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // 2. Prepare order items
    const orderItems = await Promise.all(
      cart.items.map(async (item) => {
        const product = await Product.findById(item.productId).lean();
        const variant = await ProductVariant.findById(item.variantId).lean();
        if (!product || !variant) {
          throw new Error("Product or variant not found");
        }

        const selectedSize = variant.sizes.find((s) => s.size === item.size);
        if (!selectedSize) {
          throw new Error(`Size ${item.size} not available`);
        }

        return {
          productId: item.productId,
          productTitle: product.title,
          variantId: item.variantId,
          color: variant.color,
          image: variant.images[0]?.url || "",
          size: item.size,
          quantity: item.quantity,
          price: item.price || 0,
        };
      })
    );

    // 3. Calculate prices
    const itemsPrice = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const shippingPrice = itemsPrice > 1000 ? 0 : 50;
    const taxPrice = Number((itemsPrice * 0.14).toFixed(2)); // 14% VAT
    const totalPrice = itemsPrice + shippingPrice + taxPrice;

    // 4. Create order
    const order = new Order({
      userId,
      orderItems,
      shippingAddress,
      paymentMethod,
      shippingMethod,
      orderStatus: "pending", // default status
      paymentStatus: "unpaid", // assume unpaid unless payment integration
      itemsPrice,
      shippingPrice,
      taxPrice,
      totalPrice,
    });

    const createdOrder = await order.save();

    // 5. Clear cart
    await Cart.deleteOne({ userId });

    // 6. Send response
    res.status(201).json(createdOrder);
  })
);

// GET /api/orders
router.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const orders = await Order.find({ userId }).sort({ createdAt: -1 });

    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: "No orders found" });
    }

    res.json(orders);
  })
);

// DELETE /api/orders/:id
router.delete(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    const orderId = req.params.id;
    const userId = req.user._id;

    const order = await Order.findOneAndDelete({ _id: orderId, userId });

    if (!order) {
      return res
        .status(404)
        .json({ message: "Order not found or not authorized" });
    }

    res.json({ message: "Order deleted successfully" });
  })
);
module.exports = router;
