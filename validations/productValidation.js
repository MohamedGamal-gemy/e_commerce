const Joi = require("joi");

const sizeSchema = Joi.object({
  size: Joi.string().required(),
  stock: Joi.number().min(0).required(),
});

const variantSchema = Joi.object({
  // sku: Joi.string().required(),
  color: Joi.object({
    name: Joi.string().required(),
    value: Joi.string().required(),
  }).required(),
  sizes: Joi.array().items(sizeSchema).min(1).required(),
  images: Joi.array()
    .items(
      Joi.object({
        url: Joi.string().uri().required(),
        publicId: Joi.string().allow(null, ""),
        alt: Joi.string().allow("", null),
      })
    )
    .min(1)
    .required(),
  isDefault: Joi.boolean().default(false),
});

exports.createProductSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  description: Joi.string().required(),
  shortDescription: Joi.string().allow("", null),
  price: Joi.number().min(0).required(),
  originalPrice: Joi.number().min(0).allow(null),
  category: Joi.string().required(),
  subcategory: Joi.string().allow(null, ""),
  sku: Joi.string().allow(null, ""),
  tags: Joi.array().items(Joi.string()).default([]),
  colorOptions: Joi.array().items(Joi.string()).default([]),
  sizeOptions: Joi.array().items(Joi.string()).default([]),
  isFeatured: Joi.boolean().default(false),
  // mainImage: Joi.object({
  //   url: Joi.string().uri(),
  //   // url: Joi.string().uri().required(),
  //   publicId: Joi.string().allow(null, ""),
  //   alt: Joi.string().allow("", null),
  // }),
  // }).required(),
  variants: Joi.array().items(variantSchema).min(1).required(),
});
