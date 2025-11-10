// const express = require("express");
// const asyncHandler = require("express-async-handler");
// const Cart = require("../models/CartItem");
// const Product = require("../models/productModel");
// const ProductVariant = require("../models/variantsModel");
// const { v4: uuidv4 } = require("uuid");

// const { addToCartSchema, getCartSchema } = require("../validations/cartValidation");

// const router = express.Router();

// // ==========================
// // 🧾 GET CART
// // ==========================
// router.get(
//   "/",
//   asyncHandler(async (req, res) => {
//     const { error, value } = getCartSchema.validate(req.query);
//     if (error) {
//       return res.status(400).json({ message: error.details[0].message });
//     }

//     const { userId, sessionId } = value;
//     const findCriteria = userId ? { userId } : { sessionId };

//     const cart = await Cart.findOne(findCriteria)
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

//     res.status(200).json({
//       message: "Cart fetched successfully",
//       cart: cart || { items: [], subtotal: 0, totalItems: 0 },
//     });
//   })
// );

// // ==========================
// // ➕ ADD TO CART
// // ==========================
// // router.post(
// //   "/add",
// //   asyncHandler(async (req, res) => {
// //     const { error, value } = addToCartSchema.validate(req.body);
// //     if (error) {
// //       return res.status(400).json({ message: error.details[0].message });
// //     }

// //     const { productId, variantId, size, quantity, sessionId } = value;
// //     const userId = req.user ? req.user.id : null;

// //     if (!sessionId && !userId) {
// //       return res.status(400).json({
// //         message: "Authentication required: userId or sessionId must exist.",
// //       });
// //     }

// //     const [product, variant] = await Promise.all([
// //       Product.findById(productId).select("price"),
// //       ProductVariant.findById(variantId).select("sizes"),
// //     ]);

// //     if (!product || !variant) {
// //       return res.status(404).json({ message: "Product or Variant not found." });
// //     }

// //     const sizeInfo = variant.sizes.find((s) => s.size === size);
// //     if (!sizeInfo) {
// //       return res
// //         .status(400)
// //         .json({ message: `Size ${size} is not available for this variant.` });
// //     }

// //     const isAvailable = sizeInfo.stock > 0;
// //     const cartKey = userId ? { userId } : { sessionId };

// //     let cart = await Cart.findOneAndUpdate(
// //       cartKey,
// //       { $setOnInsert: { ...cartKey, sessionId, items: [] } },
// //       { new: true, upsert: true }
// //     );

// //     const existingIndex = cart.items.findIndex(
// //       (item) =>
// //         item.productId.toString() === productId &&
// //         item.variantId.toString() === variantId &&
// //         item.size === size
// //     );

// //     if (existingIndex > -1) {
// //       cart.items[existingIndex].quantity += quantity;
// //     } else {
// //       cart.items.push({
// //         productId,
// //         variantId,
// //         size,
// //         quantity,
// //         price: product.price,
// //         isAvailable,
// //       });
// //     }

// //     await cart.save();

// //     res.status(201).json({
// //       message: "Product added to cart successfully.",
// //       cart,
// //     });
// //   })
// // );



// router.post(
//   "/add",
//   asyncHandler(async (req, res) => {
//     const { error, value } = addToCartSchema.validate(req.body);
//     if (error) {
//       return res.status(400).json({ message: error.details[0].message });
//     }

//     let { productId, variantId, size, quantity, sessionId } = value;
//     const userId = req.user ? req.user.id : null;

//     // ✅ Generate sessionId if missing and no userId
//     if (!sessionId && !userId) {
//       sessionId = uuidv4();
//       // Optionally set cookie in response
//       res.cookie("sessionId", sessionId, {
//         httpOnly: true,
//         secure: process.env.NODE_ENV === "production",
//         sameSite: "lax",
//         maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
//       });
//     }

//     const [product, variant] = await Promise.all([
//       Product.findById(productId).select("price"),
//       ProductVariant.findById(variantId).select("sizes"),
//     ]);

//     if (!product || !variant) {
//       return res.status(404).json({ message: "Product or Variant not found." });
//     }

//     const sizeInfo = variant.sizes.find((s) => s.size === size);
//     if (!sizeInfo) {
//       return res
//         .status(400)
//         .json({ message: `Size ${size} is not available for this variant.` });
//     }

//     const isAvailable = sizeInfo.stock > 0;
//     const cartKey = userId ? { userId } : { sessionId };

//     let cart = await Cart.findOneAndUpdate(
//       cartKey,
//       { $setOnInsert: { ...cartKey, items: [] } },
//       { new: true, upsert: true }
//     );

//     const existingIndex = cart.items.findIndex(
//       (item) =>
//         item.productId.toString() === productId &&
//         item.variantId.toString() === variantId &&
//         item.size === size
//     );

//     if (existingIndex > -1) {
//       cart.items[existingIndex].quantity += quantity;
//     } else {
//       cart.items.push({
//         productId,
//         variantId,
//         size,
//         quantity,
//         price: product.price,
//         isAvailable,
//       });
//     }

//     await cart.save();

//     res.status(201).json({
//       message: "Product added to cart successfully.",
//       cart,
//       sessionId, // return the sessionId for client to store
//     });
//   })
// );

// #################################
const express = require("express");
const router = express.Router();

const {
  getCart,
  addItem,
  updateItemQuantity,
  removeItem,
  clearCart,
} = require("../controllers/cartController");

const ensureSessionId = require("../middleware/ensureSessionId");

// Ensure guests have a sessionId; controller will branch user vs guest
router.use(ensureSessionId);

router.get("/", getCart);
router.post("/items", addItem);
router.patch("/items", updateItemQuantity);
router.delete("/items", removeItem);
router.delete("/", clearCart);

module.exports = router;
