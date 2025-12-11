// // exports.variantsLookupCombined = function variantsLookupCombined(variantMatch) {
// //   // variantMatch is an expression object (or empty object)
// //   const extraVariantFilters = Object.keys(variantMatch || {}).length
// //     ? [{ $match: variantMatch }]
// //     : [];

// //   return {
// //     $lookup: {
// //       from: "productvariants",
// //       let: { productId: "$_id" },
// //       pipeline: [
// //         { $match: { $expr: { $eq: ["$productId", "$$productId"] } } },
// //         ...extraVariantFilters,
// //         { $sort: { createdAt: -1 } },
// //         // For variantsForData we will later $unwind the resulting array
// //         // For variantsAll we want just color + images (small projection)
// //         {
// //           $project: {
// //             sku: 1,
// //             price: 1,
// //             color: 1,
// //             images: 1,
// //             createdAt: 1,
// //           },
// //         },
// //       ],
// //       as: "variantsCombined",
// //     },
// //   };
// // };

// exports.variantsLookupCombined = function variantsLookupCombined(variantMatch) {
//   const extraVariantFilters = Object.keys(variantMatch || {}).length
//     ? [{ $match: variantMatch }]
//     : [];

//   return {
//     $lookup: {
//       from: "productvariants",
//       let: { productId: "$_id" },
//       pipeline: [
//         { $match: { $expr: { $eq: ["$productId", "$$productId"] } } },
//         ...extraVariantFilters,
//         { $sample: { size: 50 } }, // <-- يعيد 50 variant عشوائي لكل منتج
//         {
//           $project: {
//             sku: 1,
//             price: 1,
//             color: 1,
//             images: 1,
//             createdAt: 1,
//           },
//         },
//       ],
//       as: "variantsCombined",
//     },
//   };
// };

exports.variantsLookupCombined = function variantsLookupCombined(variantMatch) {
  // variantMatch is an expression object (or empty object)
  const extraVariantFilters = Object.keys(variantMatch || {}).length
    ? [{ $match: variantMatch }]
    : [];

  return {
    $lookup: {
      from: "productvariants",
      let: { productId: "$_id" },
      pipeline: [
        // Match variants for the current product
        { $match: { $expr: { $eq: ["$productId", "$$productId"] } } },

        // Apply any additional filters
        ...extraVariantFilters,

        // Get a random sample of up to 50 variants
        { $sample: { size: 50 } },

        // Project only the needed fields
        {
          $project: {
            // sku: 1,
            // price: 1,
            color: 1,
            images: 1,
            // createdAt: 1,
          },
        },
      ],
      as: "variantsCombined",
    },
  };
};
