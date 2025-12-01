// // const { connection: redis } = require("../config/redis");

// // const { buildColorsImagesFacet } = require("../pipelines/colorImagesPipeline");
// // const { buildPagination } = require("../pipelines/paginatePipeline");
// // const { buildProductMatch } = require("../pipelines/searchPipeline");
// // const { variantsLookupCombined } = require("../pipelines/variantsPipeline");

// // // -------------------------------
// // // Case-insensitive variant color filter
// // // -------------------------------
// // function buildVariantMatch({ color }) {
// //   if (!color) return {};

// //   const colors = String(color)
// //     .split(",")
// //     .map((c) => c.trim().toLowerCase())
// //     .filter(Boolean);

// //   return {
// //     $expr: { $in: [{ $toLower: "$color.name" }, colors] },
// //   };
// // }

// // // -------------------------------
// // function buildPipeline({ query, page = 1, limit = 20 }) {
// //   const skip = (page - 1) * limit;
// //   const productMatch = buildProductMatch(query);
// //   const variantMatch = buildVariantMatch(query);

// //   return [
// //     { $match: productMatch },

// //     variantsLookupCombined(variantMatch),

// //     {
// //       $facet: {
// //         data: [
// //           {
// //             $addFields: {
// //               variantsCombined: {
// //                 $sortArray: {
// //                   input: "$variantsCombined",
// //                   sortBy: { "color.name": 1 },
// //                 },
// //               },
// //             },
// //           },

// //           {
// //             $unwind: {
// //               path: "$variantsCombined",
// //               preserveNullAndEmptyArrays: false,
// //             },
// //           },

// //           {
// //             $project: {
// //               productId: "$_id",
// //               title: 1,
// //               slug: 1,
// //               price: 1,
// //               productTypeName: 1,
// //               mainImage: 1,
// //               variant: "$variantsCombined",
// //             },
// //           },

// //           ...buildPagination({ skip, limit }),

// //           {
// //             $project: {
// //               _id: "$variant._id",
// //               productId: 1,
// //               productTypeName: 1,
// //               title: 1,
// //               slug: 1,
// //               price: 1,
// //               image: {
// //                 $ifNull: [
// //                   { $arrayElemAt: ["$variant.images.url", 0] },
// //                   "$mainImage",
// //                 ],
// //               },
// //               color: "$variant.color",
// //             },
// //           },
// //         ],

// //         totalVariants: [{ $count: "count" }],

// //         colorsImagesMap: buildColorsImagesFacet(),
// //       },
// //     },
// //   ];
// // }

// // // ----------------------------------------
// // // 🔥 Anti-Clump Function (منع تكرار نفس المنتج ورا بعض)
// // // ----------------------------------------
// // function declump(items) {
// //   const groups = {};

// //   for (const item of items) {
// //     if (!groups[item.productId]) groups[item.productId] = [];
// //     groups[item.productId].push(item);
// //   }

// //   const sorted = Object.values(groups).sort((a, b) => b.length - a.length);

// //   const result = [];
// //   let added = true;

// //   while (added) {
// //     added = false;
// //     for (const g of sorted) {
// //       if (g.length > 0) {
// //         result.push(g.shift());
// //         added = true;
// //       }
// //     }
// //   }

// //   return result;
// // }

// // // ----------------------------------------
// // // 🔥 إضافة Redis Cache (مهم جداً)
// // // ----------------------------------------
// // async function getCachedOrRun(key, ttl, runFn) {
// //   const cached = await redis.get(key);

// //   if (cached) return JSON.parse(cached);

// //   const fresh = await runFn();

// //   await redis.set(key, JSON.stringify(fresh), "EX", ttl);

// //   return fresh;
// // }

// // // ----------------------------------------
// // function getProductsAggregationHandler(ProductModel) {
// //   return async function productsHandler(req, res, next) {
// //     try {
// //       const page = parseInt(req.query.page || "1", 10);
// //       const limit = parseInt(req.query.limit || "20", 10);

// //       const cacheKey = `products:${JSON.stringify(req.query)}`;

