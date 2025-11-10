// // const mongoose = require("mongoose");
// // const slugify = require("slugify");

// // /**
// //  * Build a unified searchable text from product data
// //  * @param {Object} product - Product document or data object
// //  * @returns {string} - Lowercase searchable text
// //  */
// // function buildSearchableText(product) {
// //   const parts = [
// //     product.title,
// //     product.description,
// //     ...(product.tags || []),
// //     ...(product.attributes || []).map((a) => `${a.key || ""} ${a.value || ""}`),
// //   ];
// //   return parts.filter(Boolean).join(" ").toLowerCase().trim();
// // }

// // module.exports = (schema) => {
// //   // 🧩 دالة آمنة للحصول على موديل الـ Variant
// //   const getProductVariantModel = () => mongoose.model("ProductVariant");
// //   const getProductTypeModel = () => mongoose.model("ProductType");

// //   // ✅ Pre-save hook
// //   schema.pre("save", async function (next) {
// //     try {
// //       // 🔹 Generate slug automatically if not provided
// //       if (!this.slug && this.title) {
// //         const baseSlug = slugify(this.title, { lower: true, strict: true });
// //         const uniqueSuffix = this._id
// //           ? this._id.toString().slice(-6)
// //           : Date.now().toString().slice(-6);
// //         this.slug = `${baseSlug}-${uniqueSuffix}`;
// //       }

// //       // 🔹 Activate discount if dates are valid
// //       const now = new Date();
// //       this.discountIsActive =
// //         this.discountValue > 0 &&
// //         this.discountStart &&
// //         this.discountEnd &&
// //         now >= this.discountStart &&
// //         now <= this.discountEnd;

// //       // 🔹 Update searchableText automatically
// //       this.searchableText = buildSearchableText(this);

// //       next();
// //     } catch (err) {
// //       next(err);
// //     }
// //   });

// //   // ✅ Hook قبل تعديل المنتج (findOneAndUpdate)
// //   schema.pre("findOneAndUpdate", function (next) {
// //     const update = this.getUpdate();

// //     if (
// //       update.title ||
// //       update.description ||
// //       update.tags ||
// //       update.attributes
// //     ) {
// //       const newData = { ...update.$set, ...update };
// //       const searchableText = buildSearchableText(newData);
// //       this.setUpdate({
// //         ...update,
// //         $set: { ...update.$set, searchableText },
// //       });
// //     }

// //     next();
// //   });

// //   // ✅ Hook بعد حذف المنتج
// //   schema.post("findOneAndDelete", async function (doc) {
// //     if (!doc) return;

// //     const ProductVariant = getProductVariantModel();
// //     const ProductType = getProductTypeModel();

// //     const session = await mongoose.startSession();
// //     session.startTransaction();

// //     try {
// //       // 🔹 حذف كل الـ Variants التابعة للمنتج
// //       await ProductVariant.deleteMany({ productId: doc._id }, { session });

// //       // 🔹 تحديث عداد المنتجات في الـ productType
// //       if (doc.productType) {
// //         const count = await mongoose
// //           .model("Product")
// //           .countDocuments({ productType: doc.productType });
// //         await ProductType.findByIdAndUpdate(
// //           doc.productType,
// //           { productCount: count },
// //           { session }
// //         );
// //       }

// //       await session.commitTransaction();

// //       // 🔹 Invalidate cache after product deletion
// //       try {
// //         const ProductCacheService = require("../services/productCache.service");
// //         await ProductCacheService.invalidateCache(doc._id);
// //       } catch (cacheError) {
// //         console.error("❌ Cache invalidation error:", cacheError.message);
// //       }
// //     } catch (err) {
// //       await session.abortTransaction();
// //       console.error("❌ Product cleanup failed:", err);
// //     } finally {
// //       session.endSession();
// //     }
// //   });

// //   // ✅ Hook بعد حفظ المنتج لتحديث عداد المنتجات
// //   schema.post("save", async function (doc) {
// //     if (!doc.productType) return;

// //     const ProductType = getProductTypeModel();

// //     try {
// //       const count = await mongoose
// //         .model("Product")
// //         .countDocuments({ productType: doc.productType });
// //       await ProductType.findByIdAndUpdate(doc.productType, {
// //         productCount: count,
// //       });
// //     } catch (err) {
// //       console.error("❌ Failed to update productType count:", err);
// //     }
// //   });
// // };

// const mongoose = require("mongoose");
// const slugify = require("slugify");
// const { productQueue } = require("../../queues/productQueue"); // 👈 أضفنا الـ Queue

// /**
//  * Build a unified searchable text from product data
//  */
// function buildSearchableText(product) {
//   const parts = [
//     product.title,
//     product.description,
//     ...(product.tags || []),
//     ...(product.attributes || []).map((a) => `${a.key || ""} ${a.value || ""}`),
//   ];
//   return parts.filter(Boolean).join(" ").toLowerCase().trim();
// }

// module.exports = (schema) => {
//   const getProductVariantModel = () => mongoose.model("ProductVariant");
//   const getProductTypeModel = () => mongoose.model("ProductType");

//   // ✅ Pre-save hook
//   schema.pre("save", async function (next) {
//     try {
//       if (!this.slug && this.title) {
//         const baseSlug = slugify(this.title, { lower: true, strict: true });
//         const uniqueSuffix = this._id
//           ? this._id.toString().slice(-6)
//           : Date.now().toString().slice(-6);
//         this.slug = `${baseSlug}-${uniqueSuffix}`;
//       }

