// const mongoose = require("mongoose");
// // const ProductVariant = require("./variantsModel"); // 💡 إزالة الاستدعاء هنا لمنع الاعتماد الدائري

// // 🎯 Helper function to get the ProductVariant model safely
// const getProductVariantModel = () => mongoose.model("ProductVariant");

// // --- Product Schema Definition 🛍️ ---
// const ProductSchema = new mongoose.Schema(
//   {
//     // Basic Info
//     title: { type: String, required: true, trim: true, index: true },
//     slug: { type: String, lowercase: true, unique: true, sparse: true }, // sparse: true if sku is optional
//     description: { type: String, required: true },
//     shortDescription: { type: String, trim: true },

//     // Core ID
//     sku: { type: String, unique: true, sparse: true, trim: true },

//     // Pricing & Discount
//     price: { type: Number, required: true, min: 0 },
//     originalPrice: { type: Number, min: 0 },
//     discountType: {
//       type: String,
//       enum: ["percentage", "flat"],
//       default: "percentage",
//     },
//     discountValue: { type: Number, min: 0, default: 0 },
//     discountStart: { type: Date },
//     discountEnd: { type: Date },
//     discountIsActive: { type: Boolean, default: false },

//     // Categorization
//     category: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Category",
//       required: true,
//       index: true,
//     },
//     subcategory: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Subcategory",
//       index: true,
//     },

//     // Display & Imagery
//     mainImage: {
//       url: { type: String, required: true, trim: true },
//       publicId: String,
//       alt: String,
//     },

//     // Variant Aggregates (Updated by ProductVariant hooks)
//     variants: [{ type: mongoose.Schema.Types.ObjectId, ref: "ProductVariant" }],
//     numVariants: { type: Number, default: 0 },
//     totalStock: { type: Number, default: 0, index: true },
//     isAvailable: { type: Boolean, default: true },
//     colorNames: [{ type: String, index: true }], // Unique color names for filtering

//     // Option Lists (Optional: only needed if you want to store *all possible* options,
//     // but colorNames/sizeOptions from Variants is often better)
//     colorOptions: [{ type: String }],
//     sizeOptions: [{ type: String }],

//     // Review & Rating
//     rating: { type: Number, default: 0, min: 0, max: 5 },
//     numReviews: { type: Number, default: 0 },
//     reviewEnabled: { type: Boolean, default: true },

//     // Analytics & Popularity
//     views: { type: Number, default: 0 },
//     purchases: { type: Number, default: 0 },
//     favorites: { type: Number, default: 0 },
//     shares: { type: Number, default: 0 },
//     lastViewedAt: { type: Date },
//     lastPurchasedAt: { type: Date },
//     isNewArrival: { type: Boolean, default: false },

//     // Status & Marketing
//     status: {
//       type: String,
//       enum: ["draft", "active", "hidden", "archived"],
//       default: "active",
//       index: true,
//     },
//     isFeatured: { type: Boolean, default: false },
//     featuredUntil: { type: Date },

//     // Related Products
//     relatedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
//     upsellProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],

//     // Ordering/Inventory Rules
//     minOrderQuantity: { type: Number, default: 1, min: 1 },
//     maxOrderQuantity: { type: Number, min: 1 },
//     allowBackorder: { type: Boolean, default: false },
//     warrantyPeriod: { type: String, trim: true },

//     // Metadata & SEO
//     metaTitle: String,
//     metaDescription: String,
//     keywords: [String],

//     // Specifications & Tags
//     attributes: [{ key: String, value: String }],
//     tags: [String],
//     searchableText: { type: String, index: "text" }, // Text index on this field only

//     // Auditing
//     createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
//     updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
//   },
//   { timestamps: true }
// );

// // --- Virtuals ⚡ ---

// ProductSchema.virtual("finalPrice").get(function () {
//   if (!this.discountIsActive) return this.price;
//   return this.discountType === "percentage"
//     ? this.price * (1 - this.discountValue / 100)
//     : this.price - this.discountValue;
// });

// ProductSchema.virtual("discountPercentage").get(function () {
//   if (!this.originalPrice || this.originalPrice <= this.price) return 0;
//   return Math.round(
//     ((this.originalPrice - this.price) / this.originalPrice) * 100
//   );
// });

// // Virtual for getting the default variant easily
// ProductSchema.virtual("defaultVariant", {
//   ref: "ProductVariant",
//   localField: "_id",
//   foreignField: "productId",
//   justOne: true,
//   match: { isDefault: true },
// });

// // Virtual for getting all available colors from populated variants
// ProductSchema.virtual("allColors").get(function () {
//   if (!this.populated("variants")) return [];
//   // Use map to get color names, then Set for uniqueness
//   return [...new Set(this.variants.map((v) => v.color.name))];
// });

