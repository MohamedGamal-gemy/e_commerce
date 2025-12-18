// // /**
// //  * Product Helper Functions
// //  * Utility functions for product operations to reduce code duplication
// //  */

// // const ApiError = require("./ApiError");
// // const { groupFilesByField } = require("./file.utils");

// // /**
// //  * Parse variants from request body (handles both JSON string and object)
// //  * @param {string|Array} variants - Variants data
// //  * @returns {Array} Parsed variants array
// //  * @throws {ApiError} If parsing fails
// //  */
// // exports.parseVariants = (variants) => {
// //   if (!variants) {
// //     return [];
// //   }

// //   let parsedVariants;

// //   if (typeof variants === "string") {
// //     try {
// //       parsedVariants = JSON.parse(variants);
// //     } catch (parseError) {
// //       throw new ApiError(
// //         `Invalid variants JSON format: ${parseError.message}`,
// //         400
// //       );
// //     }
// //   } else if (Array.isArray(variants)) {
// //     parsedVariants = variants;
// //   } else {
// //     throw new ApiError("Variants must be an array or valid JSON string", 400);
// //   }

// //   // Clean up variants: remove file objects and blob URLs from images array
// //   // Files are uploaded separately via FormData, so we only keep existing URLs (not blob URLs)
// //   return parsedVariants.map((variant) => {
// //     // Clean images array - keep only existing URLs (not blob URLs, not file objects)
// //     if (variant.images && Array.isArray(variant.images)) {
// //       variant.images = variant.images
// //         .filter((img) => {
// //           // Keep only existing images:
// //           // - Has URL
// //           // - URL is not a blob URL (blob URLs indicate new images that come as files)
// //           // - No file property (files come separately)
// //           return img &&
// //                  img.url &&
// //                  !img.url.startsWith('blob:') &&
// //                  !img.file;
// //         })
// //         .map((img) => ({
// //           url: img.url,
// //           publicId: img.publicId || null,
// //           alt: img.alt || null,
// //         }));
// //     } else {
// //       variant.images = [];
// //     }

// //     // Ensure removedImages is an array
// //     if (!variant.removedImages || !Array.isArray(variant.removedImages)) {
// //       variant.removedImages = [];
// //     }

// //     return variant;
// //   });
// // };

// // /**
// //  * Map uploaded files to variant indices
// //  * @param {Array} files - Uploaded files array
// //  * @returns {Object} Mapped files by variant index
// //  */
// // exports.mapVariantFiles = (files) => {
// //   if (!files || files.length === 0) {
// //     console.log("⚠️ No files provided to mapVariantFiles");
// //     return {};
// //   }

// //   const filesByField = groupFilesByField(files);
// //   console.log("📁 Files grouped by field:", Object.keys(filesByField));

// //   const variantFilesMap = {};

// //   Object.keys(filesByField).forEach((fieldname) => {
// //     // Match: variantImages_0, variantImages_1, variantImages-0, etc.
// //     // Also handle cases like variantImages[0], variantImages.0
// //     const match = fieldname.match(/variantImages[._\[\-]?(\d+)/i);
// //     if (match) {
// //       const index = parseInt(match[1]);
// //       variantFilesMap[`variantImages_${index}`] = filesByField[fieldname];
// //       console.log(`✅ Mapped ${fieldname} -> variantImages_${index} (${filesByField[fieldname].length} files)`);
// //     } else {
// //       console.log(`⚠️ Unmatched fieldname: ${fieldname}`);
// //     }
// //   });

// //   return variantFilesMap;
// // };

// // /**
// //  * Prepare product data with defaults
// //  * @param {Object} productData - Raw product data
// //  * @returns {Object} Prepared product data with defaults
// //  */
// // exports.prepareProductData = (productData) => {
// //   const now = new Date();
// //   const defaultDiscountEnd = new Date(
// //     now.getTime() + 7 * 24 * 60 * 60 * 1000
// //   ); // 7 days from now

