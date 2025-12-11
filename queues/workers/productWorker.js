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

new Worker(
  "productAdd",
  async (job) => {
    const { productId, parsedVariants } = job.data;

    console.log(`⚙ Worker started for product: ${productId}`);

    const allColors = [];

    const variantIds = [];

    try {
      // Process each variant
      for (const variant of parsedVariants) {
        // 1. معالجة الصور (قراءة من القرص ثم رفع إلى Cloudinary بالتوازي)
        const uploadPromises = variant.images.map(async (imageObj) => {
          let uploaded = null;

          try {
            // 🔔 التحسين: قراءة الـ Buffer من المسار على القرص
            if (!imageObj.path) return null;

            const fileBuffer = await fs.readFile(imageObj.path);

            uploaded = await uploadBufferToCloudinary(fileBuffer);
            return uploaded;
          } catch (err) {
            console.error(
              `Upload/Read failed for variant color ${variant.color.name}:`,
              err
            );
            return null;
          } finally {
            // 🔔 مهم: حذف الملف المؤقت بعد الرفع أو الفشل
            if (imageObj.path) {
              await fs
                .unlink(imageObj.path)
                .catch((e) =>
                  console.error(
                    "Failed to delete temp file:",
                    imageObj.path,
                    e.message
                  )
                );
            }
          }
        });

        const uploads = (await Promise.all(uploadPromises)).filter(Boolean);

        const images = uploads.map((u) => ({
          url: u.secure_url,
          publicId: u.public_id,
        }));

        // 2. إنشاء متغير المنتج في MongoDB
        const variantDoc = await ProductVariant.create({
          productId,
          color: variant.color, // هذا هو كائن اللون الأصلي
          sizes: variant.sizes,
          images,
          isDefault: variant.isDefault,
        });

        variantIds.push(variantDoc._id);
        //
        const firstImage = images.length > 0 ? images[0].url : null;

        allColors.push({
          name: variant.color.name,
          value: variant.color.value,
          image: firstImage,
        });
        //
        console.log("Variant saved:", variantDoc._id);
      }

      // 3. تحديث المنتج (القسم المُعدّل)

      // 🔔 التحسين لحل مشكلة CastError: جمع كائنات الألوان الفريدة
      // const allColors = parsedVariants.map((v) => v.color);

      // const uniqueColorsMap = new Map();
      // allColors.forEach((colorObj) => {
      //   if (colorObj && colorObj.name) {
      //     uniqueColorsMap.set(colorObj.name, colorObj);
      //   }
      // });

      // const colorsSummary = Array.from(uniqueColorsMap.values());

      const product = await Product.findByIdAndUpdate(
        productId,
        {
          variants: variantIds,
          colors: allColors,
          // colors: colorsSummary,
        },
        { new: true, runValidators: true }
      );

      if (!product) throw new Error("Product not found");

      console.log(`✅ Worker finished product: ${productId}`);
      return true;
    } catch (err) {
      console.error("Worker failed:", err);
      throw err;
    }
  },
  { connection }
);
