// scripts/migrate-old-products.js

require("dotenv").config();

const mongoose = require("mongoose");
const Product = require("../models/productModel");
const ProductVariant = require("../models/variantsModel");

if (!process.env.MONGO_URL) {
  console.error("MONGO_URL is missing! Create .env file");
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URL);

const db = mongoose.connection;
db.on("error", (err) => console.error("Connection error:", err));
db.once("open", async () => {
  console.log("Connected to MongoDB");

  try {
    const oldProducts = await Product.find({
      variants: { $exists: true, $ne: [], $type: "array" }
    }).lean();

    console.log(`Found ${oldProducts.length} products with old variants...\n`);

    for (let i = 0; i < oldProducts.length; i++) {
      const product = oldProducts[i];
      console.log(`[${i + 1}/${oldProducts.length}] Migrating: ${product.title}`);

      const oldVariants = product.variants || [];
      const variantIds = [];
      const colorNames = new Set();

      // إنشاء variants جديدة
      for (let j = 0; j < oldVariants.length; j++) {
        const oldVar = oldVariants[j];

        if (oldVar.color?.name) {
          colorNames.add(oldVar.color.name.toLowerCase());
        }

        let variant = await ProductVariant.findOne({
          productId: product._id,
          "color.name": oldVar.color?.name
        });

        if (!variant) {
          variant = new ProductVariant({
            productId: product._id,
            sku: `${product._id}-${oldVar.color?.name || j}`.replace(/\s+/g, "-").toLowerCase(),
            color: {
              name: oldVar.color?.name || "Default Color",
              value: oldVar.color?.value || "#000000",
            },
            images: oldVar.images || [],
            sizes: oldVar.sizes || [],
            isDefault: j === 0,
          });
          await variant.save();
          console.log(`  Created variant: ${variant.color.name}`);
        } else {
          console.log(`  Skipped (exists): ${variant.color.name}`);
        }

        variantIds.push(variant._id);
      }

      // mainImage
      let mainImage = null;
      if (variantIds.length > 0) {
        const firstVariant = await ProductVariant.findById(variantIds[0]).lean();
        if (firstVariant?.images?.[0]?.url) {
          mainImage = {
            url: firstVariant.images[0].url,
            publicId: firstVariant.images[0].publicId || null,
            alt: `${product.title} - ${firstVariant.color.name}`,
          };
        }
      }

      // slug
      const baseSlug = product.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      const slug = `${baseSlug}-${product._id.toString().slice(-6)}`;

      // خطوة 1: احذف variants القديم
      await Product.findByIdAndUpdate(product._id, { $unset: { variants: 1 } });
      console.log(`  Removed old variants field`);

      // خطوة 2: أضف الحقول الجديدة
      await Product.findByIdAndUpdate(product._id, {
        $set: {
          slug,
          mainImage: mainImage || { url: "", alt: product.title },
          variants: variantIds,
          colorNames: Array.from(colorNames),
          status: "active",
          isAvailable: true,
          title: product.title,
          description: product.description,
          price: product.price,
          category: product.category,
          subcategory: product.subcategory,
          rating: product.rating || 0,
          numReviews: product.numReviews || 0,
        }
      }, { new: true });
      console.log(`  Added new fields: ${slug}`);

      // خطوة 3: recalc
      await Product.recalcAggregates(product._id);
      console.log(`  Recalculated stock & variants\n`);
    }

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
});