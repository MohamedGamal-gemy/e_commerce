const slugify = require("slugify");
const { productQueue } = require("../../queues/productQueue");

module.exports = (schema) => {
  // 1) Auto-generate unique slug
  schema.pre("save", async function (next) {
    if (this.isModified("title")) {
      const Product = this.model("Product");
      const baseSlug = slugify(this.title, {
        lower: true,
        strict: true,
        locale: "ar",
        trim: true,
      });

      let slug = baseSlug;
      let count = 0;

      while (await Product.exists({ slug })) {
        count++;
        slug = `${baseSlug}-${count}`;
      }

      this.slug = slug;
    }
    next();
  });

  // 2) Sync productTypeName
  schema.pre("save", async function (next) {
    if (this.isModified("productType") || !this.productTypeName) {
      const ProductType = this.model("ProductType");
      const typeDoc = await ProductType.findById(this.productType).select(
        "name"
      );
      if (typeDoc) this.productTypeName = typeDoc.name;
    }
    next();
  });

  // 3) searchableText
  schema.pre("save", function (next) {
    this.searchableText = [
      this.title,
      this.description,
      this.tags?.join(" "),
      this.keywords?.join(" "),
      this.productTypeName,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    next();
  });

  // 4) Discount activity
  schema.pre("save", function (next) {
    const now = new Date();
    this.discountIsActive =
      this.discountStart && this.discountEnd
        ? now >= this.discountStart && now <= this.discountEnd
        : false;
    next();
  });

  // 5) Mark new arrivals
  schema.pre("save", function (next) {
    const created = this.createdAt || new Date();
    const diffDays = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
    this.isNewArrival = diffDays <= 14;
    next();
  });

  // 6) Cleanup strings
  schema.pre("save", function (next) {
    this.title =
      typeof this.title === "string" ? this.title.trim() : this.title;
    this.metaTitle =
      typeof this.metaTitle === "string"
        ? this.metaTitle.trim()
        : this.metaTitle;
    this.slug =
      typeof this.slug === "string"
        ? this.slug.trim().toLowerCase()
        : this.slug;
    next();
  });

  // 7) Post save: enqueue jobs with safe jobId
  schema.post("save", async function (doc) {
    if (!doc.productType) return;

    await productQueue.add(
      "updateProductTypeCount",
      { productType: doc.productType },
      { jobId: `updateProductTypeCount_${doc.productType}` }
    );

    await productQueue.add(
      "recalculateStock",
      { productId: doc._id },
      { jobId: `recalculateStock_${doc._id}` }
    );
  });

  // 8) Post update
  schema.post("findOneAndUpdate", async function (doc) {
    if (!doc) return;
    if (doc.productType) {
      await productQueue.add(
        "updateProductTypeCount",
        { productType: doc.productType },
        { jobId: `updateProductTypeCount_${doc.productType}` }
      );
    }
    await productQueue.add(
      "recalculateStock",
      { productId: doc._id },
      { jobId: `recalculateStock_${doc._id}` }
    );
  });

  // 9) Cleanup after delete
  schema.post("findOneAndDelete", async function (doc) {
    if (!doc) return;

    await productQueue.add(
      "cleanupAfterDelete",
      { productId: doc._id },
      { jobId: `cleanupAfterDelete_${doc._id}` }
    );

    if (doc.productType) {
      await productQueue.add(
        "updateProductTypeCount",
        { productType: doc.productType },
        { jobId: `updateProductTypeCount_${doc.productType}` }
      );
    }
  });
};
