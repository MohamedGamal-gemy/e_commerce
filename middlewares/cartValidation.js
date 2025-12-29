const Joi = require("joi");
const { CART_LIMITS } = require("../constants/cartConstants");

// Validation schemas
const addToCartSchema = Joi.object({
  product: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'معرف المنتج غير صحيح',
      'any.required': 'معرف المنتج مطلوب'
    }),

  variant: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'معرف المتغير غير صحيح',
      'any.required': 'معرف المتغير مطلوب'
    }),

  size: Joi.string()
    .trim()
    .uppercase()
    .min(CART_LIMITS.MIN_SIZE_LENGTH)
    .max(CART_LIMITS.MAX_SIZE_LENGTH)
    .required()
    .messages({
      'string.min': 'الحجم مطلوب',
      'string.max': 'الحجم طويل جداً',
      'any.required': 'الحجم مطلوب'
    }),

  quantity: Joi.number()
    .integer()
    .min(CART_LIMITS.MIN_QUANTITY)
    .max(CART_LIMITS.MAX_QUANTITY)
    .default(1)
    .messages({
      'number.min': `الكمية يجب أن تكون على الأقل ${CART_LIMITS.MIN_QUANTITY}`,
      'number.max': `الكمية يجب ألا تتجاوز ${CART_LIMITS.MAX_QUANTITY}`,
      'number.integer': 'الكمية يجب أن تكون رقم صحيح'
    })
});

const updateQuantitySchema = Joi.object({
  variant: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'معرف المتغير غير صحيح',
      'any.required': 'معرف المتغير مطلوب'
    }),

  size: Joi.string()
    .trim()
    .uppercase()
    .min(CART_LIMITS.MIN_SIZE_LENGTH)
    .max(CART_LIMITS.MAX_SIZE_LENGTH)
    .required()
    .messages({
      'string.min': 'الحجم مطلوب',
      'string.max': 'الحجم طويل جداً',
      'any.required': 'الحجم مطلوب'
    }),

  quantity: Joi.number()
    .integer()
    .min(CART_LIMITS.MIN_QUANTITY)
    .max(CART_LIMITS.MAX_QUANTITY)
    .required()
    .messages({
      'number.min': `الكمية يجب أن تكون على الأقل ${CART_LIMITS.MIN_QUANTITY}`,
      'number.max': `الكمية يجب ألا تتجاوز ${CART_LIMITS.MAX_QUANTITY}`,
      'number.integer': 'الكمية يجب أن تكون رقم صحيح',
      'any.required': 'الكمية مطلوبة'
    })
});

const removeItemSchema = Joi.object({
  variant: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'معرف المتغير غير صحيح',
      'any.required': 'معرف المتغير مطلوب'
    }),

  size: Joi.string()
    .trim()
    .uppercase()
    .min(CART_LIMITS.MIN_SIZE_LENGTH)
    .max(CART_LIMITS.MAX_SIZE_LENGTH)
    .required()
    .messages({
      'string.min': 'الحجم مطلوب',
      'string.max': 'الحجم طويل جداً',
      'any.required': 'الحجم مطلوب'
    })
});

// Validation middleware
const validateAddToCart = (req, res, next) => {
  const { error, value } = addToCartSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      message: 'بيانات غير صحيحة',
      errors
    });
  }

  // Sanitize the data
  req.body = value;
  next();
};

const validateUpdateQuantity = (req, res, next) => {
  const { error, value } = updateQuantitySchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      message: 'بيانات غير صحيحة',
      errors
    });
  }

  req.body = value;
  next();
};

const validateRemoveItem = (req, res, next) => {
  const { error, value } = removeItemSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      message: 'بيانات غير صحيحة',
      errors
    });
  }

  req.body = value;
  next();
};

// Rate limiting helper (can be enhanced with Redis later)
const rateLimitCartOperations = (req, res, next) => {
  const clientId = req.user?.id || req.sessionId;
  const operation = req.route?.path + req.method;

  // Simple in-memory rate limiting (replace with Redis in production)
  const now = Date.now();
  const windowMs = CART_LIMITS.RATE_LIMIT_WINDOW_MS;
  const maxRequests = CART_LIMITS.RATE_LIMIT_REQUESTS;

  if (!global.rateLimitStore) {
    global.rateLimitStore = new Map();
  }

  const key = `${clientId}:${operation}`;
  const userRequests = global.rateLimitStore.get(key) || [];

  // Filter out old requests
  const recentRequests = userRequests.filter(time => now - time < windowMs);

  if (recentRequests.length >= maxRequests) {
    return res.status(429).json({
      success: false,
      message: 'تم تجاوز الحد المسموح للعمليات، يرجى المحاولة لاحقاً'
    });
  }

  recentRequests.push(now);
  global.rateLimitStore.set(key, recentRequests);

  next();
};

module.exports = {
  validateAddToCart,
  validateUpdateQuantity,
  validateRemoveItem,
  rateLimitCartOperations
};
