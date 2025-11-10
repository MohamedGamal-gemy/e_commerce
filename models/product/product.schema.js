const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    // Basic Info
    title: { type: String, required: true, trim: true },
    slug: { type: String, lowercase: true },
    description: { type: String, required: true },

    // IDs & Pricing
    sku: { type: String, trim: true },
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
    //
    productType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductType",
      index: true,
      required: true,
    },
    mainImage: String,
    colors: [{ name: String, value: String, image: String }],

    // Variants
    variants: [{ type: mongoose.Schema.Types.ObjectId, ref: "ProductVariant" }],

    numVariants: { type: Number, default: 0 },
    totalStock: { type: Number, default: 0, index: true },
    isAvailable: { type: Boolean, default: true },

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

ProductSchema.set("toJSON", { virtuals: true });
ProductSchema.set("toObject", { virtuals: true });

module.exports = ProductSchema;
