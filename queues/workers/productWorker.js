const { Worker } = require("bullmq");
const Product = require("../../models/product");
const ProductVariant = require("../../models/productVariant");
const cloudinary = require("../../config/cloudinary");
const { connection } = require("../../config/redis");
const connectToDB = require("../../config/db");
const fs = require("fs").promises;

connectToDB();

const uploadBufferToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "products" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
};

const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error("Cloudinary delete failed:", err.message);
  }
};

async function handleMultipleProductsDeletion(data) {
  const productIds = data.productIds || [data.productId].filter(Boolean);

  console.log(`⚙ Worker started deletion for ${productIds.length} product(s).`);

  let totalImagesDeleted = 0;
  let successfulDeletions = [];
  let failedDeletions = [];

  const allVariants = await ProductVariant.find({
    productId: { $in: productIds },
  });

  let publicIdsToDelete = [];
  allVariants.forEach((variant) => {
    variant.images.forEach((image) => {
      if (image.publicId) {
        publicIdsToDelete.push(image.publicId);
      }
    });
  });

  const variantResult = await ProductVariant.deleteMany({
    productId: { $in: productIds },
  });

  if (publicIdsToDelete.length > 0) {
    console.log(
      `⏳ Deleting ${publicIdsToDelete.length} images from Cloudinary...`
    );

    const deletionPromises = publicIdsToDelete.map((publicId) =>
      deleteFromCloudinary(publicId)
        .then(() => successfulDeletions.push(publicId))
        .catch(() => failedDeletions.push(publicId))
    );

    await Promise.allSettled(deletionPromises);
    totalImagesDeleted = successfulDeletions.length;

    console.log(
      `✅ Cloudinary assets deleted: ${totalImagesDeleted} successful, ${failedDeletions.length} failed.`
    );
  }

  console.log(
    `✅ Deletion finished. Variants cleaned: ${variantResult.deletedCount}`
  );
  return {
    productsCount: productIds.length,
    imagesDeleted: totalImagesDeleted,
    failedImagesCount: failedDeletions.length,
  };
}
new Worker(
  "productProcessor",
  async (job) => {
    if (
      job.name === "deleteProductJob" ||
      job.name === "deleteMultipleProductsJob"
    ) {
      return handleMultipleProductsDeletion(job.data);
    }
    const { productId, variants, isUpdate } = job.data;
    console.log(
      `⚙ Worker started for product: ${productId}. Is Update: ${isUpdate}`
    );

    const variantIds = [];
    const allColors = [];

    try {
      for (const v of variants) {
        let finalImages = v.oldImages || [];

        const uploadPromises = (v.newImages || []).map(async (img) => {
          if (!img.path) return null;

          const buffer = await fs.readFile(img.path);
          try {
            const uploaded = await uploadBufferToCloudinary(buffer);
            return { url: uploaded.secure_url, publicId: uploaded.public_id };
          } finally {
            await fs.unlink(img.path).catch((e) => {
              console.error(
                `Failed to delete temp file ${img.path}:`,
                e.message
              );
            });
          }
        });

        const uploadedImages = (await Promise.all(uploadPromises)).filter(
          Boolean
        );
        finalImages.push(...uploadedImages);

        let variantDoc;

        if (v._id && isUpdate) {
          const oldVariant = await ProductVariant.findById(v._id);

          if (oldVariant) {
            const oldPublicIds = oldVariant.images.map((i) => i.publicId);
            const currentOldImagesPublicIds = v.oldImages.map(
              (i) => i.publicId
            );

            const removedImages = oldPublicIds.filter(
              (pid) => !currentOldImagesPublicIds.includes(pid)
            );

            await Promise.all(
              removedImages.map((pid) =>
                deleteFromCloudinary(pid).catch(() => {})
              )
            );
          }

          variantDoc = await ProductVariant.findByIdAndUpdate(
            v._id,
            {
              color: v.color,
              sizes: v.sizes,
              images: finalImages,
              isDefault: v.isDefault,
            },
            { new: true }
          );
        } else {
          variantDoc = await ProductVariant.create({
            productId,
            color: v.color,
            sizes: v.sizes,
            images: finalImages,
            isDefault: v.isDefault,
          });
        }

        variantIds.push(variantDoc._id);

        const firstImage = finalImages[0]?.url || null;
        if (!allColors.some((c) => c.name === v.color.name)) {
          allColors.push({
            name: v.color.name,
            value: v.color.value,
            image: firstImage,
          });
        }
      }

      if (isUpdate) {
        await ProductVariant.deleteMany({
          productId,
          _id: { $nin: variantIds },
        });
      }

      // const freshVariants = await ProductVariant.find({ productId });
      // const totalStock = freshVariants.reduce(
      //   (sum, variant) =>
      //     sum + variant.sizes.reduce((s, size) => s + (size.stock || 0), 0),
      //   0
      // );
      // const isAvailable = totalStock > 0;

      // allColors.sort((a, b) => {
      //   const vA = variants.find((v) => v.color.name === a.name);
      //   const vB = variants.find((v) => v.color.name === b.name);
      //   return vA?.isDefault ? -1 : vB?.isDefault ? 1 : 0;
      // });

      // await Product.findByIdAndUpdate(productId, {
      //   variants: variantIds,
      //   colors: allColors,
      //   totalStock,
      //   isAvailable,
      //   numVariants: variantIds.length,
      // });

      // 1. جلب البيانات النهائية من قاعدة البيانات لضمان المزامنة
      const freshVariants = await ProductVariant.find({ productId });

      // 2. تحديث مصفوفة الألوان مع إضافة المقاسات لكل لون (مهم للملابس)
      const updatedColors = freshVariants.map((fv) => ({
        name: fv.color.name,
        value: fv.color.value,
        image: fv.images[0]?.url || null,
        sizes: fv.sizes.map((s) => ({
          size: s.size,
          stock: Number(s.stock) || 0,
        })),
      }));

      // 3. ترتيب الألوان بحيث يظهر الـ isDefault أولاً
      updatedColors.sort((a, b) => {
        const vA = freshVariants.find((v) => v.color.name === a.name);
        const vB = freshVariants.find((v) => v.color.name === b.name);
        return vA?.isDefault ? -1 : vB?.isDefault ? 1 : 0;
      });

      // 4. حساب إجمالي المخزون
      const totalStock = freshVariants.reduce(
        (sum, variant) =>
          sum +
          variant.sizes.reduce((s, size) => s + (Number(size.stock) || 0), 0),
        0
      );

      // 5. التحديث النهائي للمنتج (إملاء كل الحقول بما فيها الـ variants)
      await Product.findByIdAndUpdate(productId, {
        variants: freshVariants.map((v) => v._id), // حل مشكلة المصفوفة الفارغة
        colors: updatedColors,
        totalStock,
        isAvailable: totalStock > 0,
        numVariants: freshVariants.length,
      });
      console.log(`✅ Worker finished product: ${productId}`);
      return true;
    } catch (err) {
      console.error("❌ Worker failed:", err);
      throw err;
    }
  },
  { connection, lockDuration: 60000 }
);
