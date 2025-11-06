const Joi = require("joi");

// Size schema
const sizeSchema = Joi.object({
  size: Joi.string().trim().required(),
  stock: Joi.number().min(0).required(),
});

// Variant schema
const variantSchema = Joi.object({
  sku: Joi.string().allow(null, ""),
  color: Joi.object({
    name: Joi.string().trim().required(),
    value: Joi.string().trim().lowercase().required(),
  }).required(),
  sizes: Joi.array()
    .items(sizeSchema)
    .min(1)
    .custom((sizes, helpers) => {
      const sizeNames = sizes.map((s) => s.size.toLowerCase());
      const uniqueSizes = new Set(sizeNames);
      if (uniqueSizes.size !== sizeNames.length) {
        return helpers.message("Sizes within a variant must be unique");
      }
      return sizes;
    }),
  images: Joi.array()
    .items(
      Joi.object({
        url: Joi.string().uri().required(),
        publicId: Joi.string().allow(null, ""),
        alt: Joi.string().allow(null, ""),
      })
    )
    .default([]) // يسمح بالـ empty array
    .required(),
  isDefault: Joi.boolean().default(false),
});

// Create Product schema
exports.createProductSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  description: Joi.string().required(),
  price: Joi.number().min(0).required(),
  originalPrice: Joi.number().min(0).allow(null),
  productType: Joi.string().allow(null, ""),
  sku: Joi.string().allow(null, ""),
  tags: Joi.array().items(Joi.string()).default([]),
  isFeatured: Joi.boolean().default(false),
  variants: Joi.array()
    .items(variantSchema)
    .min(1)
    .custom((variants, helpers) => {
      const colorNames = variants.map((v) => v.color.name.toLowerCase());
      const uniqueColors = new Set(colorNames);
      if (uniqueColors.size !== colorNames.length) {
        return helpers.message("Each variant must have a unique color");
      }
      return variants;
    })
    .required(),
});

// Update Product schema (all fields optional)
exports.updateProductSchema = Joi.object({
  title: Joi.string().min(3).max(100),
  description: Joi.string(),
  price: Joi.number().min(0),
  originalPrice: Joi.number().min(0).allow(null),
  productType: Joi.string()
    .custom((value, helpers) => {
      // Validate MongoDB ObjectId format
      if (!value || value === "") return value;
      const mongoose = require("mongoose");
      if (!mongoose.isValidObjectId(value)) {
        return helpers.message("productType must be a valid MongoDB ObjectId");
      }
      return value;
    }),
  sku: Joi.string().allow(null, ""),
  tags: Joi.array().items(Joi.string()),
  isFeatured: Joi.boolean(),
  status: Joi.string().valid("draft", "active", "hidden", "archived"),
  variants: Joi.array()
    .items(variantSchema)
    .min(1)
    .custom((variants, helpers) => {
      if (!variants) return variants;
      const colorNames = variants.map((v) => v.color.name.toLowerCase());
      const uniqueColors = new Set(colorNames);
      if (uniqueColors.size !== colorNames.length) {
        return helpers.message("Each variant must have a unique color");
      }
      return variants;
    }),
});