// // // productVariant.hooks.js
// // const mongoose = require("mongoose");
// // const ProductVariantSchema = require("./variant.schema");

// // const getProductModel = () => {
// //   try { return mongoose.model("Product"); }
// //   catch { return require("../product"); }
// // };

// // // 🔹 helper function لتقليل التكرار
// // async function updateProductAggregates(variant) {
// //   const Product = getProductModel();
// //   const variants = await variant.constructor.find({ productId: variant.productId });

// //   const mainImage = variants[0]?.images[0]?.url || null;
// //   const colors = variants.map(v => ({
// //     name: v.color.name,
// //     value: v.color.value,
// //     image: v.images[0]?.url || null,
// //   }));

// //   await Product.findByIdAndUpdate(variant.productId, {
// //     mainImage,
// //     colors,
// //     variants: variants.map(v => v._id)
// //   });

// //   if (typeof Product.recalcAggregates === "function") {
// //     await Product.recalcAggregates(variant.productId);
// //   }
// // }

// // // 🔹 Hooks
// // ProductVariantSchema.post("save", async function () {
// //   try { await updateProductAggregates(this); }
// //   catch (err) { console.error("❌ post-save hook error:", err); }
// // });

// // ProductVariantSchema.post("findOneAndUpdate", async function (doc) {
// //   if (!doc) return;
// //   try { await updateProductAggregates(doc); }
// //   catch (err) { console.error("❌ post-update hook error:", err); }
// // });

// // ProductVariantSchema.post("findOneAndDelete", async function (doc) {
// //   if (!doc) return;
// //   try {
// //     const Product = getProductModel();
// //     await Product.findByIdAndUpdate(doc.productId, { $pull: { variants: doc._id } });
// //     await updateProductAggregates(doc);
// //   } catch (err) { console.error("❌ post-delete hook error:", err); }
// // });

// // // 🔹 لا حاجة لتصدير helper لأنها خاصة بالـ hooks
// // module.exports = ProductVariantSchema;

// const mongoose = require("mongoose");
// const ProductVariantSchema = require("./variant.schema");
// const { productQueue } = require("../../queues/productQueue"); // استيراد الـ Queue

// const getProductModel = () => {
//   try {
//     return mongoose.model("Product");
//   } catch {
//     return require("../product");
//   }
// };

// // ❌ تم حذف دالة updateProductAggregates helper لأنها أصبحت Job

// // 🔹 Hooks
// ProductVariantSchema.post("save", async function (doc) {
//   if (!doc) return;
//   try {
//     // ✅ تحويل تحديث Aggregates إلى Job
//     await productQueue.add(
//       "updateProductAggregates",
//       { productId: doc.productId },
//       { jobId: `aggregates:${doc.productId.toString()}` }
//     );
//   } catch (err) {
//     console.error("❌ post-save hook error:", err);
//   }
// });

// ProductVariantSchema.post("findOneAndUpdate", async function (doc) {
//   if (!doc) return;
//   try {
//     // ✅ تحويل تحديث Aggregates إلى Job
//     await productQueue.add(
//       "updateProductAggregates",
//       { productId: doc.productId },
//       { jobId: `aggregates:${doc.productId.toString()}` }
//     );
//   } catch (err) {
//     console.error("❌ post-update hook error:", err);
//   }
// });

// ProductVariantSchema.post("findOneAndDelete", async function (doc) {
//   if (!doc) return;
//   try {
//     const Product = getProductModel();
//     // إزالة الـ ID من قائمة المتغيرات يتم هنا مباشرة لأنه سريع
//     await Product.findByIdAndUpdate(doc.productId, {
//       $pull: { variants: doc._id },
//     });

//     // ✅ تحويل تحديث Aggregates إلى Job
//     await productQueue.add(
//       "updateProductAggregates",
//       { productId: doc.productId },
//       { jobId: `aggregates:${doc.productId.toString()}` }
//     );
//   } catch (err) {
//     console.error("❌ post-delete hook error:", err);
//   }
// });

// module.exports = ProductVariantSchema;

const mongoose = require("mongoose");
const ProductVariantSchema = require("./variant.schema");
const { productQueue } = require("../../queues/productQueue");

// ProductVariantSchema.post("save", async function (doc) {
//   if (!doc) return;
//   await productQueue.add(
//     "updateProductAggregates",
//     { productId: doc.productId },
//     { jobId: `aggregates_${doc.productId.toString()}` }
//   );
// });

// ProductVariantSchema.post("findOneAndUpdate", async function (doc) {
//   if (!doc) return;
//   await productQueue.add(
//     "updateProductAggregates",
//     { productId: doc.productId },
//     { jobId: `aggregates_${doc.productId.toString()}` }
//   );
// });

// ProductVariantSchema.post("findOneAndDelete", async function (doc) {
//   if (!doc) return;
//   const Product = mongoose.model("Product");
//   await Product.findByIdAndUpdate(doc.productId, {
//     $pull: { variants: doc._id },
//   });

//   await productQueue.add(
//     "updateProductAggregates",
//     { productId: doc.productId },
//     { jobId: `aggregates_${doc.productId.toString()}` }
//   );
// });

module.exports = ProductVariantSchema;
