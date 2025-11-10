const Joi = require("joi");

// ✅ Register validation
const registerSchema = Joi.object({
  username: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

// ✅ Login validation
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

exports.validateRegisterUser = (data) => registerSchema.validate(data);
exports.validateLoginUser = (data) => loginSchema.validate(data);
