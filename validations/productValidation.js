const Joi = require("joi");

// Size schema
const sizeSchema = Joi.object({
  size: Joi.string().trim().required(),
  stock: Joi.number().min(0).required(),
});

// Variant schema
// Note: images are optional because they're uploaded as separate files via FormData
const variantSchema = Joi.object({
  _id: Joi.string().allow(null, ""), // For updates - existing variant ID
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
  // Images are optional - they can be:
  // 1. Empty array or undefined (new images uploaded as files via variantImages_0, variantImages_1, etc.)
  // 2. Array with existing URLs (for updates when keeping existing images)
  // 3. Array with file objects (ignored - files come via FormData separately)
  images: Joi.array()
    .items(
      Joi.object({
        url: Joi.string().uri().optional(),
        publicId: Joi.string().allow(null, "").optional(),
        alt: Joi.string().allow(null, "").optional(),
        // Allow file property but it will be ignored (files uploaded separately)
        file: Joi.any().optional(),
      }).unknown(true) // Allow other properties like file, preview, etc.
    )
    .default([])
    .optional(), // Optional - files come via FormData as variantImages_0, variantImages_1, etc.
  // Array of publicIds for images to delete (for updates)
  removedImages: Joi.array()
    .items(Joi.string())
    .default([])
    .optional(),
  isDefault: Joi.boolean().default(false),
});

// Create Product schema
exports.createProductSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  description: Joi.string().required(),
  price: Joi.number().min(0).required(),
  originalPrice: Joi.number().min(0).allow(null),
  //
  discountType: Joi.string().valid("percentage", "flat").allow(null, ""),
  discountValue: Joi.number().min(0).allow(null),
  discountStart: Joi.date().allow(null),
  discountEnd: Joi.date().allow(null),

  //
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
  productType: Joi.string().custom((value, helpers) => {
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
