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
  imageField: Joi.string()
    .pattern(/^variantImages\[\d+\]$/)
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
    category: Joi.string().valid("men", "kids", "women").optional(),
    subcategory: Joi.string().valid("Shirts", "T-shirts", "Jacket").optional(),
    variants: Joi.array()
      .items(
        Joi.object({
          _id: Joi.string().optional(),
          color: Joi.object({
            name: Joi.string().optional(),
            value: Joi.string().optional(),
          }).optional(),
          images: Joi.array()
            .items(
              Joi.object({
                url: Joi.string().optional(),
                publicId: Joi.string().optional(),
                _id: Joi.string().optional(),
              })
            )
            .optional(),
          sizes: Joi.array()
            .items(
              Joi.object({
                size: Joi.string().optional(),
                stock: Joi.number().min(0).optional(),
                _id: Joi.string().optional(),
              })
            )
            .optional(),
        })
      )

      .optional(),
  });

  return schema.validate(obj);
}
// ProductSchema.index({ category: 1, subcategory: 1 });
// ProductSchema.index({ price: 1 });
// ProductSchema.index({ rating: -1 });
// ProductSchema.index({ title: "text" });

module.exports = { Product, validateProduct, validateProductUpdate };
