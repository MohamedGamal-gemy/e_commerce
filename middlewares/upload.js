// // const multer = require("multer");
// // const { CloudinaryStorage } = require("multer-storage-cloudinary");
// // const cloudinary = require("../config/cloudinary");

// // const storage = new CloudinaryStorage({
// //   cloudinary: cloudinary,
// //   params: {
// //     folder: "products/variants",
// //     // allowed_formats: ["jpg", "png", "jpeg"],
// //     transformation: [
// //       { width: 1000, height: 1000, crop: "limit" },
// //       { quality: "auto" },
// //     ],
// //   },
// // });
// // const upload = multer({
// //   storage,
// //   limits: { fileSize: 5 * 1024 * 1024 },
// //   fileFilter: (req, file, cb) => {
// //     if (file.mimetype.startsWith("image/")) cb(null, true);
// //     else cb(new Error("Only images are allowed"), false);
// //   },
// // });

// // module.exports = { upload };


// const multer = require("multer");
// const { CloudinaryStorage } = require("multer-storage-cloudinary");
// const cloudinary = require("../config/cloudinary");

// const storage = new CloudinaryStorage({
//   cloudinary,
//   params: {
//     folder: "products/variants",
//     transformation: [
//       { width: 1000, height: 1000, crop: "limit" },
//       { quality: "auto" },
//     ],
//   },
// });

// const upload = multer({
//   storage,
//   limits: { fileSize: 5 * 1024 * 1024 },
//   fileFilter: (req, file, cb) => {
//     if (file.mimetype.startsWith("image/")) cb(null, true);
//     else cb(new Error("Only images are allowed"), false);
//   },
// });

// module.exports = { upload };


const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadDir = path.join(process.cwd(), "uploads", "tmp");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({ storage });

module.exports = upload;
