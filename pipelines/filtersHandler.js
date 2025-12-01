
function buildFiltersPipeline(productMatch) {
  return [
    { $match: productMatch },

    {
      $facet: {
        priceRange: [
          {
            $group: {
              _id: null,
              min: { $min: "$price" },
              max: { $max: "$price" },
            },
          },
        ],
        colors: [
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
        ],
      },
    },
  ];
}

module.exports = { buildFiltersPipeline };
