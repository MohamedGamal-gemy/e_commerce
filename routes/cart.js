const express = require("express");
const router = express.Router();

const {
  getCart,
  addItem,
  updateQuantity,
  removeItem,
  clearCart,
  getCartCount,
} = require("../controllers/cartController");

const { protectOption } = require("../middlewares/protectOption");
const { guestSession } = require("../middleware/guestSession");
// const { getCartCount } = require("../services/cart.service");

router.use(protectOption);
router.use(guestSession);

router.get("/", getCart);
router.get("/count", getCartCount);

router.post("/items", addItem);
router.patch("/items", updateQuantity);
router.delete("/items", removeItem);
router.delete("/", clearCart);

module.exports = router;
