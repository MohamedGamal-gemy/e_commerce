const Product = require("../models/productModel");
const ProductVariant = require("../models/variantsModel");
const mongoose = require("mongoose");
const cloudinary = require("../config/cloudinary"); // ⚠️ تأكد من أن هذا هو مسار إعداد Cloudinary لديك

// لم نعد نحتاج لـ fs أو استدعاء Cloudinary يدوياً

/**
 * @desc Create a new product with its variants and relies on schema hooks for aggregation
 * @param {object} productData - Data from controller, including Cloudinary paths in mainImageFile/variants.imageFiles
 * @returns {object} The created product document
 */
async function createProductService(productData) {
  // 💡 استخدام معاملة لضمان التناسق
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 🎯 استخراج بيانات الملفات التي تم رفعها بواسطة Multer-Cloudinary
    const { variants, mainImageFile, ...mainProductData } = productData;

    // 1. تجهيز بيانات الصورة الرئيسية
    let mainImageResult = {};
    if (mainImageFile) {
      mainImageResult = {
        url: mainImageFile.path, // URL from Cloudinary
        publicId: mainImageFile.filename, // Public ID from Cloudinary
        alt: mainProductData.title,
      };
    }

    // 2. إنشاء المنتج الرئيسي
    const newProductArray = await Product.create(
      [
        {
          ...mainProductData,
          mainImage: mainImageResult,
          isNewArrival: mainProductData.isNewArrival ?? true,
        },
      ],
      { session }
    );

    const productId = newProductArray[0]._id;

    // 3. إنشاء الـ Variants
    const variantDocuments = [];
    let isDefaultSet = false;

    for (const variant of variants) {
      // أ. جمع صور الـ Variant (Multer يوفرها في هذا الشكل)
      const uploadedImages = variant.imageFiles.map((file) => ({
        url: file.path, // URL from Cloudinary
        publicId: file.filename, // Public ID from Cloudinary
      }));

      // ب. تحديد الـ Default Variant (مهم جداً للـ Schema)
      let isDefault = variant.isDefault;
      if (!isDefaultSet) {
        isDefault = true;
        isDefaultSet = true;
      } else if (variant.isDefault) {
        isDefault = false; // إذا تم تحديد أكثر من واحد، نعتمد على الأول فقط
      }

      variantDocuments.push({
        productId: productId,
        sku: variant.sku,
        isDefault: isDefault,
        // 🎯 الـ Schema تستخدم color: { name, value }
        color: { name: variant.colorName, value: variant.colorValue },
        images: uploadedImages,
        sizes: variant.sizes, // Sizes array is already parsed in the Controller
      });
    }

    // استخدام insertMany لضمان السرعة
    await ProductVariant.insertMany(variantDocuments, { session });

    // 4. تشغيل الـ Aggregate Recalculation يدوياً
    // يضمن أن حقول totalStock و colorNames يتم تحديثها فوراً بعد إنشاء الـ Variants
    await Product.recalcAggregates(productId);

    await session.commitTransaction();
    session.endSession();

    return newProductArray[0];
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    // ⚠️ هنا تقع مشكلة: بما أن الرفع تم قبل الـ Transaction، يجب إضافة منطق
    // لحذف الصور المرفوعة إلى Cloudinary يدوياً في حال فشل الـ Transaction
    console.error(
      "Transaction failed, images may need manual cleanup on Cloudinary."
    );
    throw error;
  }
}

module.exports = { createProductService };
