// scripts/fix-missing-fields.js

require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../models/productModel");

if (!process.env.MONGO_URL) {
  console.error("MONGO_URL is missing!");
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URL);

const db = mongoose.connection;
db.on("error", (err) => console.error("Connection error:", err));
db.once("open", async () => {
  console.log("Connected to MongoDB");

  try {
    const products = await Product.find({}).lean();
    console.log(`Found ${products.length} products to fix...\n`);

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      const update = { $set: {} };

      // === 1. الحقول الأساسية ===
      if (!p.shortDescription) update.$set.shortDescription = p.title;
      if (!p.originalPrice) update.$set.originalPrice = p.price;
      if (!p.discountType) update.$set.discountType = "percentage";
      if (!p.discountValue) update.$set.discountValue = 0;
      if (p.discountIsActive === undefined) update.$set.discountIsActive = false;

      // === 2. التتبع ===
      if (!p.views) update.$set.views = 0;
      if (!p.purchases) update.$set.purchases = 0;
      if (!p.favorites) update.$set.favorites = 0;
      if (!p.shares) update.$set.shares = 0;

      // === 3. الإعدادات ===
      if (!p.minOrderQuantity) update.$set.minOrderQuantity = 1;
      if (!p.maxOrderQuantity) update.$set.maxOrderQuantity = null;
      if (p.reviewEnabled === undefined) update.$set.reviewEnabled = true;
      if (p.allowBackorder === undefined) update.$set.allowBackorder = false;
      if (!p.warrantyPeriod) update.$set.warrantyPeriod = null;

      // === 4. SEO ===
      if (!p.metaTitle) update.$set.metaTitle = p.title;
      if (!p.metaDescription) update.$set.metaDescription = p.description?.slice(0, 160) || "";
      if (!p.keywords) update.$set.keywords = [];
      if (!p.tags) update.$set.tags = [];

      // === 5. searchableText ===
      update.$set.searchableText = [
        p.title,
        p.shortDescription || p.title,
        p.description,
        ...(p.tags || []),
        ...(p.colorNames || []),
        ...(p.attributes || []).map(a => a.value)
      ].filter(Boolean).join(" ").toLowerCase();

      // === 6. تحديث فقط لو فيه تغييرات ===
      if (Object.keys(update.$set).length > 0) {
        await Product.updateOne({ _id: p._id }, update);
        console.log(`[${i + 1}/${products.length}] Fixed: ${p.title}`);
      } else {
        console.log(`[${i + 1}/${products.length}] Already complete: ${p.title}`);
      }
    }

    // === 7. إعادة حساب totalStock لكل المنتجات ===
    console.log("\nRecalculating aggregates for all products...");
    const allProducts = await Product.find({});
    for (const p of allProducts) {
      await Product.recalcAggregates(p._id);
    }

    console.log("\nAll missing fields fixed & aggregates recalculated!");
  } catch (error) {
    console.error("Fix failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected");
  }
});