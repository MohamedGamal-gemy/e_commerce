// scripts/updateProductColors.js
require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../models/product");
const ProductVariant = require("../models/productVariant");

async function updateOldProducts() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("✅ Connected to MongoDB");

    const products = await Product.find({});
    console.log(`📦 Found ${products.length} products`);

    for (const product of products) {
      const variants = await ProductVariant.find({ productId: product._id });

      if (!variants.length) {
        console.log(`⚠️ No variants for product: ${product.title}`);
        continue;
      }

      // 🖼️ Main image = أول صورة لأول variant
      const mainImage = variants[0]?.images?.[0]?.url || null;

      // 🎨 Colors = [{ name, value, image }]
      const colors = variants.map(v => ({
        name: v.color?.name || "default",
        value: v.color?.value || "#000000",
        image: v.images?.[0]?.url || null,
      }));

      await Product.updateOne(
        { _id: product._id },
        {
          $set: {
            colors,
            mainImage,
          },
        }
      );

      console.log(`✅ Updated product: ${product.title}`);
    }

    console.log("🎉 Done updating all products");
    mongoose.connection.close();
  } catch (err) {
    console.error("❌ Error updating products:", err);
    mongoose.connection.close();
  }
}

updateOldProducts();
