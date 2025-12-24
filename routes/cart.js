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
const { optionalProtect } = require("../middleware/optionalProtect");

// Ensure guests have a sessionId; controller will branch user vs guest
router.use(ensureSessionId);

// router.get("/", getCart);
router.get("/", optionalProtect, getCart);
router.post("/items", addItem);
router.patch("/items", updateItemQuantity);
router.delete("/items", removeItem);
router.delete("/", clearCart);

module.exports = router;
