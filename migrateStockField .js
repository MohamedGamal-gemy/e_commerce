import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

await mongoose.connect(process.env.MONGO_URL);
console.log("✅ Connected to DB");

const ProductVariant = mongoose.model(
  "ProductVariant",
  new mongoose.Schema({
    sizes: [
      {
        size: String,
        stock: Number,
        quantity: Number, 
      },
    ],
  })
);

async function removeQuantityField() {
  try {
    const result = await ProductVariant.updateMany(
      { "sizes.quantity": { $exists: true } }, // لو فيه quantity
      { $unset: { "sizes.$[].quantity": "" } } // امسح quantity من كل العناصر
    );

    console.log(`✅ Removed quantity from ${result.modifiedCount} variants.`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error while removing quantity:", error);
    process.exit(1);
  }
}

removeQuantityField();
