// Cart operation constants
const CART_OPERATIONS = {
  ADD_ITEM: 'ADD_ITEM',
  UPDATE_QUANTITY: 'UPDATE_QUANTITY',
  REMOVE_ITEM: 'REMOVE_ITEM',
  CLEAR_CART: 'CLEAR_CART',
  GET_CART: 'GET_CART',
  GET_COUNT: 'GET_COUNT'
};

// Error codes
const CART_ERROR_CODES = {
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  INVALID_QUANTITY: 'INVALID_QUANTITY',
  CART_NOT_FOUND: 'CART_NOT_FOUND',
  ITEM_NOT_FOUND: 'ITEM_NOT_FOUND',
  INVALID_PAYLOAD: 'INVALID_PAYLOAD',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
};

// Success messages
const CART_SUCCESS_MESSAGES = {
  ITEM_ADDED: 'تم إضافة المنتج للسلة بنجاح',
  QUANTITY_UPDATED: 'تم تحديث الكمية بنجاح',
  ITEM_REMOVED: 'تم حذف المنتج من السلة بنجاح',
  CART_CLEARED: 'تم مسح السلة بنجاح'
};

// Validation limits
const CART_LIMITS = {
  MAX_QUANTITY: 99,
  MIN_QUANTITY: 1,
  MAX_SIZE_LENGTH: 10,
  MIN_SIZE_LENGTH: 1,
  RATE_LIMIT_REQUESTS: 30,
  RATE_LIMIT_WINDOW_MS: 60 * 1000, // 1 minute
  MAX_CART_ITEMS: 50 // Maximum items allowed in cart
};

// Cache keys
const CART_CACHE_KEYS = {
  CART: (userId, sessionId) => `cart:${userId || 'guest'}:${sessionId}`,
  CART_COUNT: (userId, sessionId) => `cart:count:${userId || 'guest'}:${sessionId}`,
  CACHE_TTL: 300 // 5 minutes
};

// Default cart structure
const DEFAULT_CART = {
  items: [],
  totalItems: 0,
  totalPrice: 0,
  currency: "EGP"
};

// Cart item status
const CART_ITEM_STATUS = {
  AVAILABLE: 'AVAILABLE',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  LOW_STOCK: 'LOW_STOCK',
  UNAVAILABLE: 'UNAVAILABLE'
};

module.exports = {
  CART_OPERATIONS,
  CART_ERROR_CODES,
  CART_SUCCESS_MESSAGES,
  CART_LIMITS,
  CART_CACHE_KEYS,
  DEFAULT_CART,
  CART_ITEM_STATUS
};
