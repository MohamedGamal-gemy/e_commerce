const ProductImageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: { type: String },
});

export default mongoose.models.ProductImage ||
  mongoose.model("ProductImage", ProductImageSchema);
