const Joi = require("joi");
const mongoose = require("mongoose");

// const reviewSchema = mongoose.Schema(
//   {
//     name: { type: String, required: true },
//     rating: { type: Number, required: true },
//     comment: { type: String, required: true },
//     user: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// const ProductSchema = new mongoose.Schema(
//   {
//     title: {
//       type: String,
//       required: [true, "Title is required"],
//       trim: true,
//       minlength: [2, "Title must be at least 2 characters"],
//     },
//     reviews: [reviewSchema],
//     rating: {
//       type: Number,
//       required: true,
//       default: 0,
//     },
//     numReviews: {
//       type: Number,
//       required: true,
//       default: 0,
//     },
//     description: {
//       type: String,
//       required: [true, "Description is required"],
//       trim: true,
//     },
//     price: {
//       type: Number,
//       required: [true, "Price is required"],
//       min: [0.01, "Price must be greater than 0"],
//     },
//     category: {
//       type: String,
//       required: true,
//       enum: ["men", "kids", "women"],
//     },
//     subcategory: {
//       type: String,
//       trim: true,
//       enum: ["Shirts", "T-shirts", "Jacket"],
//       required: true,
//     },
//     variants: [
//       {
//         color: {
//           name: {
//             type: String,
//             required: [true, "Color name is required"],
//           },
//           value: {
//             type: String,
//             required: [true, "Color value is required"],
//           },
//         },
//         images: [
//           {
//             url: { type: String, required: [true, "Image URL is required"] },
//             publicId: { type: String },
//           },
//         ],
//         sizes: [
//           {
//             size: {
//               type: String,
//               required: [true, "Size is required"],
//             },
//             quantity: {
//               type: Number,
//               required: [true, "Quantity is required"],
//               min: [0, "Quantity can't be negative"],
//             },
//           },
//         ],
//       },
//     ],
//   },
//   {
//     timestamps: true,
//   }
// );

// const ProductSchema = new mongoose.Schema(
//   {
//     title: {
//       type: String,
//       required: [true, "Title is required"],
//       trim: true,
//       minlength: [2, "Title must be at least 2 characters"],
//     },
//     rating: {
//       type: Number,
//       default: 0,
//       min: [0, "Rating cannot be negative"],
//       max: [5, "Rating cannot exceed 5"],
//     },
//     numReviews: {
//       type: Number,
//       default: 0,
//       min: [0, "numReviews cannot be negative"],
//     },
//     description: {
//       type: String,
//       required: [true, "Description is required"],
//       trim: true,
//     },
//     price: {
//       type: Number,
//       required: [true, "Price is required"],
//       min: [0.01, "Price must be greater than 0"],
//     },
//     category: {
//       type: String,
//       required: true,
//       enum: ["men", "kids", "women"],
//     },
//     subcategory: {
//       type: String,
//       trim: true,
//       required: true,
//       enum: ["Shirts", "T-shirts", "Jacket"],
//     },
//     variants: [{ type: mongoose.Schema.Types.ObjectId, ref: "Variants" }],
//   },
//   { timestamps: true }
// );

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

//
// models/Product.js

// const ProductSchema = new mongoose.Schema(
//   {
//     title: { type: String, required: true, trim: true, minlength: 2 },
//     description: { type: String, required: true, trim: true },
//     price: { type: Number, required: true, min: 0.01 },
//     rating: { type: Number, default: 0, min: 0, max: 5 },
//     numReviews: { type: Number, default: 0 },
//     category: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Category",
//       required: true,
//     },
//     subcategory: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Subcategory",
//       required: true,
//     },
//     variants: [{ type: mongoose.Schema.Types.ObjectId, ref: "ProductVariant" }],
//   },
//   { timestamps: true }
// );

const Product = mongoose.model("Product", ProductSchema);
// export default Product;

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
// ProductSchema.index({ category: 1, subcategory: 1 });
// ProductSchema.index({ price: 1 });
// ProductSchema.index({ rating: -1 });
// ProductSchema.index({ title: "text" });

module.exports = { Product, validateProduct, validateProductUpdate };
