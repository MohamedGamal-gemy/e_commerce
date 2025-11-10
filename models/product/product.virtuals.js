module.exports = (schema) => {
  schema.virtual("finalPrice").get(function () {
    if (!this.discountIsActive) return this.price;
    return this.discountType === "percentage"
      ? this.price * (1 - this.discountValue / 100)
      : this.price - this.discountValue;
  });

  schema.virtual("discountPercentage").get(function () {
    if (!this.originalPrice || this.originalPrice <= this.price) return 0;
    return Math.round(
      ((this.originalPrice - this.price) / this.originalPrice) * 100
    );
  });

  schema.virtual("defaultVariant", {
    ref: "ProductVariant",
    localField: "_id",
    foreignField: "productId",
    justOne: true,
    match: { isDefault: true },
  });

  // schema.virtual("allColors").get(function () {
  //   if (!this.populated("variants")) return [];
  //   return [...new Set(this.variants.map((v) => v.color.name))];
  // });

  // schema.virtual("allSizes").get(function () {
  //   const sizes = new Set();
  //   if (this.populated("variants")) {
  //     this.variants.forEach((v) => v.sizes.forEach((s) => sizes.add(s.size)));
  //   }
  //   return Array.from(sizes);
  // });

  // schema.virtual("colorPreviews").get(function () {
  //   if (!this.populated("variants")) return [];
  //   return this.variants.map((v) => ({
  //     color: v.color,
  //     previewImage: v.images?.[0]?.url || null,
  //   }));
  // });
};
