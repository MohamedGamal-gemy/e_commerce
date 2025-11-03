const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary"); // ⚠️ تأكد من صحة مسار إعداد Cloudinary

// 1. Storage للصور الرئيسية
const mainImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "products/main", // مجلد خاص بالصور الرئيسية
    // يمكنك إضافة transformations هنا
  },
});

// 2. Storage لصور الـ Variants
const variantImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "products/variants", // مجلد خاص بصور الـ Variants
    transformation: [
      { width: 1000, height: 1000, crop: "limit" },
      { quality: "auto" },
    ],
  },
});

// 🎯 دالة لتحديد الـ Storage المناسب بناءً على اسم الحقل
const storageResolver = (req, file) => {
    // 💡 إذا كان الحقل هو الصورة الرئيسية
    if (file.fieldname === 'mainImageFile') {
        return mainImageStorage;
    } 
    // 💡 إذا كان الحقل هو أي من حقول صور الـ Variants (يجب أن يتم تجميعهم في حقل واحد في Controller)
    // Multer يُرسل اسم الحقل هنا كـ 'imageFiles'
    if (file.fieldname === 'imageFiles') {
        return variantImageStorage;
    }
    // Storage افتراضي
    return mainImageStorage;
};


// 3. إعداد Multer النهائي باستخدام Storage Function
const upload = multer({
  // استخدام دالة لتحديد الـ Storage المناسب لكل ملف
  storage: storageResolver, 
  
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only images are allowed"), false);
  },
});

// 4. دالة Middleware لتطبيق حقول الرفع
const productUploadMiddleware = upload.fields([
    // 1. الصورة الرئيسية
    { name: 'mainImageFile', maxCount: 1 }, 
    // 2. صور الـ Variants (جميع الصور تُرسل تحت هذا الاسم كـ Array)
    { name: 'imageFiles', maxCount: 20 }, 
]);

module.exports = { productUploadMiddleware };