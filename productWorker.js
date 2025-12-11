// // require("dotenv").config();
// // const { Worker } = require("bullmq");
// // const { connection } = require("../../config/redis");
// // const cloudinary = require("cloudinary").v2;
// // const Product = require("../../models/product");
// // const ProductVariant = require("../../models/productVariant");
// // const connectToDB = require("../../config/db");

// // cloudinary.config({
// //   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
// //   api_key: process.env.CLOUDINARY_API_KEY,
// //   api_secret: process.env.CLOUDINARY_API_SECRET,
// // });

// // // Connect to MongoDB for the worker process
// // connectToDB();

// // const worker = new Worker(
// //   "productQueue",
// //   async (job) => {
// //     const { name, data } = job;
// //     try {
// //       switch (name) {
// //         case "uploadProductImages": {
// //           const { productId, variants } = data;
// //           console.log(`🧩 uploadProductImages -> productId=${productId}, variants=${variants?.length}`);

// //           const createdVariantIds = [];
// //           const colorEntries = [];
// //           let mainImage = null;

// //           for (let idx = 0; idx < (variants?.length || 0); idx++) {
// //             const variant = variants[idx];
// //             const uploadedImages = [];

// //             console.log(
// //               `   ▶ variant[${idx}] images=${variant?.images?.length || 0}, firstPath=${variant?.images?.[0]?.path || "-"}`
// //             );

// //             if (!variant?.images?.length) {
// //               console.error(`❌ Variant ${idx} has no images in payload, skipping`);
// //               continue;
// //             }

// //             for (const img of variant.images) {
// //               if (!img?.path) {
// //                 console.error("❌ Missing file path in job payload, skipping image");
// //                 continue;
// //               }

// //               const res = await cloudinary.uploader.upload(img.path, {
// //                 folder: `products/${productId}/${variant.color?.name || "default"}`,
// //               });
// //               uploadedImages.push({
// //                 url: res.secure_url,
// //                 publicId: res.public_id,
// //                 alt: variant.color?.name || "",
// //               });

// //               try {
// //                 const fs = require("fs");
// //                 fs.unlink(img.path, () => {});
// //               } catch (_) {}
// //             }

// //             if (!uploadedImages.length) {
// //               console.error(`❌ Variant ${idx} upload produced 0 images, skipping variant creation`);
// //               continue;
// //             }

// //             const createdVariant = await ProductVariant.create({
// //               productId,
// //               color: variant.color,
// //               sizes: variant.sizes,
// //               images: uploadedImages,
// //               isDefault: variant.isDefault || false,
// //             });

// //             createdVariantIds.push(createdVariant._id);

// //             const firstImgUrl = uploadedImages[0]?.url || null;
// //             colorEntries.push({
// //               name: variant.color?.name || "",
// //               value: variant.color?.value || "",
// //               image: firstImgUrl,
// //             });

// //             if (!mainImage || variant.isDefault) {
// //               mainImage = firstImgUrl || mainImage;
// //             }
// //           }

// //           if (!createdVariantIds.length) {
// //             console.error("❌ No variants were created. Aborting product update.");
// //             return;
// //           }

// //           const totalVariants = createdVariantIds.length;
// //           await Product.findByIdAndUpdate(
// //             productId,
// //             {
// //               variants: createdVariantIds,
// //               numVariants: totalVariants,
// //               ...(colorEntries.length > 0 ? { colors: colorEntries } : {}),
// //               ...(mainImage ? { mainImage } : {}),
// //             },
// //             { new: false }
// //           );
// //           console.log(`✅ Product ${productId} updated with ${totalVariants} variants`);
// //           break;
// //         }
// //         case "updateProductTypeCount": {
// //           // Optional: ignore silently for now
// //           return;
// //         }
// //         case "updateProductAggregates": {
// //           const { productId } = data || {};
// //           if (!productId) return;
// //           const variants = await ProductVariant.find({ productId }).lean();
// //           const variantIds = variants.map((v) => v._id);

// //           const colors = variants.map((v) => ({
// //             name: v.color?.name || "",
// //             value: v.color?.value || "",
// //             image: v.images?.[0]?.url || null,
// //           }));

// //           const mainImage = variants.find((v) => v.isDefault)?.images?.[0]?.url || variants[0]?.images?.[0]?.url || null;

// //           const totalStock = variants.reduce(
// //             (acc, v) => acc + (v.sizes || []).reduce((s, sz) => s + (Number(sz.stock) || 0), 0),
// //             0
// //           );
// //           const isAvailable = totalStock > 0;