// //   return {
// //     ...productData,
// //     originalPrice: productData.originalPrice || productData.price,
// //     discountType: productData.discountType || "percentage",
// //     discountValue: productData.discountValue || 0,
// //     discountStart: productData.discountStart || now,
// //     discountEnd: productData.discountEnd || defaultDiscountEnd,
// //   };
// // };

// // /**
// //  * Fetch product with populated relations
// //  * @param {Object} Product - Product model
// //  * @param {string|ObjectId} productId - Product ID
// //  * @param {Object} options - Populate options
// //  * @returns {Promise<Object>} Populated product
// //  */
// // exports.fetchProductWithRelations = async (
// //   Product,
// //   productId,
// //   options = {}
// // ) => {
// //   const {
// //     populateVariants = true,
// //     populateProductType = true,
// //     select = null,
// //   } = options;

// //   let query = Product.findById(productId);

// //   if (select) {
// //     query = query.select(select);
// //   }

// //   if (populateVariants) {
// //     query = query.populate("variants");
// //   }

// //   if (populateProductType) {
// //     query = query.populate("productType", "name");
// //   }

// //   return query;
// // };

// // /**
// //  * Validate ObjectId format
// //  * @param {string} id - ID to validate
// //  * @returns {boolean} True if valid ObjectId
// //  */
// // exports.isValidObjectId = (id) => {
// //   const mongoose = require("mongoose");
// //   return mongoose.isValidObjectId(id);
// // };

// // في ملف مساعد (مثل utils/productHelpers.js)
// exports.processVariantsForQueue = (req, variants) => {
//   let fileIndex = 0;

//   const parsedVariants = JSON.parse(variants || "[]");

//   return parsedVariants.map((v) => {
//     const newImages = [];
//     const newImagesCount = v.newImagesCount || (v.images ? v.images.length : 0); // في الإنشاء نحسبها من images.length

//     for (let i = 0; i < newImagesCount; i++) {
//       const file = req.files[fileIndex++]; // Multer DiskStorage يضيف خاصية `path`
//       if (file) {
//         newImages.push({
//           path: file.path,
//           originalname: file.originalname,
//           mimetype: file.mimetype,
//         });
//       }
//     }

//     return {
//       _id: v._id || null,
//       color: v.color,
//       sizes: v.sizes,
//       isDefault: v.isDefault,
//       oldImages: v.oldImages || [], // موجودة في التحديث فقط
//       newImages, // مسارات الملفات المؤقتة
//       newImagesCount: newImages.length, // العدد الفعلي
//     };
//   });
// };

// utils/productHelpers.js
const fs = require("fs");
const path = require("path");

// 🟦 1. دالة معالجة الـ Variants وتحضير البيانات للـ Queue
exports.processVariantsForQueue = (req, variants) => {
  let fileIndex = 0;

  const parsedVariants = JSON.parse(variants || "[]");

  return parsedVariants.map((v) => {
    const newImages = [];
    // نعتمد على 'newImagesCount' القادم من الفرونت، وهو يساوي عدد الملفات المرفوعة فعلاً.
    const newImagesCount = v.newImagesCount || 0;

    for (let i = 0; i < newImagesCount; i++) {
      const file = req.files[fileIndex++]; // Multer DiskStorage يضيف خاصية `path`
      if (file) {
        newImages.push({
          path: file.path,
          originalname: file.originalname,
          mimetype: file.mimetype,
        });
      }
    }

    return {
      _id: v._id || null,
      color: v.color,
      sizes: v.sizes,
      isDefault: v.isDefault,
      oldImages: v.oldImages || [], // موجودة في التحديث فقط
      newImages, // مسارات الملفات المؤقتة
      newImagesCount: newImages.length, // العدد الفعلي
    };
  });
};

// 🟦 2. دالة مسح الملفات المؤقتة
exports.cleanupTempFiles = (files) => {
  if (!files || files.length === 0) return;
  files.forEach((file) => {
    try {
      // نستخدم fs.existsSync و fs.unlinkSync لأننا في block متزامن (Error handler)
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    } catch (e) {
      console.error(
        "Failed to delete temp file during error handling:",
        e.message
      );
    }
  });
};
