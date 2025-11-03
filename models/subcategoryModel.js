// // models/subcategoryModel.js

// const mongoose = require("mongoose");

// const SubcategorySchema = new mongoose.Schema(
//   {
//     name: { type: String, unique: true, required: true, trim: true },
//     slug: { type: String, unique: true, lowercase: true, index: true },

//     // احذف ده كله:
//     // category: {
//     //   type: mongoose.Schema.Types.ObjectId,
//     //   ref: "Category",
//     //   required: true,
//     //   index: true,
//     // },

//     description: { type: String, trim: true },
//     image: { url: String, publicId: String },

//     isActive: { type: Boolean, default: true },
//     isFeatured: { type: Boolean, default: false },

//     metaTitle: String,
//     metaDescription: String,
//     keywords: [String],
//   },
//   { timestamps: true }
// );

// // auto-generate slug
// SubcategorySchema.pre("save", function (next) {
//   if (!this.slug && this.name) {
//     const base = this.name
//       .toLowerCase()
//       .replace(/[^a-z0-9]+/g, "-")
//       .replace(/^-+|-+$/g, "");
//     this.slug = `${base}-${
//       this._id ? this._id.toString().slice(-6) : Date.now().toString().slice(-6)
//     }`;
//   }
//   next();
// });

// module.exports = mongoose.model("Subcategory", SubcategorySchema);