//       const now = new Date();
//       this.discountIsActive =
//         this.discountValue > 0 &&
//         this.discountStart &&
//         this.discountEnd &&
//         now >= this.discountStart &&
//         now <= this.discountEnd;

//       this.searchableText = buildSearchableText(this);
//       next();
//     } catch (err) {
//       next(err);
//     }
//   });

//   // ✅ Hook قبل findOneAndUpdate لتحديث searchableText
//   schema.pre("findOneAndUpdate", function (next) {
//     const update = this.getUpdate();

//     if (
//       update.title ||
//       update.description ||
//       update.tags ||
//       update.attributes
//     ) {
//       const newData = { ...update.$set, ...update };
//       const searchableText = buildSearchableText(newData);
//       this.setUpdate({
//         ...update,
//         $set: { ...update.$set, searchableText },
//       });
//     }

//     next();
//   });

//   // ✅ Hook بعد حذف المنتج — تحويله إلى Job بدل التنفيذ المباشر
//   schema.post("findOneAndDelete", async function (doc) {
//     if (!doc) return;

//     // 👇 أضف مهمة في الخلفية بدلاً من تنفيذ الحذف مباشرة
//     await productQueue.add("cleanupAfterDelete", {
//       productId: doc._id,
//       productType: doc.productType,
//     });
//   });

//   // ✅ Hook بعد حفظ المنتج — تحويل التحديث الثقيل إلى Job
//   schema.post("save", async function (doc) {
//     if (!doc.productType) return;

//     // 👇 أضف مهمة لتحديث عداد المنتجات
//     await productQueue.add("updateProductTypeCount", {
//       productType: doc.productType,
//     });
//   });
// };

// const mongoose = require("mongoose");
// const slugify = require("slugify");
// const { productQueue } = require("../../queues/productQueue");

// /**
//  * Build a unified searchable text from product data
//  */
// function buildSearchableText(product) {
//   const parts = [
//     product.title,
//     product.description,
//     ...(product.tags || []),
//     ...(product.attributes || []).map((a) => `${a.key || ""} ${a.value || ""}`),
//   ];
//   return parts.filter(Boolean).join(" ").toLowerCase().trim();
// }

// module.exports = (schema) => {
//   // ✅ Pre-save hook
//   schema.pre("save", async function (next) {
//     try {
//       if (!this.slug && this.title) {
//         const baseSlug = slugify(this.title, { lower: true, strict: true });
//         const uniqueSuffix = this._id
//           ? this._id.toString().slice(-6)
//           : Date.now().toString().slice(-6);
//         this.slug = `${baseSlug}-${uniqueSuffix}`;
//       }

//       const now = new Date();
//       this.discountIsActive =
//         this.discountValue > 0 &&
//         this.discountStart &&
//         this.discountEnd &&
//         now >= this.discountStart &&
//         now <= this.discountEnd;

//       this.searchableText = buildSearchableText(this);
//       next();
//     } catch (err) {
//       next(err);
//     }
//   });

//   // ✅ Hook قبل findOneAndUpdate لتحديث searchableText (التحسين)
//   schema.pre("findOneAndUpdate", function (next) {
//     const update = this.getUpdate();
//     const $set = update.$set || {};

//     const isUpdateRelevant =
//       update.title ||
//       $set.title ||
//       update.description ||
//       $set.description ||
//       update.tags ||
//       $set.tags ||
//       update.attributes ||
//       $set.attributes;

//     if (isUpdateRelevant) {
//       // ندمج الحقول المحدثة من الـ $set ومن الـ Root
//       const mergedData = { ...$set, ...update };
//       const searchableText = buildSearchableText(mergedData);

//       // نضمن تحديث searchableText في الـ $set
//       this.setUpdate({
//         ...update,
//         $set: { ...$set, searchableText },
//       });
//     }

//     next();
//   });

//   // ✅ Hook بعد حذف المنتج — إضافة Job منفصل لكل مهمة (التحسين)
//   schema.post("findOneAndDelete", async function (doc) {
//     if (!doc) return;

//     // 1. أضف مهمة في الخلفية لحذف المتغيرات التابعة (Clean-up)
//     await productQueue.add("cleanupAfterDelete", {
//       productId: doc._id,
//     });

//     // 2. أضف مهمة لتحديث عداد نوع المنتج
//     if (doc.productType) {
//       await productQueue.add("updateProductTypeCount", {
//         productType: doc.productType,
//       });
//     }
//   });

//   // ✅ Hook بعد حفظ المنتج — تحويل التحديث الثقيل إلى Job
//   schema.post("save", async function (doc) {
//     if (!doc.productType) return;

//     // أضف مهمة لتحديث عداد المنتجات
//     await productQueue.add("updateProductTypeCount", {
//       productType: doc.productType,
//     });
//   });
// };



const { productQueue } = require("../../queues/productQueue");

module.exports = (schema) => {
  schema.post("findOneAndDelete", async function (doc) {
    if (!doc) return;

    await productQueue.add("cleanupAfterDelete", { productId: doc._id });
    if (doc.productType) {
      await productQueue.add("updateProductTypeCount", {
        productType: doc.productType,
      });
    }
  });

  schema.post("save", async function (doc) {
    if (!doc.productType) return;
    await productQueue.add("updateProductTypeCount", {
      productType: doc.productType,
    });
  });
};
