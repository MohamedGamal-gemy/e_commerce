const mongoose = require("mongoose");

// --- Product Schema 🛍️ ---
const ProductSchema = new mongoose.Schema(
  {
    // Basic Info
    // title: { type: String, required: true, trim: true, index: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, lowercase: true, unique: true, sparse: true },
    description: { type: String, required: true },
    shortDescription: { type: String, trim: true },

    // IDs & Pricing
    sku: { type: String, trim: true, index: true },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, min: 0 },

    // Discount
    discountType: {
      type: String,
      enum: ["percentage", "flat"],
      default: "percentage",
    },
    discountValue: { type: Number, min: 0, default: 0 },
    discountStart: Date,
    discountEnd: Date,
    discountIsActive: { type: Boolean, default: false },

    // Category
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subcategory",
      index: true,
    },

    // Images
    // mainImage: {
    //   // url: { type: String, required: true, trim: true },
    //   url: { type: String, trim: true },
    //   publicId: String,
    //   alt: String,
    // },

    // Variants aggregate
    variants: [{ type: mongoose.Schema.Types.ObjectId, ref: "ProductVariant" }],
    numVariants: { type: Number, default: 0 },
    totalStock: { type: Number, default: 0, index: true },
    isAvailable: { type: Boolean, default: true },
    colorNames: [{ type: String, index: true }],

    // Rating
    rating: { type: Number, default: 0, min: 0, max: 5 },
    numReviews: { type: Number, default: 0 },

    // Analytics
    views: { type: Number, default: 0 },
    purchases: { type: Number, default: 0 },
    isNewArrival: { type: Boolean, default: false },

    // Status
    status: {
      type: String,
      enum: ["draft", "active", "hidden", "archived"],
      default: "active",
      index: true,
    },
    isFeatured: { type: Boolean, default: false },
    featuredUntil: Date,

    // Inventory Rules
    minOrderQuantity: { type: Number, default: 1, min: 1 },
    maxOrderQuantity: { type: Number, min: 1 },
    allowBackorder: { type: Boolean, default: false },
    warrantyPeriod: String,

    // SEO
    metaTitle: String,
    metaDescription: String,
    keywords: [String],

    // Attributes & Tags
    attributes: [{ key: String, value: String }],
    tags: [String],
    searchableText: { type: String },

    // Auditing
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = ProductSchema;
