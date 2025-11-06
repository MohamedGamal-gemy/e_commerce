const mongoose = require("mongoose");

const ProductVariantSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    sku: { 
      type: String, 
      trim: true, 
      index: true,
      sparse: true,
    },
    color: {
      name: { 
        type: String, 
        required: true, 
        trim: true,
        index: true,
      },
      value: { 
        type: String, 
        required: true, 
        trim: true, 
        lowercase: true,
      },
    },
    sizes: [
      {
        size: { 
          type: String, 
          required: true, 
          trim: true,
          uppercase: true,
        },
        stock: { 
          type: Number, 
          default: 0, 
          min: 0,
        },
      },
    ],
    images: [
      {
        url: { 
          type: String, 
          required: true, 
          trim: true,
        },
        publicId: { 
          type: String,
          trim: true,
        },
        alt: { 
          type: String,
          trim: true,
        },
      },
    ],
    isDefault: { 
      type: Boolean, 
      default: false,
      index: true,
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Helper function to safely get Product model
const getProductModel = () => {
  try {
    return mongoose.model("Product");
  } catch (err) {
    // If model not registered yet, require it
    return require("../product");
  }
};

// Hooks
ProductVariantSchema.post("save", async function () {
  try {
    const Product = getProductModel();
    const product = await Product.findById(this.productId);
    if (!product) return;

    // Add variant ID to product's variants array if not already present
    await Product.findByIdAndUpdate(this.productId, {
      $addToSet: { variants: this._id },
    });

    // Recalculate aggregates (stock, colors, etc.)
    await Product.recalcAggregates(this.productId);

    // Invalidate cache for this product
    try {
      const ProductCacheService = require("../services/productCache.service");
      await ProductCacheService.invalidateVariantCache(this.productId);
    } catch (cacheError) {
      // Don't fail if cache invalidation fails
      console.error("❌ Cache invalidation error:", cacheError.message);
    }
  } catch (err) {
    console.error("❌ ProductVariant post-save hook error:", err);
  }
});

ProductVariantSchema.post("findOneAndUpdate", async function (doc) {
  if (!doc) return;
  
  try {
    const Product = getProductModel();
    await Product.recalcAggregates(doc.productId);

    // Invalidate cache for this product
    try {
      const ProductCacheService = require("../services/productCache.service");
      await ProductCacheService.invalidateVariantCache(doc.productId);
    } catch (cacheError) {
      console.error("❌ Cache invalidation error:", cacheError.message);
    }
  } catch (err) {
    console.error("❌ ProductVariant post-update hook error:", err);
  }
});

ProductVariantSchema.post("findOneAndDelete", async function (doc) {
  if (!doc) return;
  
  try {
    const Product = getProductModel();
    // Remove variant ID from product's variants array
    await Product.findByIdAndUpdate(doc.productId, {
      $pull: { variants: doc._id },
    });
    // Recalculate aggregates
    await Product.recalcAggregates(doc.productId);

    // Invalidate cache for this product
    try {
      const ProductCacheService = require("../services/productCache.service");
      await ProductCacheService.invalidateVariantCache(doc.productId);
    } catch (cacheError) {
      console.error("❌ Cache invalidation error:", cacheError.message);
    }
  } catch (err) {
    console.error("❌ ProductVariant post-delete hook error:", err);
  }
});

ProductVariantSchema.post("deleteMany", async function () {
  // This hook is called after deleteMany operations
  // Note: This hook doesn't receive the deleted documents
  // Recalculation should be handled manually after bulk deletes
});

module.exports = ProductVariantSchema;
