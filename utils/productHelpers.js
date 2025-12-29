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
