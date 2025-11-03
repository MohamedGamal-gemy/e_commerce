// // const mongoose = require("mongoose");

// // const CategorySchema = new mongoose.Schema({
// //   name: { type: String, unique: true, required: true, trim: true },
// // });

// // const Category = mongoose.model("Category", CategorySchema);

// // module.exports = Category;

// const mongoose = require("mongoose");

// const CategorySchema = new mongoose.Schema(
//   {
//     name: { type: String, unique: true, required: true, trim: true },
//     slug: { type: String, unique: true, lowercase: true, index: true },

//     description: { type: String, trim: true },
//     image: { url: String, publicId: String },

//     isActive: { type: Boolean, default: true, index: true },
//     isFeatured: { type: Boolean, default: false },

//     metaTitle: String,
//     metaDescription: String,
//     keywords: [String],
//   },
//   { timestamps: true }
// );

// // auto-generate slug
// CategorySchema.pre("save", function (next) {
//   if (!this.slug && this.name) {
//     const base = this.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
//     this.slug = `${base}-${this._id ? this._id.toString().slice(-6) : Date.now().toString().slice(-6)}`;
//   }
//   next();
// });

// const Category = mongoose.model("Category", CategorySchema);
// module.exports = Category;
