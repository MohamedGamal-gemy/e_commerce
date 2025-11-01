// validations/productValidation.js
const Joi = require("joi");

const sizeSchema = Joi.object({
    size: Joi.string().required(),
    stock: Joi.number().integer().min(0).required(),
});

const colorSchema = Joi.object({
    name: Joi.string().required(),
    value: Joi.string()
        .pattern(/^#([0-9A-F]{3}){1,2}$/i)
        .required(),
});

const variantSchema = Joi.object({
    color: colorSchema.required(),
    sizes: Joi.array().items(sizeSchema).min(1).required(),
    images: Joi.array().items(
        Joi.object({
            url: Joi.string().uri().optional(),
            publicId: Joi.string().optional(),
        })
    ).default([]),
});

const productSchema = Joi.object({
    title: Joi.string().min(3).required(),
    description: Joi.string().min(10).required(),
    price: Joi.number().positive().required(),
    // category: Joi.string().hex().length(24).required(),
    subcategory: Joi.string().hex().length(24).required(),
    variants: Joi.array().items(variantSchema).min(1).required(),
});

module.exports = { productSchema };
