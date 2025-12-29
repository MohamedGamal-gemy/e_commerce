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
const {
  validateAddToCart,
  validateUpdateQuantity,
  validateRemoveItem,
  rateLimitCartOperations
} = require("../middlewares/cartValidation");
const {
  validateCartAccess,
  sanitizeCartInput,
  checkCartOperationAllowed
} = require("../middlewares/cartAuth");

// Apply authentication and session middleware to all routes
router.use(protectOption);
router.use(guestSession);
router.use(validateCartAccess);

// Apply rate limiting to cart operations
router.use('/items', rateLimitCartOperations);
router.use('/count', rateLimitCartOperations);

// Cart retrieval routes (read operations)
router.get("/", getCart);
router.get("/count", getCartCount);

// Cart modification routes with comprehensive validation and security
router.post("/items",
  sanitizeCartInput,
  validateAddToCart,
  checkCartOperationAllowed,
  addItem
);

router.patch("/items",
  sanitizeCartInput,
  validateUpdateQuantity,
  checkCartOperationAllowed,
  updateQuantity
);

router.delete("/items",
  sanitizeCartInput,
  validateRemoveItem,
  checkCartOperationAllowed,
  removeItem
);

router.delete("/",
  checkCartOperationAllowed,
  clearCart
);

module.exports = router;
