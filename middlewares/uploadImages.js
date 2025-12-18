// const multer = require("multer");
// const fs = require("fs");
// const path = require("path");

// // 🔔 التحسين: التبديل إلى DiskStorage لتجنب تخزين الـ Buffers الكبيرة في ذاكرة Redis/BullMQ.
// const uploadDir = path.join(__dirname, "../../uploads/temp"); // يجب تعديل المسار ليتناسب مع هيكل مشروعك

// // إنشاء المجلد إذا لم يكن موجودًا (Recursive: true لإنشاء المسارات الفرعية)
// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir, { recursive: true });
// }

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, uploadDir);
//   },
//   filename: (req, file, cb) => {
//     // إنشاء اسم ملف فريد لتجنب التعارض
//     const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
//     cb(
//       null,
//       file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
//     );
//   },
// });

// const upload = multer({
//   storage,
//   limits: { fileSize: 10 * 1024 * 1024 }, // مثال: 10MB كحد أقصى لكل صورة
// });

// module.exports = upload;

const multer = require("multer");

// ✅ الأفضل لـ Koyeb و Cloudinary: استخدام MemoryStorage
// هذا يتجنب تماماً أخطاء "Permission Denied" لأننا لا ننشئ مجلدات على السيرفر
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB حد أقصى (كافٍ جداً للصور)
  },
  fileFilter: (req, file, cb) => {
    // التأكد من أن الملف المرفوع صورة فقط
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only images are allowed!"), false);
    }
  },
});

module.exports = upload;