// // Virtual for getting all available sizes from populated variants
// ProductSchema.virtual("allSizes").get(function () {
//   const sizes = new Set();
//   if (this.populated("variants")) {
//     this.variants.forEach((v) => v.sizes.forEach((s) => sizes.add(s.size)));
//   }
//   return Array.from(sizes);
// });

// // --- Statics (Helper Methods) 📊 ---

// // Recalculates totalStock, numVariants, isAvailable, and colorNames
// ProductSchema.statics.recalcAggregates = async function (productId) {
//   const ProductVariant = getProductVariantModel();
//   const variants = await ProductVariant.find({ productId }).lean();

//   let totalStock = 0;
//   const colorNames = [];

//   variants.forEach((variant) => {
//     if (Array.isArray(variant.sizes)) {
//       // Safely aggregate stock
//       totalStock += variant.sizes.reduce(
//         (sum, size) => sum + Number(size.stock || 0),
//         0
//       );
//     }
//     if (variant.color?.name) {
//       // Collect color names
//       colorNames.push(variant.color.name.toLowerCase());
//     }
//   });

//   const numVariants = variants.length;
//   const isAvailable = totalStock > 0;

//   await this.findByIdAndUpdate(productId, {
//     totalStock,
//     numVariants,
//     isAvailable,
//     colorNames: [...new Set(colorNames)], // Unique color names
//   });
// };

// // Recalculates rating and numReviews (Assumes 'Review' model exists)
// ProductSchema.statics.updateProductRating = async function (productId) {
//   const Review = mongoose.model("Review"); // Get Review model
//   const stats = await Review.aggregate([
//     { $match: { product: mongoose.Types.ObjectId(productId) } },
//     {
//       $group: { _id: null, avgRating: { $avg: "$rating" }, count: { $sum: 1 } },
//     },
//   ]);

//   const avg = stats[0]?.avgRating ?? 0;
//   const count = stats[0]?.count ?? 0;

//   await this.findByIdAndUpdate(productId, {
//     rating: Number(avg.toFixed(1)), // Round to one decimal place
//     numReviews: count,
//   });
// };

// // --- Hooks (Middleware) 🎣 ---

// ProductSchema.pre("save", async function (next) {
//   try {
//     // 1. Slug Generation
//     if (!this.slug && this.title) {
//       const base = this.title
//         .toLowerCase()
//         .replace(/[^a-z0-9]+/g, "-")
//         .replace(/^-+|-+$/g, "");
//       // Append last 6 characters of ID or current time for uniqueness
//       this.slug = `${base}-${
//         this._id
//           ? this._id.toString().slice(-6)
//           : Date.now().toString().slice(-6)
//       }`;
//     }

//     // 2. Discount Status
//     const now = new Date();
//     this.discountIsActive =
//       this.discountValue > 0 &&
//       this.discountStart &&
//       this.discountEnd &&
//       now >= this.discountStart &&
//       now <= this.discountEnd;

//     // 3. Searchable Text Aggregation
//     this.searchableText = [
//       this.title,
//       this.shortDescription,
//       this.description,
//       ...(this.tags || []),
//       ...(this.attributes || []).map((a) => a.value),
//     ]
//       .filter(Boolean) // Remove null/undefined/empty strings
//       .join(" ")
//       .toLowerCase();

//     next();
//   } catch (err) {
//     next(err);
//   }
// });

// // Post-delete: Clean up all related ProductVariants
// ProductSchema.post("findOneAndDelete", async function (doc) {
//   if (doc) {
//     const ProductVariant = getProductVariantModel();
//     // Delete all variants associated with the deleted product
//     await ProductVariant.deleteMany({ productId: doc._id });
//   }
// });

// // --- Indexes 🔑 ---

// // ProductSchema.index({ slug: 1 });
// ProductSchema.index({ status: 1, isAvailable: 1 });
// ProductSchema.index({ price: 1 });
// ProductSchema.index({ category: 1, subcategory: 1 });
// ProductSchema.index({ isFeatured: 1, createdAt: -1 });
// ProductSchema.index({ colorOptions: 1 });
// ProductSchema.index({ sizeOptions: 1 });
// ProductSchema.index({ totalStock: -1 });
// ProductSchema.index(
//   {
//     title: "text",
//     description: "text",
//     searchableText: "text", // searchableText is enough for a general text index
//   },
//   {
//     weights: { title: 10, description: 5, searchableText: 3 },
//   }
// );

// // --- Export Model 📤 ---
// module.exports = mongoose.model("Product", ProductSchema);
