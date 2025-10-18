const Joi = require("joi");

exports.addToCartSchema = Joi.object({
  productId: Joi.string().required(),
  variantId: Joi.string().required(),
  size: Joi.string().required(),
  quantity: Joi.number().integer().min(1).default(1),
  sessionId: Joi.string().allow(null, ""),
});

exports.updateQuantitySchema = Joi.object({
  variantId: Joi.string().required(),
  size: Joi.string().required(),
  quantity: Joi.number().integer().min(1).required(),
  sessionId: Joi.string().allow(null, ""),
});

exports.getCartSchema = Joi.object({
  userId: Joi.string().optional(),
  sessionId: Joi.string().optional(),
}).or("userId", "sessionId");
