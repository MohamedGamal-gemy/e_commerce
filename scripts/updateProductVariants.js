// 📁 scripts/updateProductVariants.js

const mongoose = require("mongoose");
require("dotenv").config();

const Product = require("../models/productModel");
const ProductVariant = require("../models/variantsModel");

async function updateProductVariants() {
    try {

        await mongoose.connect(process.env.MONGO_URL);
        console.log("✅ Connected to MongoDB");

        const products = await Product.find({});
        console.log(`📦 Found ${products.length} products`);

        let updatedCount = 0;

        for (const product of products) {
            const variants = await ProductVariant.find({ productId: product._id }).select("_id");

            if (variants.length > 0) {
                const variantIds = variants.map((v) => v._id);

                await Product.updateOne(
                    { _id: product._id },
                    { $set: { variants: variantIds } }
                );

                updatedCount++;
                console.log(`🔗 Updated product: ${product.title} (${variantIds.length} variants)`);
            }
        }

        console.log(`🎉 Done! Updated ${updatedCount} products.`);
        process.exit(0);
    } catch (err) {
        console.error("❌ Error updating product variants:", err);
        process.exit(1);
    }
}

updateProductVariants();