// //           await Product.findByIdAndUpdate(
// //             productId,
// //             {
// //               variants: variantIds,
// //               numVariants: variantIds.length,
// //               colors,
// //               ...(mainImage ? { mainImage } : {}),
// //               totalStock,
// //               isAvailable,
// //             },
// //             { new: false }
// //           );
// //           return;
// //         }
// //         case "cleanupAfterDelete": {
// //           // Deletions are handled transactionally in the service layer.
// //           // Keep this as a no-op to avoid warnings and future-proof if needed.
// //           return;
// //         }
// //         default:
// //           console.log("⚠️ Unknown job:", name);
// //       }
// //     } catch (err) {
// //       console.error("❌ Worker job error:", err);
// //       throw err;
// //     }
// //   },
// //   { connection }
// // );

// // console.log("🟢 Product Worker running...");

// // require("dotenv").config();
// // const { Worker } = require("bullmq");
// // const { connection } = require("../../config/redis");
// // const cloudinary = require("cloudinary").v2;
// // const Product = require("../../models/product");
// // const ProductVariant = require("../../models/productVariant");
// // const connectToDB = require("../../config/db");

// // // Connect to MongoDB in worker process
// // connectToDB();

// // cloudinary.config({
// //   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
// //   api_key: process.env.CLOUDINARY_API_KEY,
// //   api_secret: process.env.CLOUDINARY_API_SECRET,
// // });

// // const worker = new Worker(
// //   "productQueue",
// //   async (job) => {
// //     const { name, data } = job;
// //     console.log(`⚙️ Worker Job: ${name}`);

// //     try {
// //       switch (name) {
// //         // ==========================================================
// //         // 1) UPLOAD PRODUCT IMAGES + CREATE VARIANTS
// //         // ==========================================================
// //         case "uploadProductImages": {
// //           const { productId, variants } = data;
// //           console.log(`🧩 uploadProductImages -> productId=${productId}`);

// //           const createdVariantIds = [];
// //           const colorEntries = [];
// //           let mainImage = null;

// //           for (let idx = 0; idx < (variants?.length || 0); idx++) {
// //             const variant = variants[idx];

// //             const uploadedImages = [];

// //             for (const img of variant.images || []) {
// //               if (!img?.path) continue;

// //               const res = await cloudinary.uploader.upload(img.path, {
// //                 folder: `products/${productId}/${
// //                   variant.color?.name || "default"
// //                 }`,
// //               });

// //               uploadedImages.push({
// //                 url: res.secure_url,
// //                 publicId: res.public_id,
// //                 alt: variant.color?.name || "",
// //               });

// //               try {
// //                 const fs = require("fs");
// //                 fs.unlink(img.path, () => {});
// //               } catch (_) {}
// //             }

// //             if (!uploadedImages.length) continue;

// //             const createdVariant = await ProductVariant.create({
// //               productId,
// //               color: variant.color,
// //               sizes: variant.sizes,
// //               images: uploadedImages,
// //               isDefault: variant.isDefault || false,
// //             });

// //             createdVariantIds.push(createdVariant._id);

// //             colorEntries.push({
// //               name: variant.color?.name || "",
// //               value: variant.color?.value || "",
// //               image: uploadedImages[0]?.url || null,
// //             });

// //             if (!mainImage || variant.isDefault) {
// //               mainImage = uploadedImages[0]?.url;
// //             }
// //           }

// //           await Product.findByIdAndUpdate(
// //             productId,
// //             {
// //               variants: createdVariantIds,
// //               numVariants: createdVariantIds.length,
// //               colors: colorEntries,
// //               mainImage,
// //             },
// //             { new: false }
// //           );

// //           console.log(`✅ Variants created: ${createdVariantIds.length}`);
// //           break;
// //         }

// //         // ==========================================================
// //         // 2) RECALCULATE STOCK
// //         // ==========================================================
// //         case "recalculateStock": {
// //           const { productId } = data;
// //           if (!productId) return;

// //           const variants = await ProductVariant.find({ productId }).lean();
// //           const variantIds = variants.map((v) => v._id);

// //           const colors = variants.map((v) => ({
// //             name: v.color?.name || "",
// //             value: v.color?.value || "",
// //             image: v.images?.[0]?.url || null,
// //           }));

// //           const mainImage =
// //             variants.find((v) => v.isDefault)?.images?.[0]?.url ||
// //             variants[0]?.images?.[0]?.url ||
// //             null;

// //           const totalStock = variants.reduce(
// //             (acc, v) =>
// //               acc +
// //               (v.sizes || []).reduce(
// //                 (sum, sz) => sum + (Number(sz.stock) || 0),
// //                 0
// //               ),
// //             0
// //           );

// //           await Product.findByIdAndUpdate(
// //             productId,
// //             {
// //               variants: variantIds,
// //               numVariants: variantIds.length,
// //               colors,
// //               mainImage,
// //               totalStock,
// //               isAvailable: totalStock > 0,
// //             },
// //             { new: false }
// //           );

// //           console.log(`🔄 recalculateStock -> OK`);
// //           return;
// //         }

