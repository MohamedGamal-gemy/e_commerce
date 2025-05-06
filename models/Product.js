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
    category: {
      type: String,
      required: true,
      enum: ["men", "kids", "women"],
    },
    subcategory: {
      type: String,
      trim: true,
      enum: ["Shirts", "T-shirts", "Jacket"],
      required: true,
    },
    variants: [
      {
        color: {
          name: {
            type: String,
            required: [true, "Color name is required"],
          },
          value: {
            type: String,
            required: [true, "Color value is required"],
          },
        },
        images: [
          {
            url: { type: String, required: [true, "Image URL is required"] },
            publicId: { type: String },
          },
        ],
        sizes: [
          {
            size: {
              type: String,
              required: [true, "Size is required"],
            },
            quantity: {
              type: Number,
              required: [true, "Quantity is required"],
              min: [0, "Quantity can't be negative"],
            },
          },
        ],
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.model("Product", ProductSchema);

// function validateProduct(obj) {
//   const schema = Joi.object({
//     title: Joi.string().trim().min(2).required(),
//     description: Joi.string().trim().required(),
//     price: Joi.number().min(0.01).required(),
//     category: Joi.string().valid("men", "kids", "women").required(),
//     subcategory: Joi.string().valid("Shirts", "T-shirts", "Jacket").required(),
//     variants: Joi.array()
//       .items(
//         Joi.object({
//           color: Joi.object({
//             name: Joi.string().required(),
//             value: Joi.string().required(),
//           }).required(),
//           images: Joi.array()
//             .items(
//               Joi.object({
//                 url: Joi.string()
//                   .uri()
//                   .required()
//                   .pattern(
//                     new RegExp("^https://res.cloudinary.com/"),
//                     "URL must be a valid Cloudinary URL"
//                   ),
//                 publicId: Joi.string().optional(),
//               })
//             )
//             .min(1)
//             .required(),
//           sizes: Joi.array()
//             .items(
//               Joi.object({
//                 size: Joi.string().required(),
//                 quantity: Joi.number().min(0).required(),
//               })
//             )
//             .min(1)
//             .required(),
//         })
//       )
//       .min(1)
//       .required(),
//   });
//
//   return schema.validate(obj, { abortEarly: true });
// }
//
const validateProduct = (data) => {
  const schema = Joi.object({
    title: Joi.string().min(2).required(),
    description: Joi.string().required(),
    price: Joi.number().min(0.01).required(),
    category: Joi.string().valid("men", "kids", "women").required(),
    subcategory: Joi.string().valid("Shirts", "T-shirts", "Jacket").required(),
    variants: Joi.array().items(
      Joi.object({
        color: Joi.object({
          name: Joi.string().required(),
          value: Joi.string().required(),
        }).required(),
        sizes: Joi.array()
          .items(
            Joi.object({
              size: Joi.string().required(),
              quantity: Joi.number().min(0).required(),
            })
          )
          .required(),
        images: Joi.array()
          .items(
            Joi.object({
              url: Joi.string().uri().required(),
              publicId: Joi.string().optional(),
            })
          )
          .optional(), // Images optional to avoid validation errors
      })
    ),
  });

  return schema.validate(data);
};
//

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
                // .uri()
                // .pattern(
                //   new RegExp("^https://res.cloudinary.com/"),
                //   "URL must be a valid Cloudinary URL"
                // )
                publicId: Joi.string().optional(),
                _id: Joi.string().optional(),
              })
            )
            .optional(),
          sizes: Joi.array()
            .items(
              Joi.object({
                size: Joi.string().optional(),
                quantity: Joi.number().min(0).optional(),
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

module.exports = { Product, validateProduct, validateProductUpdate };
