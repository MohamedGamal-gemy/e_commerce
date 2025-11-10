const mongoose = require("mongoose");

module.exports = (schema) => {
  schema.statics.getColorCounts = async function (query = {}) {
    const pipeline = [];

    // 🟢 لو المستخدم حدد نوع منتج (بـ الاسم أو الـ id)
    if (query.productTypeName || query.productTypeId) {
      const match = {};

      if (query.productTypeId && mongoose.isValidObjectId(query.productTypeId)) {
        match._id = new mongoose.Types.ObjectId(query.productTypeId);
      } else if (query.productTypeName) {
        match.name = { $regex: new RegExp(`^${query.productTypeName}$`, "i") };
      }

      // 🔄 نربط الـ ProductVariant → Product → ProductType
      pipeline.push(
        {
          $lookup: {
            from: "products",
            localField: "productId",
            foreignField: "_id",
            as: "product",
          },
        },
        { $unwind: "$product" },
        {
          $lookup: {
            from: "producttypes",
            localField: "product.productType",
            foreignField: "_id",
            as: "type",
          },
        },
        { $unwind: "$type" },
        { $match: match.name ? { "type.name": match.name } : { "type._id": match._id } }
      );
    }

    // 🧮 نحسب عدد المنتجات المختلفة لكل لون
    pipeline.push(
      {
        $group: {
          _id: { name: "$color.name", value: "$color.value" },
          productIds: { $addToSet: "$productId" },
        },
      },
      {
        $project: {
          _id: 0,
          name: "$_id.name",
          value: "$_id.value",
          count: { $size: "$productIds" },
        },
      },
      { $sort: { count: -1 } }
    );

    return this.aggregate(pipeline);
  };
};
