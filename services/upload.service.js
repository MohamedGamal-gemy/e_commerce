const cloudinary = require("../config/cloudinary");

/**
 * رفع صورة واحدة
 * @param {Buffer} buffer 
 * @param {string} folder 
 * @returns {Promise<{secure_url, public_id}>}
 */
exports.uploadImage = (buffer, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
    stream.end(buffer);
  });
