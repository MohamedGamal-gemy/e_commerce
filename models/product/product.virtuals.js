// module.exports = (schema) => {
//   schema.virtual("discountIsActive").get(function () {
//     if (!this.discountStart || !this.discountEnd) return false;

//     const now = new Date();
//     return now >= this.discountStart && now <= this.discountEnd;
//   });

//   schema.virtual("finalPrice").get(function () {
//     if (!this.discountIsActive) return this.originalPrice;

//     if (this.discountType === "percentage") {
//       return Math.max(
//         0,
//         Math.round(this.originalPrice * (1 - this.discountValue / 100))
//       );
//     }

//     if (this.discountType === "flat") {
//       return Math.max(0, this.originalPrice - this.discountValue);
//     }

//     return this.originalPrice;
//   });

//   // نسبة الخصم الحقيقية (للعرض فقط)
//   schema.virtual("discountPercentage").get(function () {
//     if (!this.discountIsActive) return 0;
//     if (!this.originalPrice) return 0;

//     const discount =
//       ((this.originalPrice - this.finalPrice) / this.originalPrice) * 100;

//     return Math.round(discount);
//   });

//   // الديفولت variant
//   schema.virtual("defaultVariant", {
//     ref: "ProductVariant",
//     localField: "_id",
//     foreignField: "productId",
//     justOne: true,
//     match: { isDefault: true },
//   });
// };

module.exports = (schema) => {
  schema.virtual("discountIsActive").get(function () {
    if (!this.discountStart || !this.discountEnd) return false;

    const now = new Date();
    const start = new Date(this.discountStart);
    const end = new Date(this.discountEnd);

    return now >= start && now <= end;
  });

  schema.virtual("finalPrice").get(function () {
    if (!this.discountIsActive) return this.originalPrice;

    if (this.discountType === "percentage") {
      return Math.max(
        0,
        Math.round(this.originalPrice * (1 - this.discountValue / 100))
      );
    }

    if (this.discountType === "flat") {
      return Math.max(0, this.originalPrice - this.discountValue);
    }

    return this.originalPrice;
  });

  schema.virtual("discountPercentage").get(function () {
    if (!this.discountIsActive) return 0;
    if (!this.originalPrice) return 0;

    const discount =
      ((this.originalPrice - this.finalPrice) / this.originalPrice) * 100;

    return Math.round(discount);
  });

  schema.virtual("defaultVariant", {
    ref: "ProductVariant",
    localField: "_id",
    foreignField: "productId",
    justOne: true,
    match: { isDefault: true },
  });
  //
  // schema.virtual("allColors").get(function () {
  //   if (!this.variants || this.variants.length === 0) return [];
  //   return this.variants.map((v) => v.color);
  // });

  //
  // schema.virtual("productTypeName").get(function () {
  //   return this.productType.name;
  // });

  // schema.virtual("productTypeNameVirtual").get(function () {
  //   return this.productTypeName || "";
  // });
  //
  // schema.virtual("productTypeName").get(async function () {
  //   const ProductType = this.model("ProductType");
  //   const type = await ProductType.findById(this.productType).select("name");
  //   return type?.name;
  // });
};
