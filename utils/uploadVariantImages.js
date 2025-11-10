const ApiError = require("../utils/ApiError");
const { uploadImage } = require("./file.utils");

async function uploadVariantImages(files, productName, variantName) {
  if (!files || !files.length) return [];

  const uploaded = [];

  for (const file of files) {
    try {
      const result = await uploadImage(
        file.buffer, // استخدم buffer
        `products/${productName}/${variantName}`,
        { use_filename: true, unique_filename: true }
      );

      uploaded.push({
        url: result.secure_url,
        publicId: result.public_id,
        alt: variantName || productName,
      });
    } catch (err) {
      console.error("❌ Error uploading image:", err);
      throw new ApiError("Failed to upload variant image", 500);
    }
  }

  return uploaded;
}

module.exports = uploadVariantImages;