// //       const result = await getCachedOrRun(cacheKey, 60, async () => {
// //         const pipeline = buildPipeline({ query: req.query, page, limit });

// //         const aggResult = await ProductModel.aggregate(pipeline).allowDiskUse(
// //           true
// //         );

// //         const facets = aggResult[0] || {};
// //         const data = facets.data || [];
// //         const totalVariants = facets.totalVariants?.[0]?.count || 0;

// //         const productColorsMap = (facets.colorsImagesMap || []).reduce(
// //           (acc, cur) => {
// //             acc[String(cur.productId)] = (cur.colors || []).map((c) => ({
// //               name: c.name,
// //               value: c.value,
// //             }));
// //             return acc;
// //           },
// //           {}
// //         );

// //         const withColors = data.map((row) => ({
// //           ...row,
// //           productColors: productColorsMap[row.productId] || [],
// //         }));

// //         const declumped = declump(withColors);

// //         return {
// //           success: true,
// //           data: declumped,
// //           pagination: {
// //             page,
// //             limit,
// //             total: totalVariants,
// //             totalPages: Math.ceil(totalVariants / limit),
// //           },
// //         };
// //       });

// //       return res.json(result);
// //     } catch (err) {
// //       next(err);
// //     }
// //   };
// // }

// // module.exports = {
// //   buildProductMatch,
// //   variantsLookupCombined,
// //   buildPipeline,
// //   getProductsAggregationHandler,
// // };

// const { connection: redis } = require("../config/redis");

// const { buildColorsImagesFacet } = require("../pipelines/colorImagesPipeline");
// const { buildPagination } = require("../pipelines/paginatePipeline");
// const { buildProductMatch } = require("../pipelines/searchPipeline");
// const { variantsLookupCombined } = require("../pipelines/variantsPipeline");
// const { buildSortPipeline, SORT_OPTIONS } = require("../pipelines/sortingBy");

// // -------------------------------
// // Case-insensitive variant color filter
// // -------------------------------
// function buildVariantMatch({ color }) {
//   if (!color) return {};

//   const colors = String(color)
//     .split(",")
//     .map((c) => c.trim().toLowerCase())
//     .filter(Boolean);

//   return {
//     $expr: { $in: [{ $toLower: "$color.name" }, colors] },
//   };
// }

// // -------------------------------
// // Build aggregation pipeline
// // -------------------------------
// function buildPipeline({ query, page = 1, limit = 20 }) {
//   const skip = (page - 1) * limit;
//   const productMatch = buildProductMatch(query);
//   const variantMatch = buildVariantMatch(query);

//   // const sortBy = query.sortBy || "newest";
//   const sortBy = query.sortB;
//   const sortPipeline = buildSortPipeline(sortBy) || [];

//   return [
//     { $match: productMatch },

//     variantsLookupCombined(variantMatch),

//     ...sortPipeline, // apply sorting before unwind

//     {
//       $facet: {
//         data: [
//           {
//             $addFields: {
//               variantsCombined: {
//                 $sortArray: {
//                   input: "$variantsCombined",
//                   sortBy: { "color.name": 1 }, // ثابت لتسهيل declump
//                 },
//               },
//             },
//           },

//           {
//             $unwind: {
//               path: "$variantsCombined",
//               preserveNullAndEmptyArrays: false,
//             },
//           },

//           {
//             $project: {
//               productId: "$_id",
//               title: 1,
//               slug: 1,
//               price: 1,
//               productTypeName: 1,
//               mainImage: 1,
//               variant: "$variantsCombined",
//             },
//           },

//           ...buildPagination({ skip, limit }),

//           {
//             $project: {
//               _id: "$variant._id",
//               productId: 1,
//               productTypeName: 1,
//               title: 1,
//               slug: 1,
//               price: 1,
//               image: {
//                 $ifNull: [
//                   { $arrayElemAt: ["$variant.images.url", 0] },
//                   "$mainImage",
//                 ],
//               },
//               color: "$variant.color",
//             },
//           },
//         ],

//         totalVariants: [{ $count: "count" }],
//         colorsImagesMap: buildColorsImagesFacet(),
//       },
//     },
//   ];
// }

