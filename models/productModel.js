const Joi = require("joi");
const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [2, "Title must be at least 2 characters"],
    },
    rating: {
      type: Number,
      default: 0,
      min: [0, "Rating cannot be negative"],
      max: [5, "Rating cannot exceed 5"],
    },
    numReviews: {
      type: Number,
      default: 0,
      min: [0, "numReviews cannot be negative"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0.01, "Price must be greater than 0"],
    },
    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subcategory",
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
    variants: [{ type: mongoose.Schema.Types.ObjectId, ref: "ProductVariant" }],
  },
  { timestamps: true }
);
ProductSchema.index({ title: "text" }); // بحث نصى فى العنوان
ProductSchema.index({ price: 1 }); // للفلترة بالـ price (min/max)
ProductSchema.index({ subcategory: 1 }); // علشان البحث بالفئة الفرعية
ProductSchema.index({ category: 1 }); // علشان البحث بالفئة الرئيسية
ProductSchema.index({ createdAt: -1 }); // للفرز حسب الأحدث
ProductSchema.index({ rating: -1 }); // للفرز حسب التقييم

const Product = mongoose.model("Product", ProductSchema);
//
const variantSchema = Joi.object({
  color: Joi.object({
    name: Joi.string().min(1).required(),
    value: Joi.string()
      .pattern(/^#([0-9A-F]{3}){1,2}$/i)
      .required(),
  }).required(),
  sizes: Joi.array()
    .items(
      Joi.object({
        size: Joi.string().min(1).required(),
        stock: Joi.number().min(0).required(),
      })
    )
    .min(1)
    .required(),
});
const validateProduct = (data) => {
  const productSchema = Joi.object({
    title: Joi.string().min(2).required(),
    description: Joi.string().required(),
    price: Joi.number().min(0.01).required(),
    category: Joi.string()
      .regex(/^[0-9a-fA-F]{24}$/)
      .required(),
    subcategory: Joi.string()
      .regex(/^[0-9a-fA-F]{24}$/)
      .optional(),
    variants: Joi.array().items(variantSchema).min(1).required(),
  });
  return productSchema.validate(data);
};

function validateProductUpdate(obj) {
  const schema = Joi.object({
    title: Joi.string().trim().min(2).optional(),
    description: Joi.string().trim().optional(),
    price: Joi.number().min(0.01).optional(),
    category: Joi.string()
      .regex(/^[0-9a-fA-F]{24}$/)
      .optional(),
    subcategory: Joi.string()
      .regex(/^[0-9a-fA-F]{24}$/)
      .optional(),
    variants: Joi.array()
      .items(
        Joi.object({
          _id: Joi.string()
            .regex(/^[0-9a-fA-F]{24}$/)
            .optional()
            .allow(null, "undefined"),
          color: Joi.object({
            name: Joi.string().min(1).optional(),
            value: Joi.string()
              .pattern(/^#([0-9A-F]{3}){1,2}$/i)
              .optional(),
          }).optional(),
          // Allow any array for images, even if empty or null
          images: Joi.array()
            .items(
              Joi.object({
                url: Joi.string().optional(),
                publicId: Joi.string().optional(),
                _id: Joi.string().optional(),
              }).optional()
            )
            .optional()
            .allow(null),
          sizes: Joi.array()
            .items(
              Joi.object({
                size: Joi.string().min(1).optional(),
                stock: Joi.number().min(0).optional(),
                _id: Joi.string().optional(),
              }).optional()
            )
            .optional()
            .allow(null),
        }).optional()
      )
      .optional()
      .allow(null),
  });

  return schema.validate(obj);
}

module.exports = { Product, validateProduct, validateProductUpdate };