// //         // ==========================================================
// //         // 3) UPDATE PRODUCT TYPE COUNT
// //         // ==========================================================
// //         case "updateProductTypeCount": {
// //           const { productType } = data;
// //           if (!productType) return;

// //           const count = await Product.countDocuments({ productType });

// //           const ProductType = require("../../models/productType");
// //           await ProductType.findByIdAndUpdate(productType, {
// //             numProducts: count,
// //           });

// //           console.log(
// //             `📊 updateProductTypeCount -> productType=${productType}, count=${count}`
// //           );
// //           return;
// //         }

// //         // ==========================================================
// //         // 4) DELETE VARIANTS + CLOUDINARY IMAGES + REVIEWS
// //         // ==========================================================
// //         case "cleanupAfterDelete": {
// //           const { productId } = data;
// //           if (!productId) return;

// //           const variants = await ProductVariant.find({ productId });

// //           for (const v of variants) {
// //             for (const img of v.images || []) {
// //               if (img.publicId) {
// //                 try {
// //                   await cloudinary.uploader.destroy(img.publicId);
// //                 } catch (err) {
// //                   console.error("❌ Cloudinary error:", err.message);
// //                 }
// //               }
// //             }
// //           }

// //           await ProductVariant.deleteMany({ productId });

// //           try {
// //             const Review = require("../../models/review");
// //             await Review.deleteMany({ product: productId });
// //           } catch (_) {}

// //           console.log(`🧹 cleanupAfterDelete -> Done`);
// //           return;
// //         }

// //         // ==========================================================
// //         // OLD (OPTIONAL): updateProductAggregates
// //         // ==========================================================
// //         case "updateProductAggregates": {
// //           const { productId } = data;
// //           if (!productId) return;

// //           const variants = await ProductVariant.find({ productId }).lean();
// //           const variantIds = variants.map((v) => v._id);

// //           const colors = variants.map((v) => ({
// //             name: v.color?.name || "",
// //             value: v.color?.value || "",
// //             image: v.images?.[0]?.url || null,
// //           }));

// //           const mainImage =
// //             variants.find((v) => v.isDefault)?.images?.[0]?.url ||
// //             variants[0]?.images?.[0]?.url ||
// //             null;

// //           const totalStock = variants.reduce(
// //             (acc, v) =>
// //               acc +
// //               (v.sizes || []).reduce(
// //                 (sum, sz) => sum + (Number(sz.stock) || 0),
// //                 0
// //               ),
// //             0
// //           );

// //           await Product.findByIdAndUpdate(
// //             productId,
// //             {
// //               variants: variantIds,
// //               numVariants: variantIds.length,
// //               colors,
// //               mainImage,
// //               totalStock,
// //               isAvailable: totalStock > 0,
// //             },
// //             { new: false }
// //           );

// //           return;
// //         }

// //         // ==========================================================
// //         default:
// //           console.log("⚠️ Unknown job:", name);
// //       }
// //     } catch (err) {
// //       console.error("❌ Worker job error:", err);
// //       throw err;
// //     }
// //   },
// //   { connection }
// // );

// // console.log("🟢 Product Worker running...");

// require("dotenv").config();
// const { Worker } = require("bullmq");
// const { connection } = require("../../config/redis");
// const cloudinary = require("cloudinary").v2;
// const Product = require("../../models/product");
// const ProductVariant = require("../../models/productVariant");
// const connectToDB = require("../../config/db");

// // Connect to MongoDB in worker process
// connectToDB();

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// const worker = new Worker(
//   "productQueue",
//   async (job) => {
//     const { name, data } = job;
//     console.log(`⚙️ Worker Job: ${name}`);

//     try {
//       switch (name) {
//         // ==========================================================
//         // 1) UPLOAD PRODUCT IMAGES + CREATE VARIANTS
//         // ==========================================================
//         case "uploadProductImages": {
//           const { productId, variants } = data;
//           if (!variants?.length) break;

//           const createdVariantIds = [];
//           const colorEntries = [];
//           let mainImage = null;

//           for (const variant of variants) {
//             const uploadedImages = [];
//             for (const img of variant.images || []) {
//               if (!img?.path) continue;

//               const res = await cloudinary.uploader.upload(img.path, {
//                 folder: `products/${productId}/${
//                   variant.color?.name || "default"
//                 }`,
//               });

//               uploadedImages.push({
//                 url: res.secure_url,
//                 publicId: res.public_id,
//                 alt: variant.color?.name || "",
//               });

//               try {
//                 require("fs").unlink(img.path, () => {});
//               } catch (_) {}
//             }

//             if (!uploadedImages.length) continue;

//             const createdVariant = await ProductVariant.create({
//               productId,
//               color: variant.color,
//               sizes: variant.sizes,
//               images: uploadedImages,
//               isDefault: variant.isDefault || false,
//             });