// // -------------------------------
// // Anti-Clump Function
// // -------------------------------
// function declump(items) {
//   const groups = {};
//   for (const item of items) {
//     if (!groups[item.productId]) groups[item.productId] = [];
//     groups[item.productId].push(item);
//   }

//   const sorted = Object.values(groups).sort((a, b) => b.length - a.length);

//   const result = [];
//   let added = true;
//   while (added) {
//     added = false;
//     for (const g of sorted) {
//       if (g.length > 0) {
//         result.push(g.shift());
//         added = true;
//       }
//     }
//   }
//   return result;
// }

// // -------------------------------
// // Redis Cache Helper
// // -------------------------------
// async function getCachedOrRun(key, ttl, runFn) {
//   if (!redis) throw new Error("Redis connection is undefined");

//   // const cached = await redis.get(key);
//   // if (cached) return JSON.parse(cached);

//   const fresh = await runFn();
//   // await redis.set(key, JSON.stringify(fresh), "EX", ttl);
//   return fresh;
// }

// // -------------------------------
// // Products Aggregation Handler
// // -------------------------------
// function getProductsAggregationHandler(ProductModel) {
//   return async function productsHandler(req, res, next) {
//     try {
//       const page = parseInt(req.query.page || "1", 10);
//       const limit = parseInt(req.query.limit || "20", 10);

//       const cacheKey = `products:${JSON.stringify(
//         req.query
//       )}:page:${page}:limit:${limit}`;

//       // const result = await getCachedOrRun(cacheKey, 60, async () => {
//       const result = await getCachedOrRun(cacheKey, 60, async () => {
//         const pipeline = buildPipeline({ query: req.query, page, limit });
//         const aggResult = await ProductModel.aggregate(pipeline).allowDiskUse(
//           true
//         );
//         console.log(req.query.sortBy);

//         const facets = aggResult[0] || {};
//         const data = facets.data || [];
//         const totalVariants = facets.totalVariants?.[0]?.count || 0;

//         const productColorsMap = (facets.colorsImagesMap || []).reduce(
//           (acc, cur) => {
//             acc[String(cur.productId)] = (cur.colors || []).map((c) => ({
//               name: c.name,
//               value: c.value,
//             }));
//             return acc;
//           },
//           {}
//         );

//         const withColors = data.map((row) => ({
//           ...row,
//           productColors: productColorsMap[row.productId] || [],
//         }));

//         const declumped = declump(withColors);

//         return {
//           success: true,
//           data: declumped,
//           // data: redata,
//           pagination: {
//             page,
//             limit,
//             total: totalVariants,
//             totalPages: Math.ceil(totalVariants / limit),
//           },
//         };
//       });

//       return res.json(result);
//      const declumped = declump(withColors);

//         return {
//           success: true,
//           // data: declumped,
//           data: req.query.sortBy ? data : declumped,
//           pagination: {
//             page,
//             limit,
//             total: totalVariants,
//             totalPages: Math.ceil(totalVariants / limit),
//           },
//         };
//       })

//       return res.json(result);
//     } catch (err) {
//       next(err)
//     }
//   };

// module.exports = {
//   buildProductMatch,
//   variantsLookupCombined,
//   buildPipeline,
//   getProductsAggregationHandler,
// };

const { connection: redis } = require("../config/redis");

const { buildColorsImagesFacet } = require("../pipelines/colorImagesPipeline");
const { buildPagination } = require("../pipelines/paginatePipeline");
const { buildProductMatch } = require("../pipelines/searchPipeline");
const { variantsLookupCombined } = require("../pipelines/variantsPipeline");
const { buildSortPipeline, SORT_OPTIONS } = require("../pipelines/sortingBy");

// -------------------------------
// Case-insensitive variant color filter
// -------------------------------
function buildVariantMatch({ color }) {
  if (!color) return {};

  const colors = String(color)
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);

  return {
    $expr: { $in: [{ $toLower: "$color.name" }, colors] },
  };
}

