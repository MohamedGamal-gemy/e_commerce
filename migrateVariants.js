// migration/convert-variants.js

const mongoose = require("mongoose");
const {Product} = require("./models/productModel");
const ProductVariant = require("./models/variantsModel");

const MONGO_URI = "mongodb+srv://ga863410:m01126465662g@e-commerce.ccdgz1d.mongodb.net/store-e-commerce?retryWrites=true&w=majority&appName=e-commerce";

const migrateVariants = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const products = await Product.find({});

    for (const product of products) {
      // لو مفيش variants جوه المنتج، كمل للبعده
      if (!product.variants || product.variants.length === 0) continue;

      const variantIds = [];

      for (const variant of product.variants) {
        const newVariant = new ProductVariant({
          productId: product._id,
          color: variant.color,
          images: variant.images,
          sizes: variant.sizes,
        });

        await newVariant.save();
        variantIds.push(newVariant._id);
      }

      // حدّث المنتج ليحتوي على الـ IDs فقط
      product.variants = variantIds;
      await product.save();

      console.log(`✅ Migrated ${variantIds.length} variants for product ${product.title}`);
    }

    console.log("🎉 All variants migrated successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
};

migrateVariants();
