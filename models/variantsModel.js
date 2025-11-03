// const mongoose = require("mongoose");

// // ⚠️ Note: We get Product model inside the hooks to avoid circular dependency
// // const Product = require("./productModel"); // إزالة الاستدعاء هنا ونقله داخل الـ hooks

// // --- ProductVariant Schema Definition 📦 ---
// const ProductVariantSchema = new mongoose.Schema(
//   {
//     // Relationships
//     productId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Product",
//       required: true,
//     },
//     // Core Data
//     sku: { type: String, required: true, unique: true, trim: true }, // trim for consistency

//     color: {
//       name: { type: String, required: true, trim: true },
//       value: { type: String, required: true, trim: true }, // #000000 أو hex
//     },

//     // Stock/Availability
//     sizes: [
//       {
//         size: { type: String, required: true, trim: true },
//         stock: { type: Number, default: 0, min: 0 },
//       },
//     ],
    
//     // Display
//     images: [
//       {
//         url: { type: String, required: true, trim: true },
//         publicId: String,
//         alt: String,
//       },
//     ],

//     isDefault: { type: Boolean, default: false }, // مهم للعرض الافتراضي
//   },
//   { timestamps: true }
// );


// // --- ProductVariant Hooks (Middleware) 🎣 ---

// // 🎯 Helper function to get the Product model safely
// const getProductModel = () => mongoose.model("Product");

// // 📌 Post-save: Add variant ID to product and recalculate aggregates
// ProductVariantSchema.post("save", async function () {
//   const Product = getProductModel();
//   // $addToSet to avoid duplicates in variants array
//   await Product.findByIdAndUpdate(this.productId, {
//     $addToSet: { variants: this._id },
//   });
//   await Product.recalcAggregates(this.productId);
// });

// // 📌 Post-update: Recalculate aggregates on product
// ProductVariantSchema.post("findOneAndUpdate", async function (doc) {
//   if (doc) {
//     const Product = getProductModel();
//     await Product.recalcAggregates(doc.productId);
//   }
// });

// // 📌 Post-delete: Remove variant ID from product and recalculate aggregates
// ProductVariantSchema.post("findOneAndDelete", async function (doc) {
//   if (doc) {
//     const Product = getProductModel();
//     await Product.findByIdAndUpdate(doc.productId, {
//       $pull: { variants: doc._id }, // $pull to remove the variant ID
//     });
//     await Product.recalcAggregates(doc.productId);
//   }
// });


// // --- Export Model 📤 ---
// module.exports = mongoose.model("ProductVariant", ProductVariantSchema);