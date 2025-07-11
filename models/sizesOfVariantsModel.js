import mongoose from "mongoose";

const ProductSizeSchema = new mongoose.Schema({
  size: { type: String, required: true }, // مثل M, L, XL
  quantity: { type: Number, default: 0, min: 0 },
  variant: { type: mongoose.Schema.Types.ObjectId, ref: "ProductVariant" }, // مهم جدًا لعكس العلاقة
});

export default mongoose.models.ProductSize ||
  mongoose.model("ProductSize", ProductSizeSchema);
