require("dotenv").config();

const mongoose = require("mongoose");
const { Product } = require("./models/productModel");
const Category = require("./models/categoryModel");
const Subcategory = require("./models/subcategoryModel");

async function migrateData() {
  try {
    // Connect to MongoDB (updated connection without deprecated options)
    await mongoose.connect(process.env.MONGO_URL);

    // Get all products from the old structure
    const products = await Product.find({});

    // Create a cache to avoid duplicate category/subcategory creations
    const categoryCache = {};
    const subcategoryCache = {};
    console.log(products);

    for (const product of products) {
      // Skip if category/subcategory are empty or undefined
      if (!product.category || typeof product.category !== "string") {
        console.warn(`Skipping product ${product._id} - invalid category`);
        continue;
      }

      if (!product.subcategory || typeof product.subcategory !== "string") {
        console.warn(`Skipping product ${product._id} - invalid subcategory`);
        continue;
      }

      // Process category - ensure it's trimmed and not empty
      const categoryName = product.category.trim();
      if (!categoryCache[categoryName] && categoryName) {
        let category = await Category.findOne({ name: categoryName });
        if (!category) {
          category = new Category({ name: categoryName });
          await category.save();
        }
        categoryCache[categoryName] = category._id;
      }

      // Process subcategory - ensure it's trimmed and not empty
      const subcategoryName = product.subcategory.trim();
      if (!subcategoryCache[subcategoryName] && subcategoryName) {
        let subcategory = await Subcategory.findOne({ name: subcategoryName });
        if (!subcategory) {
          subcategory = new Subcategory({ name: subcategoryName });
          await subcategory.save();
        }
        subcategoryCache[subcategoryName] = subcategory._id;
      }

      // Update the product with the new references
      product.category = categoryCache[categoryName];
      product.subcategory = subcategoryCache[subcategoryName];

      await product.save();
      console.log(`Updated product ${product._id}`);
    }

    console.log("Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrateData();
