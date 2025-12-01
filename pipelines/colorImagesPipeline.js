// exports.buildColorsImagesFacet = function buildColorsImagesFacet() {
//   return [
//     { $project: { productId: "$_id", variantsAll: 1 } },
//     { $unwind: { path: "$variantsAll", preserveNullAndEmptyArrays: false } },
//     {
//       $group: {
//         _id: { productId: "$productId", colorName: "$variantsAll.color.name" },
//         count: { $sum: 1 },
//         image: { $first: { $arrayElemAt: ["$variantsAll.images.url", 0] } },
//         value: { $first: "$variantsAll.color.value" },
//       },
//     },
//     { $match: { count: { $gt: 0 } } },
//     {
//       $group: {
//         _id: "$_id.productId",
//         colors: {
//           $push: {
//             name: "$_id.colorName",
//             value: "$value",
//             image: "$image",
//             count: "$count",
//           },
//         },
//       },
//     },
//     { $project: { _id: 0, productId: "$_id", colors: 1 } },
//   ];
// };

exports.buildColorsImagesFacet = function buildColorsImagesFacet() {
  return [
    // transform variantsCombined into documents per variant
    {
      $unwind: { path: "$variantsCombined" },
    },
    {
      $project: {
        productId: "$_id",
        colorName: "$variantsCombined.color.name",
        colorValue: "$variantsCombined.color.value",
        image: { $arrayElemAt: ["$variantsCombined.images.url", 0] },
      },
    },
    // group by product + color to count variants per color and capture a sample image
    {
      $group: {
        _id: {
          productId: "$productId",
          colorName: "$colorName",
          colorValue: "$colorValue",
        },
        count: { $sum: 1 },
        image: { $first: "$image" },
      },
    },
    // group by product to build colors array
    {
      $group: {
        _id: "$_id.productId",
        colors: {
          $push: {
            name: "$_id.colorName",
            value: "$_id.colorValue",
            image: "$image",
            count: "$count",
          },
        },
      },
    },
    {
      $project: { _id: 0, productId: "$_id", colors: 1 },
    },
  ];
};
