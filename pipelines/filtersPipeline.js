
exports.buildColorsPipeline = function buildColorsPipeline(productMatch) {
  return [
    { $match: productMatch },
    { $unwind: "$colors" },
    {
      $group: {
        _id: "$colors.name",
        value: { $first: "$colors.value" },
        countProducts: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, name: "$_id", value: 1, countProducts: 1 } },
  ];
};

exports.buildPriceRangePipeline = function buildPriceRangePipeline() {
  return [
    {
      $group: {
        _id: null,
        min: { $min: "$price" },
        max: { $max: "$price" },
      },
    },
  ];
};
