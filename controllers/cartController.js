const asyncHandler = require("express-async-handler");
const Product = require("../models/product");
const ProductVariant = require("../models/productVariant");
const CartService = require("../services/cart.service");
const logger = require("../config/logger");
const {
  CART_ERROR_CODES,
  CART_SUCCESS_MESSAGES,
  DEFAULT_CART
} = require("../constants/cartConstants");

// Error messages mapping
const ERROR_MESSAGES = {
  [CART_ERROR_CODES.OUT_OF_STOCK]: 'المنتج غير متوفر بالكمية المطلوبة',
  [CART_ERROR_CODES.INVALID_QUANTITY]: 'الكمية يجب أن تكون رقم موجب',
  [CART_ERROR_CODES.CART_NOT_FOUND]: 'السلة غير موجودة',
  [CART_ERROR_CODES.ITEM_NOT_FOUND]: 'العنصر غير موجود في السلة',
  [CART_ERROR_CODES.INVALID_PAYLOAD]: 'البيانات المرسلة غير صحيحة',
  [CART_ERROR_CODES.NOT_FOUND]: 'المنتج أو المتغير غير موجود',
  [CART_ERROR_CODES.UNAUTHORIZED]: 'غير مصرح لك بالوصول',
  [CART_ERROR_CODES.FORBIDDEN]: 'العملية غير مسموحة',
  [CART_ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'تم تجاوز الحد المسموح للعمليات'
};

const handleCartError = (error, res) => {
  logger.error('Cart operation error:', {
    error: error.message,
    stack: error.stack,
    operation: error.operation || 'unknown'
  });

  const errorInfo = ERROR_MESSAGES[error.message] || {
    message: 'حدث خطأ في الخادم',
    status: 500
  };

  const status = error.status || 500;

  res.status(status).json({
    success: false,
    message: typeof errorInfo === 'string' ? errorInfo : errorInfo.message,
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

// Validation utilities
const validateQuantity = (quantity) => {
  const qty = Number(quantity);
  if (isNaN(qty) || qty <= 0) {
    const error = new Error(CART_ERROR_CODES.INVALID_QUANTITY);
    error.status = 400;
    throw error;
  }
  return qty;
};

const validateRequiredFields = (fields, data) => {
  const missing = fields.filter(field => !data[field]);
  if (missing.length > 0) {
    const error = new Error(CART_ERROR_CODES.INVALID_PAYLOAD);
    error.status = 400;
    error.details = `الحقول المطلوبة مفقودة: ${missing.join(', ')}`;
    throw error;
  }
};

//
const getCart = asyncHandler(async (req, res) => {
  try {
    logger.info('Getting cart', {
      userId: req.user?.id,
      sessionId: req.sessionId
    });

    const cart = await CartService.getCart({
      userId: req.user?.id,
      sessionId: req.sessionId,
    });

    logger.info('Cart retrieved successfully', {
      userId: req.user?.id,
      sessionId: req.sessionId,
      itemCount: cart?.totalItems || 0
    });

    res.json({
      success: true,
      cart: cart || DEFAULT_CART,
    });
  } catch (error) {
    error.operation = 'getCart';
    handleCartError(error, res);
  }
});

const getCartCount = asyncHandler(async (req, res) => {
  try {
    const count = await CartService.getCartCount({
      userId: req.user?.id,
      sessionId: req.sessionId,
    });

    res.json({
      success: true,
      count,
    });
  } catch (error) {
    error.operation = 'getCartCount';
    handleCartError(error, res);
  }
});

//
const addItem = asyncHandler(async (req, res) => {
  try {
    const { product, variant, size, quantity } = req.body;
    const userId = req.user?.id;
    const sessionId = req.sessionId;

    // Validate required fields
    validateRequiredFields(['product', 'variant', 'size', 'quantity'], req.body);

    // Validate and sanitize quantity
    const qty = validateQuantity(quantity);

    logger.info('Adding item to cart', {
      userId,
      sessionId,
      product,
      variant,
      size,
      quantity: qty
    });

    // Fetch product and variant data concurrently
    const [productDoc, variantDoc] = await Promise.all([
      Product.findById(product).select("price title"),
      ProductVariant.findById(variant).select("color sizes"),
    ]);

    if (!productDoc) {
      const error = new Error(CART_ERRORS.NOT_FOUND);
      error.status = 404;
      error.details = 'Product not found';
      throw error;
    }

    if (!variantDoc) {
      const error = new Error(CART_ERRORS.NOT_FOUND);
      error.status = 404;
      error.details = 'Product variant not found';
      throw error;
    }

    // Check if size exists in variant
    const sizeData = variantDoc.sizes?.find(s => s.size === size);
    if (!sizeData) {
      const error = new Error(CART_ERRORS.INVALID_PAYLOAD);
      error.status = 400;
      error.details = `Size ${size} not available for this variant`;
      throw error;
    }

    const cart = await CartService.addItem({
      userId,
      sessionId,
      item: {
        product,
        variant,
        size,
        color: variantDoc.color?.name,
        quantity: qty,
        price: productDoc.price,
      },
    });

    logger.info('Item added to cart successfully', {
      userId,
      sessionId,
      product: productDoc.title,
      cartId: cart._id,
      newTotalItems: cart.totalItems,
      newTotalPrice: cart.totalPrice
    });

    res.status(201).json({
      success: true,
      message: CART_SUCCESS_MESSAGES.ITEM_ADDED,
      cart: {
        totalItems: cart.totalItems,
        totalPrice: cart.totalPrice,
      },
    });
  } catch (error) {
    error.operation = 'addItem';
    handleCartError(error, res);
  }
});

//
const updateQuantity = asyncHandler(async (req, res) => {
  try {
    const { variant, size, quantity } = req.body;
    const userId = req.user?.id;
    const sessionId = req.sessionId;

    // Validate required fields
    validateRequiredFields(['variant', 'size', 'quantity'], req.body);

    // Validate quantity
    const qty = validateQuantity(quantity);

    logger.info('Updating item quantity in cart', {
      userId,
      sessionId,
      variant,
      size,
      quantity: qty
    });

    const cart = await CartService.updateQuantity({
      userId,
      sessionId,
      variant,
      size,
      quantity: qty,
    });

    logger.info('Item quantity updated successfully', {
      userId,
      sessionId,
      variant,
      size,
      newQuantity: qty,
      cartId: cart._id
    });

    res.json({
      success: true,
      message: CART_SUCCESS_MESSAGES.QUANTITY_UPDATED,
      cart: {
        totalItems: cart.totalItems,
        totalPrice: cart.totalPrice,
      }
    });
  } catch (error) {
    error.operation = 'updateQuantity';
    handleCartError(error, res);
  }
});

//
const removeItem = asyncHandler(async (req, res) => {
  try {
    const { variant, size } = req.body;
    const userId = req.user?.id;
    const sessionId = req.sessionId;

    // Validate required fields
    validateRequiredFields(['variant', 'size'], req.body);

    logger.info('Removing item from cart', {
      userId,
      sessionId,
      variant,
      size
    });

    const cart = await CartService.removeItem({
      userId,
      sessionId,
      variant,
      size,
    });

    logger.info('Item removed from cart successfully', {
      userId,
      sessionId,
      variant,
      size,
      remainingItems: cart.items.length
    });

    res.json({
      success: true,
      message: CART_SUCCESS_MESSAGES.ITEM_REMOVED,
      cart: {
        totalItems: cart.totalItems,
        totalPrice: cart.totalPrice,
      }
    });
  } catch (error) {
    error.operation = 'removeItem';
    handleCartError(error, res);
  }
});

//
const clearCart = asyncHandler(async (req, res) => {
  try {
    const userId = req.user?.id;
    const sessionId = req.sessionId;

    logger.info('Clearing cart', {
      userId,
      sessionId
    });

    await CartService.clearCart({
      userId,
      sessionId,
    });

    logger.info('Cart cleared successfully', {
      userId,
      sessionId
    });

    res.json({
      success: true,
      message: CART_SUCCESS_MESSAGES.CART_CLEARED
    });
  } catch (error) {
    error.operation = 'clearCart';
    handleCartError(error, res);
  }
});

module.exports = {
  getCart,
  addItem,
  updateQuantity,
  removeItem,
  clearCart,
  getCartCount,
};