//             createdVariantIds.push(createdVariant._id);

//             colorEntries.push({
//               name: variant.color?.name || "",
//               value: variant.color?.value || "",
//               image: uploadedImages[0]?.url || null,
//             });

//             if (!mainImage || variant.isDefault)
//               mainImage = uploadedImages[0]?.url;
//           }

//           await Product.findByIdAndUpdate(productId, {
//             variants: createdVariantIds,
//             numVariants: createdVariantIds.length,
//             colors: colorEntries,
//             mainImage,
//           });

//           console.log(`✅ Variants created: ${createdVariantIds.length}`);
//           break;
//         }

//         // ==========================================================
//         // 2) RECALCULATE STOCK
//         // ==========================================================
//         case "recalculateStock": {
//           const { productId } = data;
//           if (!productId) break;

//           const variants = await ProductVariant.find({ productId }).lean();
//           const variantIds = variants.map((v) => v._id);

//           const colors = variants.map((v) => ({
//             name: v.color?.name || "",
//             value: v.color?.value || "",
//             image: v.images?.[0]?.url || null,
//           }));

//           const mainImage =
//             variants.find((v) => v.isDefault)?.images?.[0]?.url ||
//             variants[0]?.images?.[0]?.url ||
//             null;

//           const totalStock = variants.reduce(
//             (acc, v) =>
//               acc +
//               (v.sizes || []).reduce(
//                 (sum, sz) => sum + (Number(sz.stock) || 0),
//                 0
//               ),
//             0
//           );

//           // Use updateOne instead of findByIdAndUpdate to avoid triggering hooks
//           // This prevents infinite loops with post hooks
//           await Product.updateOne(
//             { _id: productId },
//             {
//               $set: {
//                 variants: variantIds,
//                 numVariants: variantIds.length,
//                 colors,
//                 mainImage,
//                 totalStock,
//                 isAvailable: totalStock > 0,
//               },
//             }
//           );

//           console.log(`🔄 recalculateStock -> OK`);
//           break;
//         }

//         // ==========================================================
//         // 3) UPDATE PRODUCT TYPE COUNT
//         // ==========================================================
//         case "updateProductTypeCount": {
//           const { productType } = data;
//           if (!productType) break;

//           const count = await Product.countDocuments({ productType });
//           const ProductType = require("../../models/productType");

//           await ProductType.findByIdAndUpdate(productType, {
//             numProducts: count,
//           });

//           console.log(
//             `📊 updateProductTypeCount -> productType=${productType}, count=${count}`
//           );
//           break;
//         }

//         // ==========================================================
//         // 4) CLEANUP AFTER DELETE
//         // ==========================================================
//         case "cleanupAfterDelete": {
//           const { productId } = data;
//           if (!productId) break;

//           const variants = await ProductVariant.find({ productId });
//           for (const v of variants) {
//             for (const img of v.images || []) {
//               if (img.publicId) {
//                 try {
//                   await cloudinary.uploader.destroy(img.publicId);
//                 } catch (_) {}
//               }
//             }
//           }

//           await ProductVariant.deleteMany({ productId });
//           try {
//             const Review = require("../../models/review");
//             await Review.deleteMany({ product: productId });
//           } catch (_) {}
//           console.log(`🧹 cleanupAfterDelete -> Done`);
//           break;
//         }

//         // ==========================================================
//         // 5) UPDATE PRODUCT AGGREGATES
//         // ==========================================================
//         case "updateProductAggregates": {
//           const { productId } = data;
//           if (!productId) break;

//           const variants = await ProductVariant.find({ productId }).lean();
//           const variantIds = variants.map((v) => v._id);

//           const colors = variants.map((v) => ({
//             name: v.color?.name || "",
//             value: v.color?.value || "",
//             image: v.images?.[0]?.url || null,
//           }));

//           const mainImage =
//             variants.find((v) => v.isDefault)?.images?.[0]?.url ||
//             variants[0]?.images?.[0]?.url ||
//             null;

//           const totalStock = variants.reduce(
//             (acc, v) =>
//               acc +
//               (v.sizes || []).reduce(
//                 (sum, sz) => sum + (Number(sz.stock) || 0),
//                 0
//               ),
//             0
//           );

//           await Product.findByIdAndUpdate(productId, {
//             variants: variantIds,
//             numVariants: variantIds.length,
//             colors,
//             mainImage,
//             totalStock,
//             isAvailable: totalStock > 0,
//           });

//           console.log(`🔄 updateProductAggregates -> OK`);
//           break;
//         }

//         default:
//           console.log("⚠️ Unknown job:", name);
//       }
//     } catch (err) {
//       console.error("❌ Worker job error:", err);
//       throw err;
//     }
//   },
//   { connection }
// );

// console.log("🟢 Product Worker running...");
