const { Worker } = require("bullmq");
const Product = require("../../models/product");
const ProductVariant = require("../../models/productVariant");
const cloudinary = require("../../config/cloudinary");
const { connection } = require("../../config/redis");
const connectToDB = require("../../config/db");
const fs = require("fs").promises;

connectToDB();

// Helper: upload buffer to Cloudinary
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

new Worker(
  "processProduct",
  async (job) => {
    const { productId, variants, images: allFiles } = job.data;

    console.log(`⚙ Worker started for product: ${productId}`);

    const variantIds = [];
    const allColors = [];
    const filesQueue = allFiles ? [...allFiles] : [];

    try {
      for (const v of variants) {
        let finalImages = [];

        // ======= CREATE / UPDATE newImages handling =======
        if ((!v.newImages || !v.newImages.length) && v.newImagesCount) {
          v.newImages = [];
          for (let i = 0; i < v.newImagesCount; i++) {
            const file = filesQueue.shift();
            if (file) v.newImages.push(file);
          }
        }

        v.oldImages = v.oldImages || [];

        // ======= Add old images =======
        finalImages.push(...v.oldImages);

        // ======= Upload new images =======
        const uploadedImages = await Promise.all(
          (v.newImages || []).map(async (img) => {
            const buffer = await fs.readFile(img.path);
            try {
              const uploaded = await uploadBufferToCloudinary(buffer);
              return { url: uploaded.secure_url, publicId: uploaded.public_id };
            } finally {
              await fs.unlink(img.path).catch(() => {});
            }
          })
        );

        finalImages.push(...uploadedImages);

        // ======= CREATE or UPDATE variant =======
        let variantDoc;

        if (v._id) {
          const oldVariant = await ProductVariant.findById(v._id);

          // حذف الصور القديمة اللي اتشالت
          const oldPublicIds = oldVariant.images.map((i) => i.publicId);
          const removedImages = oldPublicIds.filter(
            (pid) => !v.oldImages.map((i) => i.publicId).includes(pid)
          );

          await Promise.all(
            removedImages.map((pid) =>
              deleteFromCloudinary(pid).catch(() => {})
            )
          );

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

        // ======= Build colors array =======
        const firstImage = finalImages[0]?.url || null;
        if (!allColors.some((c) => c.name === v.color.name)) {
          allColors.push({
            name: v.color.name,
            value: v.color.value,
            image: firstImage,
          });
        }
      }

      // ======= Delete removed variants =======
      await ProductVariant.deleteMany({
        productId,
        _id: { $nin: variantIds },
      });

      // ======= Recalculate total stock =======
      const freshVariants = await ProductVariant.find({ productId });
      const totalStock = freshVariants.reduce(
        (sum, variant) =>
          sum + variant.sizes.reduce((s, size) => s + (size.stock || 0), 0),
        0
      );
      const isAvailable = totalStock > 0;

      // ======= Sort colors: default first =======
      allColors.sort((a, b) => {
        const vA = variants.find((v) => v.color.name === a.name);
        const vB = variants.find((v) => v.color.name === b.name);
        return vA?.isDefault ? -1 : vB?.isDefault ? 1 : 0;
      });

      // ======= Update product =======
      await Product.findByIdAndUpdate(productId, {
        variants: variantIds,
        colors: allColors,
        totalStock,
        isAvailable,
        numVariants: variantIds.length,
      });

      console.log(`✅ Worker finished product: ${productId}`);
      return true;
    } catch (err) {
      console.error("❌ Worker failed:", err);
      throw err;
    }
  },
  { connection }
);
