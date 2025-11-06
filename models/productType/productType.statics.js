const mongoose = require("mongoose");

module.exports = (schema) => {
  schema.statics.updateProductCount = async function (productTypeId) {
    const Product = mongoose.model("Product");

    const count = await Product.countDocuments({ productType: productTypeId });

    await this.findByIdAndUpdate(productTypeId, { productCount: count });
  };
};
