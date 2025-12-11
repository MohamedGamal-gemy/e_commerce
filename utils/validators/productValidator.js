const Joi = require("joi");
const { ValidationError } = require("../errors/AppError");

const productSchema = Joi.object({
  title: Joi.string().trim().min(3).max(200).required().messages({
    "string.empty": "Title is required",
    "string.min": "Title must be at least 3 characters",
    "string.max": "Title cannot exceed 200 characters",
  }),

  description: Joi.string().trim().min(10).max(2000).required(),

  price: Joi.number().positive().required().precision(2),

  originalPrice: Joi.number()
    .positive()
    .precision(2)
    .greater(Joi.ref("price"))
    .when("discountValue", {
      is: Joi.exist(),
      then: Joi.required(),
    }),

  productType: Joi.string().hex().length(24).required(),

  discountType: Joi.string().valid("percentage", "flat").default("percentage"),

  discountValue: Joi.number().min(0),
  //   .when("discountType", {
  //     is: "percentage",
  //     //   then: Joi.max(100),
  //   }
  // ),

  discountStart: Joi.date()
    .iso()
    .when("discountValue", {
      is: Joi.number().greater(0),
      then: Joi.required(),
    }),

  discountEnd: Joi.date()
    .iso()
    .min(Joi.ref("discountStart"))
    .when("discountValue", {
      is: Joi.number().greater(0),
      then: Joi.required(),
    }),

  variants: Joi.array().items(Joi.object().unknown()).min(1).required(),

  minOrderQuantity: Joi.number().integer().min(1).default(1),

  maxOrderQuantity: Joi.number().integer().min(Joi.ref("minOrderQuantity")),

  status: Joi.string()
    .valid("draft", "active", "hidden", "archived")
    .default("active"),
});

const variantSchema = Joi.object({
  color: Joi.object({
    name: Joi.string().trim().required(),
    value: Joi.string().trim().lowercase().required(),
  }).required(),

  sizes: Joi.array()
    .items(
      Joi.object({
        size: Joi.string().trim().uppercase().required(),
        stock: Joi.number().integer().min(0).default(0),
      })
    )
    .min(1)
    .required(),

  images: Joi.array().items(Joi.string()).min(1).when("isDefault", {
    is: true,
    then: Joi.required(),
  }),

  sku: Joi.string()
    .trim()
    .pattern(/^[A-Z0-9-]+$/)
    .max(50),

  isDefault: Joi.boolean().default(false),
});

const validateProduct = (data) => {
  const { error, value } = productSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = error.details.reduce((acc, curr) => {
      const path = curr.path.join(".");
      acc[path] = curr.message;
      return acc;
    }, {});
    throw new ValidationError(errors);
  }

  return value;
};

const validateVariant = (data) => {
  const { error, value } = variantSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = error.details.reduce((acc, curr) => {
      const path = curr.path.join(".");
      acc[path] = curr.message;
      return acc;
    }, {});
    throw new ValidationError(errors);
  }

  return value;
};

module.exports = {
  validateProduct,
  validateVariant,
};
