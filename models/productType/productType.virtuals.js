module.exports = (schema) => {
  schema.virtual("dynamicProductCount", {
    ref: "Product",
    localField: "_id",
    foreignField: "productType",
    count: true,
  });
};
