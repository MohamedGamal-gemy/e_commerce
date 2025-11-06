const cloudinary = require("../config/cloudinary");

/**
 * Upload a single image to Cloudinary
 * @param {Buffer} buffer - Image buffer
 * @param {string} folder - Cloudinary folder path
 * @param {Object} options - Additional upload options (quality, format, etc.)
 * @returns {Promise<{secure_url: string, public_id: string, ...}>}
 */
exports.uploadImage = (buffer, folder, options = {}) => {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    return Promise.reject(new Error("Invalid buffer provided"));
  }

  if (!folder || typeof folder !== "string") {
    return Promise.reject(new Error("Valid folder path is required"));
  }

  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: folder.trim(),
      ...options,
    };

    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (err, result) => {
        if (err) {
          console.error("❌ Cloudinary upload error:", err);
          reject(err);
        } else {
          resolve(result);
        }
      }
    );
    stream.end(buffer);
  });
};

/**
 * Group uploaded files by fieldname
 * @param {Array<Express.Multer.File>} files - Array of uploaded files
 * @returns {Object<string, Array<Express.Multer.File>>} - Files grouped by fieldname
 */
exports.groupFilesByField = (files) => {
  if (!Array.isArray(files)) {
    return {};
  }

  const filesByField = {};
  for (const file of files) {
    if (!file || !file.fieldname) {
      continue;
    }
    if (!filesByField[file.fieldname]) {
      filesByField[file.fieldname] = [];
    }
    filesByField[file.fieldname].push(file);
  }
  return filesByField;
};

/**
 * Delete an image from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<Object>} - Deletion result
 */
exports.deleteImage = (publicId) => {
  if (!publicId || typeof publicId !== "string") {
    return Promise.reject(new Error("Valid publicId is required"));
  }

  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (err, result) => {
      if (err) {
        console.error("❌ Cloudinary delete error:", err);
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};