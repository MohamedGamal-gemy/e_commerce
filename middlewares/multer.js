// config/multer.js
const multer = require("multer");

// Use memory storage for easier upload to Cloudinary
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max per file
});

module.exports = upload;
