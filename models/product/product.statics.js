const mongoose = require("mongoose");

module.exports = (schema) => {
  /**
   * Recalculate aggregate data (stock, variants, colors, images)
   * @param {ObjectId|string} productId - Product ID
   * @returns {Promise<void>}
   */
  schema.statics.recalcAggregates = async function (productId) {
    const ProductVariant = mongoose.model("ProductVariant");

    if (!mongoose.isValidObjectId(productId)) {
      console.warn("⚠️ Invalid productId provided to recalcAggregates:", productId);
      return;
    }

    try {
      // 1️⃣ Calculate base variant stats (variants) - doesn't depend on 'sizes'
      const baseStats = await ProductVariant.aggregate([
        { $match: { productId: new mongoose.Types.ObjectId(productId) } },
        {
          $group: {
            _id: null,
            variantIds: { $addToSet: "$_id" },
          },
        },
      ]);

      const variantIds = baseStats[0]?.variantIds || [];

      // 2️⃣ Calculate stock data (depends on 'sizes')
      const stockStats = await ProductVariant.aggregate([
        { $match: { productId: new mongoose.Types.ObjectId(productId) } },
        { $unwind: "$sizes" },
        {
          $group: {
            _id: null,
            totalStock: { $sum: "$sizes.stock" },
          },
        },
      ]);

      const totalStock = stockStats[0]?.totalStock || 0;

      // 3️⃣ If no variants exist → zero out values
      if (variantIds.length === 0) {
        // Use updateOne instead of findByIdAndUpdate to avoid triggering hooks
        await this.updateOne(
          { _id: productId },
          {
            $set: {
              totalStock: 0,
              numVariants: 0,
              isAvailable: false,
            },
          }
        );
        return;
      }

      // 4️⃣ Update product with aggregated values
      // Note: colorNames and images are no longer stored - use colorPreviews from aggregate instead
      // Use updateOne instead of findByIdAndUpdate to avoid triggering post hooks
      // This prevents the recalculateStock job from being queued again
      await this.updateOne(
        { _id: productId },
        {
          $set: {
            totalStock,
            numVariants: variantIds.length,
            isAvailable: totalStock > 0,
          },
        }
      );
    } catch (error) {
      console.error("❌ Error in recalcAggregates:", error);
      throw error;
    }
  };

  /**
   * Update product rating and review count
   * @param {ObjectId|string} productId - Product ID
   * @returns {Promise<void>}
   */
  schema.statics.updateProductRating = async function (productId) {
    const Review = mongoose.model("Review");

    if (!mongoose.isValidObjectId(productId)) {
      console.warn("⚠️ Invalid productId provided to updateProductRating:", productId);
      return;
    }

    try {
      const stats = await Review.aggregate([
        { $match: { product: new mongoose.Types.ObjectId(productId) } },
        {
          $group: {
            _id: null,
            avgRating: { $avg: "$rating" },
            numReviews: { $sum: 1 },
          },
        },
      ]);

      const avgRating = stats[0]?.avgRating || 0;
      const numReviews = stats[0]?.numReviews || 0;

      await this.findByIdAndUpdate(productId, {
        rating: Number(avgRating.toFixed(1)),
        numReviews,
      });
    } catch (error) {
      console.error("❌ Error in updateProductRating:", error);
      throw error;
    }
  };

  /**
   * Get products with color previews (optimized for list/card views)
   * Uses aggregate pipeline to avoid populate overhead
   * @param {Object} filter - MongoDB filter object
   * @param {Object} options - Query options (sort, skip, limit, select)
   * @returns {Promise<Array>} - Products with colorPreviews included
   */
  schema.statics.getProductsWithColorPreviews = async function (
    filter = {},
    options = {}
  ) {
    const {
      sort = { createdAt: -1 },
      skip = 0,
      limit = 20,
      select = "title price slug rating numReviews totalStock status isAvailable",
    } = options;
  
    const ProductVariant = mongoose.model("ProductVariant");
  
    try {
      const hasTextSearch = !!filter.$text;
      const productTypeNames = filter.productTypeName || [];
      delete filter.productTypeName; // نشيله من الفلتر الأساسي
  
      const pipeline = [
        { $match: filter },
  
        ...(hasTextSearch
          ? [
              {
                $addFields: {
                  score: { $meta: "textScore" },
                },
              },
            ]
          : []),
  
        // Lookup ProductType
        {
          $lookup: {
            from: "producttypes",
            localField: "productType",
            foreignField: "_id",
            as: "productTypeData",
            pipeline: [{ $project: { name: 1 } }],
          },
        },
  
        // لو فيه فلترة على productTypeName نعمل match بعد lookup
        ...(productTypeNames.length > 0
          ? [
              {
                $match: {
                  "productTypeData.name": { $in: productTypeNames },
                },
              },
            ]
          : []),
  
        // Lookup variants for color previews
        {
          $lookup: {
            from: "productvariants",
            localField: "_id",
            foreignField: "productId",
            as: "variants",
            pipeline: [
              {
                $project: {
                  color: 1,
                  firstImage: { $arrayElemAt: ["$images", 0] },
                  isDefault: 1,
                },
              },
              { $sort: { isDefault: -1 } },
            ],
          },
        },
  
        // Add computed fields
        {
          $addFields: {
            colorPreviews: {
              $map: {
                input: "$variants",
                as: "variant",
                in: {
                  color: "$$variant.color",
                  previewImage: { $ifNull: ["$$variant.firstImage.url", null] },
                },
              },
            },
            productTypeName: {
              $ifNull: [{ $arrayElemAt: ["$productTypeData.name", 0] }, null],
            },
          },
        },
  
        {
          $project: (() => {
            const projection = {
              colorPreviews: 1,
              productTypeName: 1,
            };
  
            if (hasTextSearch) projection.score = 1;
            if (select) {
              select.split(" ").forEach((field) => {
                if (
                  field &&
                  field.trim() &&
                  field !== "variants" &&
                  field !== "productTypeData"
                ) {
                  projection[field.trim()] = 1;
                }
              });
            }
            return projection;
          })(),
        },
  
        { $sort: sort },
        { $skip: skip },
        { $limit: limit },
      ];
  
      const products = await this.aggregate(pipeline);
      return products;
    } catch (error) {
      console.error("❌ Error in getProductsWithColorPreviews:", error);
      throw error;
    }
  };
  

  /**
   * Get single product with color previews (optimized)
   * @param {ObjectId|string} productId - Product ID
   * @returns {Promise<Object|null>} - Product with colorPreviews
   */
  schema.statics.getProductWithColorPreviews = async function (productId) {
    if (!mongoose.isValidObjectId(productId)) {
      return null;
    }

    const products = await this.getProductsWithColorPreviews(
      { _id: new mongoose.Types.ObjectId(productId) },
      { limit: 1 }
    );

    return products[0] || null;
  };
};