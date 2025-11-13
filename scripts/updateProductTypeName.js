// scripts/updateProductTypeName.js
const mongoose = require("mongoose");
const Product = require("../models/product"); // عدّل المسار حسب مشروعك
const ProductType = require("../models/productType"); // عدّل المسار حسب مشروعك

(async () => {
  try {
    // ✅ 1. اتصال بقاعدة البيانات
    await mongoose.connect(process.env.MONGO_URL); // ← غيّر اسم الداتا

    console.log("✅ Connected to MongoDB");

    // ✅ 2. هات كل المنتجات اللي عندها productType لكن مافيهاش productTypeName
    const products = await Product.find({
      productType: { $exists: true, $ne: null },
    });

    console.log(`🟡 Found ${products.length} products`);

    // ✅ 3. لفّ على كل منتج وحدّثه
    for (const product of products) {
      const typeDoc = await ProductType.findById(product.productType).select("name");
      if (!typeDoc) continue;

      product.productTypeName = typeDoc.name;
      await product.save();

      console.log(`✅ Updated ${product.title} → ${typeDoc.name}`);
    }

    console.log("🎯 Done updating all products!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error updating:", err);
    process.exit(1);
  }
})();