// -------------------------------
// Build aggregation pipeline
// -------------------------------
function buildPipeline({ query, page = 1, limit = 20 }) {
  const skip = (page - 1) * limit;
  const productMatch = buildProductMatch(query);
  const variantMatch = buildVariantMatch(query);

  const sortBy = query.sortBy;
  const sortPipeline = buildSortPipeline(sortBy) || [];

  return [
    { $match: productMatch },

    variantsLookupCombined(variantMatch),

    ...sortPipeline, // apply sorting before unwind

    {
      $facet: {
        data: [
          {
            $addFields: {
              variantsCombined: {
                $sortArray: {
                  input: "$variantsCombined",
                  sortBy: { "color.name": 1 }, // ثابت لتسهيل declump
                },
              },
            },
          },

          {
            $unwind: {
              path: "$variantsCombined",
              preserveNullAndEmptyArrays: false,
            },
          },

          {
            $project: {
              productId: "$_id",
              title: 1,
              slug: 1,
              price: 1,
              productTypeName: 1,
              mainImage: 1,
              variant: "$variantsCombined",
            },
          },

          ...buildPagination({ skip, limit }),

          {
            $project: {
              _id: "$variant._id",
              productId: 1,
              productTypeName: 1,
              title: 1,
              slug: 1,
              price: 1,
              image: {
                $ifNull: [
                  { $arrayElemAt: ["$variant.images.url", 0] },
                  "$mainImage",
                ],
              },
              color: "$variant.color",
            },
          },
        ],

        totalVariants: [{ $count: "count" }],
        colorsImagesMap: buildColorsImagesFacet(),
      },
    },
  ];
}

// -------------------------------
// Anti-Clump Function
// -------------------------------
function declump(items) {
  const groups = {};
  for (const item of items) {
    if (!groups[item.productId]) groups[item.productId] = [];
    groups[item.productId].push(item);
  }

  const sorted = Object.values(groups).sort((a, b) => b.length - a.length);

  const result = [];
  let added = true;
  while (added) {
    added = false;
    for (const g of sorted) {
      if (g.length > 0) {
        result.push(g.shift());
        added = true;
      }
    }
  }
  return result;
}

// -------------------------------
// Redis Cache Helper
// -------------------------------
async function getCachedOrRun(key, ttl, runFn) {
  if (!redis) throw new Error("Redis connection is undefined");

  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const fresh = await runFn();
  await redis.set(key, JSON.stringify(fresh), "EX", ttl);
  return fresh;
}

// -------------------------------
// Products Aggregation Handler
// -------------------------------
function getProductsAggregationHandler(ProductModel) {
  return async function productsHandler(req, res, next) {
    try {
      const page = parseInt(req.query.page || "1", 10);
      const limit = parseInt(req.query.limit || "20", 10);

      const cacheKey = `products:${JSON.stringify(
        req.query
      )}:page:${page}:limit:${limit}`;

      const result = await getCachedOrRun(cacheKey, 60, async () => {
        const pipeline = buildPipeline({ query: req.query, page, limit });
        const aggResult = await ProductModel.aggregate(pipeline).allowDiskUse(
          true
        );

        const facets = aggResult[0] || {};
        const data = facets.data || [];
        const totalVariants = facets.totalVariants?.[0]?.count || 0;

        const productColorsMap = (facets.colorsImagesMap || []).reduce(
          (acc, cur) => {
            acc[String(cur.productId)] = (cur.colors || []).map((c) => ({
              name: c.name,
              value: c.value,
            }));
            return acc;
          },
          {}
        );

        const withColors = data.map((row) => ({
          ...row,
          productColors: productColorsMap[row.productId] || [],
        }));

        const declumped = declump(withColors);

        return {
          success: true,
          data: req.query.sortBy ? data : declumped,
          pagination: {
            page,
            limit,
            total: totalVariants,
            totalPages: Math.ceil(totalVariants / limit),
          },
        };
      });

      return res.json(result);
    } catch (err) {
      next(err);
    }
  };
}

module.exports = {
  buildProductMatch,
  variantsLookupCombined,
  buildPipeline,
  getProductsAggregationHandler,
};
