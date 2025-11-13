const { productQueue } = require("../../queues/productQueue");

module.exports = (schema) => {
  // ✅ قبل الحفظ: حدّث productTypeName تلقائيًا
  schema.pre("save", async function (next) {
    // لو النوع اتغير أو الاسم مش موجود
    if (this.isModified("productType") || !this.productTypeName) {
      const ProductType = this.model("ProductType");
      const typeDoc = await ProductType.findById(this.productType).select("name");
      if (typeDoc) {
        this.productTypeName = typeDoc.name;
      }
    }
    next();
  });

  // ♻️ بعد الحذف: نظّف التوابع + حدّث العدّاد
  schema.post("findOneAndDelete", async function (doc) {
    if (!doc) return;

    await productQueue.add("cleanupAfterDelete", { productId: doc._id });
    if (doc.productType) {
      await productQueue.add("updateProductTypeCount", {
        productType: doc.productType,
      });
    }
  });

  // 🔁 بعد الحفظ: حدّث عدّاد المنتجات لكل نوع
  schema.post("save", async function (doc) {
    if (!doc.productType) return;
    await productQueue.add("updateProductTypeCount", {
      productType: doc.productType,
    });
  });
};
