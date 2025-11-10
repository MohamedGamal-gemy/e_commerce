const ProductVariant = require("../models/productVariant");
const mongoose = require("mongoose");
const ApiError = require("../utils/ApiError");

/**
 * Create ProductVariants and link them to a Product
 * @param {ObjectId} productId - Product ID
 * @param {Array} variants - Variants data
 * @param {mongoose.Session} session - MongoDB session
 * @returns {Promise<Array<ObjectId>>} - Array of ProductVariant ObjectIds
 */
exports.createVariants = async (productId, variants, session) => {
  if (!productId || !mongoose.isValidObjectId(productId)) {
    throw new ApiError("Valid productId is required", 400);
  }

  if (!variants || variants.length === 0) {
    throw new ApiError("At least one variant is required", 400);
  }

  const variantDocs = variants.map((v, index) => ({
    productId,
    sku: v.sku || null,
    color: {
      name: v.color?.name?.trim() || "",
      value: v.color?.value?.trim().toLowerCase() || "",
    },
    sizes: (v.sizes || []).map((size) => ({
      size: size.size?.trim().toUpperCase() || "",
      stock: Math.max(0, Number(size.stock) || 0),
    })),
    images: v.images || [],
    isDefault: index === 0 ? true : !!v.isDefault,
  }));

  try {
    const createdVariants = await ProductVariant.insertMany(variantDocs, {
      session,
    });
    return createdVariants.map((v) => v._id);
  } catch (error) {
    console.error("❌ Error creating variants:", error);
    throw new ApiError(`Failed to create variants: ${error.message}`, 500);
  }
};

/**
 * Update a single variant
 * @param {ObjectId} variantId - Variant ID
 * @param {Object} updateData - Data to update
 * @param {mongoose.Session} session - Optional MongoDB session
 * @returns {Promise<Object>} - Updated variant document
 */
exports.updateVariant = async (variantId, updateData, session = null) => {
  if (!variantId || !mongoose.isValidObjectId(variantId)) {
    throw new ApiError("Valid variantId is required", 400);
  }

  const updateOptions = session ? { session, new: true } : { new: true };

  // Normalize update data
  if (updateData.color) {
    updateData.color = {
      name: updateData.color.name?.trim() || "",
      value: updateData.color.value?.trim().toLowerCase() || "",
    };
  }

  if (updateData.sizes) {
    updateData.sizes = updateData.sizes.map((size) => ({
      size: size.size?.trim().toUpperCase() || "",
      stock: Math.max(0, Number(size.stock) || 0),
    }));
  }

  try {
    const updatedVariant = await ProductVariant.findByIdAndUpdate(
      variantId,
      updateData,
      updateOptions
    );

    if (!updatedVariant) {
      throw new ApiError("Variant not found", 404);
    }

    return updatedVariant;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error("❌ Error updating variant:", error);
    throw new ApiError(`Failed to update variant: ${error.message}`, 500);
  }
};

/**
 * Delete a variant
 * @param {ObjectId} variantId - Variant ID
 * @param {mongoose.Session} session - Optional MongoDB session
 * @returns {Promise<boolean>} - True if deleted successfully
 */
const { deleteImage } = require("../utils/file.utils");
const { productQueue } = require("../queues/productQueue");

exports.deleteVariant = async (variantId, session = null) => {
  if (!variantId || !mongoose.isValidObjectId(variantId)) {
    throw new ApiError("Valid variantId is required", 400);
  }

  const deleteOptions = session ? { session } : {};

  try {
    const variant = await ProductVariant.findById(variantId);
    if (!variant) {
      throw new ApiError("Variant not found", 404);
    }

    // Delete images from Cloudinary (best-effort)
    await Promise.allSettled(
      (variant.images || [])
        .filter((img) => img && img.publicId)
        .map((img) => deleteImage(img.publicId))
    );

    // Delete the variant document
    const result = await ProductVariant.findByIdAndDelete(variantId, deleteOptions);

    return true;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error("❌ Error deleting variant:", error);
    throw new ApiError(`Failed to delete variant: ${error.message}`, 500);
  }
};
