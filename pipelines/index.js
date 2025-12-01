const { buildColorsImagesFacet } = require("./colorImagesPipeline");

const { buildPagination } = require("./paginatePipeline");

const { buildProductMatch } = require("./searchPipeline");

const {
  variantsLookupAll,
  variantsLookupForData,
} = require("./variantsPipeline");

//
// Internal: Case-insensitive match for variants colors
//
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

//
// Build the aggregation pipeline
//
function buildPipeline({ query, page = 1, limit = 20 }) {
  const skip = (page - 1) * limit;
  const productMatch = buildProductMatch(query);
  const variantMatch = buildVariantMatch(query);

  return [
    { $match: productMatch },
    variantsLookupForData(variantMatch),
    variantsLookupAll(),
    {
      $facet: {
        data: [
          {
            $unwind: {
              path: "$variantsForData",
              preserveNullAndEmptyArrays: false,
            },
          },
          {
            $project: {
              productId: "$_id",
              title: "$title",
              slug: "$slug",
              price: "$price",
              rating: "$rating",
              productTypeName: "$productTypeName",
              mainImage: "$mainImage",
              variant: "$variantsForData",
              _variantsCount: { $size: "$variantsAll" },
            },
          },
          ...buildPagination({ skip, limit }),
          {
            $project: {
              variantId: "$variant._id",
              _id: "$productId",
              title: 1,
              slug: 1,
              price: 1,
              rating: 1,
              productTypeName: 1,
              sku: "$variant.sku",
              color: "$variant.color",
              image: {
                $ifNull: [
                  { $arrayElemAt: ["$variant.images.url", 0] },
                  "$mainImage",
                ],
              },
            },
          },
        ],

        totalVariants: [
          { $project: { variantsForCount: "$variantsForData" } },
          {
            $unwind: {
              path: "$variantsForCount",
              preserveNullAndEmptyArrays: false,
            },
          },
          { $count: "count" },
        ],

        colorsImagesMap: buildColorsImagesFacet(),
      },
    },
  ];
}

//
// Request handler factory
//
function getProductsAggregationHandler(ProductModel) {
  return async function productsHandler(req, res, next) {
    try {
      const page = parseInt(req.query.page || "1", 10);
      const limit = parseInt(req.query.limit || "20", 10);

      const pipeline = buildPipeline({ query: req.query, page, limit });

      const aggResult = await ProductModel.aggregate(pipeline).allowDiskUse(
        true
      );
      const facets = aggResult[0] || {};

      const data = facets.data || [];
      const totalVariants =
        (facets.totalVariants &&
          facets.totalVariants[0] &&
          facets.totalVariants[0].count) ||
        0;

      // Map ProductId -> array of colors + images
      const colorsImagesMap = (facets.colorsImagesMap || []).reduce(
        (acc, cur) => {
          acc[String(cur.productId)] = cur.colors;
          return acc;
        },
        {}
      );

      // Final formatted rows
      const formatted = data.map((row) => ({
        ...row,
        colorsImages: colorsImagesMap[String(row._id)] || [],
      }));

      // ✅ هنا أزلنا الفلاتر من الـ response
      res.json({
        success: true,
        data: formatted,
        pagination: {
          page,
          limit,
          total: totalVariants,
          totalPages: Math.ceil(totalVariants / limit),
        },
      });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = {
  buildProductMatch,
  buildVariantMatch,
  buildPipeline,
  getProductsAggregationHandler,
};
