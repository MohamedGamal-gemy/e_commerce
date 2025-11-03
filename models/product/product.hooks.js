const mongoose = require("mongoose");

function buildSearchableText(product) {
  const parts = [
    product.title,
    product.shortDescription,
    product.description,
    ...(product.tags || []),
    ...(product.attributes || []).map((a) => `${a.key} ${a.value}`),
  ];
  return parts.filter(Boolean).join(" ").toLowerCase();
}

module.exports = (schema) => {
  const getProductVariantModel = () => mongoose.model("ProductVariant");

  // --- Pre-save hook ---
  schema.pre("save", async function (next) {
    try {
      if (!this.slug && this.title) {
        const base = this.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        this.slug = `${base}-${Date.now().toString().slice(-6)}`;
      }

      const now = new Date();
      this.discountIsActive =
        this.discountValue > 0 &&
        this.discountStart &&
        this.discountEnd &&
        now >= this.discountStart &&
        now <= this.discountEnd;

      this.searchableText = buildSearchableText(this);
      next();
    } catch (err) {
      next(err);
    }
  });

  // --- Post-delete hook ---
  schema.post("findOneAndDelete", async function (doc) {
    if (!doc) return;
    const ProductVariant = getProductVariantModel();

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await ProductVariant.deleteMany({ productId: doc._id }, { session });
      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      console.error("Variant cleanup failed:", err);
    } finally {
      session.endSession();
    }
  });
};
