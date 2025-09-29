const express = require("express");
const asyncHandler = require("express-async-handler");
const cloudinary = require("../config/cloudinary");
const Subcategory = require("../models/subcategoryModel");
const ProductVariant = require("../models/variantsModel");

const {
  Product,
  validateProduct,
  validateProductUpdate,
} = require("../models/productModel");
const { upload } = require("../middlewares/upload");
const redis = require("../config/redis");
const router = express.Router();

router.post(
  "/",
  upload.array("variantImages", 30),
  asyncHandler(async (req, res) => {
    let payload;
    try {
      payload = JSON.parse(req.body.payload);
    } catch {
      return res.status(400).json({ message: "Invalid payload format" });
    }

    // ✅ أنشئ المنتج الأساسي
    const product = new Product({
      title: payload.title,
      description: payload.description,
      price: payload.price,
      category: payload.category,
      subcategory: payload.subcategory,
    });

    // ✅ اربط الصور بالـ variants
    const { files } = req;
    if (files && files.length > 0) {
      const variantIndexes = JSON.parse(req.body.variantIndexes || "[]");

      files.forEach((file, idx) => {
        const variantIndex = variantIndexes[idx];
        if (payload.variants[variantIndex]) {
          payload.variants[variantIndex].images.push({
            url: file.path, // أو secure_url من Cloudinary
            filename: file.filename,
          });
        }
      });
    }

    // ✅ خزّن الـ Variants في Collection منفصل
    const variantIds = await Promise.all(
      payload.variants.map(async (variant) => {
        const newVariant = await ProductVariant.create({
          color: variant.color,
          sizes: variant.sizes,
          images: variant.images,
          productId: product._id,
        });
        return newVariant._id;
      })
    );

    // ✅ اربط المنتج بالـ variants
    product.variants = variantIds;
    await product.save();

    res.status(201).json({
      message: "Product created successfully",
      product,
    });
  })
);
//
router.get("/", async (req, res) => {
  try {
    const products = await Product.find()
      .populate("category", "name") // جلب اسم الفئة
      .populate("subcategory", "name") // جلب اسم الفئة الفرعية (لو موجود)
      .populate({
        path: "variants",
        select: "color sizes images", // جلب بيانات الـ variants
      });

    res
      .status(200)
      .json({ message: "Products retrieved successfully", products });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Server error" });
  }
});

function buildSortOption(sort) {
  switch (sort) {
    case "price-asc":
      return { price: 1 };
    case "price-desc":
      return { price: -1 };
    case "rating":
      return { rating: -1 };
    case "old":
      return { createdAt: 1 };
    default: // newest
      return { createdAt: -1 };
  }
}

// router.get(
//   "/list",
//   asyncHandler(async (req, res) => {
//     const {
//       page = 1,
//       limit = 9,
//       subcategory,
//       minPrice,
//       maxPrice,
//       title,
//       sort,
//       color,
//     } = req.query;

//     const pageNum = Math.max(parseInt(page), 1);
//     const limitNum = Math.max(parseInt(limit), 1);

//     const match = {};
//     if (title) {
//       match.title = { $regex: title, $options: "i" };
//     }

//     if (subcategory) {
//       const subNames = subcategory.split(",").map((s) => s.trim());
//       const subs = await Subcategory.find({ name: { $in: subNames } }).select(
//         "_id"
//       );

//       if (subs.length === 0) {
//         return res.json({
//           products: [],
//           total: 0,
//           totalPages: 0,
//           currentPage: pageNum,
//           limit: limitNum,
//           priceStats: { minPrice: 0, maxPrice: 0 },
//           colorCounts: [],
//         });
//       }

//       match.subcategory = { $in: subs.map((s) => s._id) };
//     }

//     if (minPrice || maxPrice) {
//       match.price = {};
//       if (minPrice) match.price.$gte = Number(minPrice);
//       if (maxPrice) match.price.$lte = Number(maxPrice);
//     }

//     // Split colors and prepare case-insensitive regex
//     const colorFilter = color
//       ? color.split(",").map((c) => new RegExp(`^${c.trim()}$`, "i"))
//       : null;

//     const sortOption = buildSortOption(sort);

//     const pipeline = [
//       { $match: match },

//       {
//         $lookup: {
//           from: "subcategories",
//           localField: "subcategory",
//           foreignField: "_id",
//           as: "subcategory",
//         },
//       },
//       { $unwind: { path: "$subcategory", preserveNullAndEmptyArrays: true } },

//       {
//         $lookup: {
//           from: "productvariants",
//           let: { variantIds: "$variants" },
//           pipeline: [
//             { $match: { $expr: { $in: ["$_id", "$$variantIds"] } } },
//             ...(colorFilter
//               ? [
//                   {
//                     $match: {
//                       "color.name": { $in: colorFilter },
//                     },
//                   },
//                 ]
//               : []),
//           ],
//           as: "variants",
//         },
//       },
//       // Filter out products with no matching variants
//       { $match: { "variants.0": { $exists: true } } },

//       {
//         $facet: {
//           products: [
//             { $sort: sortOption },
//             { $skip: (pageNum - 1) * limitNum },
//             { $limit: limitNum },
//             {
//               $project: {
//                 title: 1,
//                 price: 1,
//                 rating: 1,
//                 numReviews: 1,
//                 subcategory: 1,
//                 category: 1,
//                 // firstImage: {
//                 //   $arrayElemAt: [
//                 //     {
//                 //       $map: {
//                 //         input: "$variants",
//                 //         as: "v",
//                 //         in: { $arrayElemAt: ["$$v.images.url", 0] },
//                 //       },
//                 //     },
//                 //     0,
//                 //   ],
//                 // },
//                 firstImage: {
//                   $let: {
//                     vars: {
//                       selectedVariant: {
//                         $first: {
//                           $filter: {
//                             input: "$variants",
//                             as: "v",
//                             cond: colorFilter
//                               ? { $in: ["$$v.color.name", colorFilter] } // لو المستخدم اختار لون
//                               : true, // مفيش فلتر لون
//                           },
//                         },
//                       },
//                     },
//                     in: { $arrayElemAt: ["$$selectedVariant.images.url", 0] },
//                   },
//                 },

//                 imagesOfColors: {
//                   $map: {
//                     input: "$variants",
//                     as: "v",
//                     in: { $arrayElemAt: ["$$v.images", 0] },
//                   },
//                 },
//                 createdAt: 1,
//               },
//             },
//           ],
//           totalCount: [{ $count: "count" }],
//           priceStats: [
//             {
//               $group: {
//                 _id: null,
//                 minPrice: { $min: "$price" },
//                 maxPrice: { $max: "$price" },
//               },
//             },
//           ],
//           // ✅ facet جديد لحساب عدد المنتجات لكل لون
//           colorCounts: [
//             { $unwind: "$variants" },
//             {
//               $group: {
//                 _id: { $toLower: "$variants.color.name" },
//                 name: { $first: "$variants.color.name" },
//                 count: { $sum: 1 },
//               },
//             },
//             { $sort: { name: 1 } },
//           ],
//         },
//       },
//     ];

//     const result = await Product.aggregate(pipeline);
//     const data = result[0] || {
//       products: [],
//       totalCount: [],
//       priceStats: [],
//       colorCounts: [],
//     };

//     const total = data.totalCount[0]?.count || 0;
//     const totalPages = Math.ceil(total / limitNum);

//     res.json({
//       products: data.products,
//       total,
//       totalPages,
//       priceStats: data.priceStats[0] || { minPrice: 0, maxPrice: 0 },
//       currentPage: pageNum,
//       limit: limitNum,
//       colorCounts: data.colorCounts || [],
//     });
//   })
// );
router.get(
  "/list",
  asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 9,
      subcategory,
      minPrice,
      maxPrice,
      title,
      sort,
      color,
    } = req.query;

    const pageNum = Math.max(parseInt(page), 1);
    const limitNum = Math.max(parseInt(limit), 1);

    const match = {};
    if (title) {
      match.title = { $regex: title, $options: "i" };
    }

    if (subcategory) {
      const subNames = subcategory.split(",").map((s) => s.trim());
      const subs = await Subcategory.find({ name: { $in: subNames } }).select(
        "_id"
      );

      if (subs.length === 0) {
        return res.json({
          products: [],
          total: 0,
          totalPages: 0,
          currentPage: pageNum,
          limit: limitNum,
          priceStats: { minPrice: 0, maxPrice: 0 },
          colorCounts: [],
        });
      }

      match.subcategory = { $in: subs.map((s) => s._id) };
    }

    if (minPrice || maxPrice) {
      match.price = {};
      if (minPrice) match.price.$gte = Number(minPrice);
      if (maxPrice) match.price.$lte = Number(maxPrice);
    }

    // لو فيه فلتر لون
    const colorFilter = color
      ? color.split(",").map((c) => new RegExp(`^${c.trim()}$`, "i"))
      : null;

    const sortOption = buildSortOption(sort);

    const pipeline = [
      { $match: match },

      {
        $lookup: {
          from: "subcategories",
          localField: "subcategory",
          foreignField: "_id",
          as: "subcategory",
        },
      },
      { $unwind: { path: "$subcategory", preserveNullAndEmptyArrays: true } },

      {
        $facet: {
          // 👇 فرع المنتجات (يتأثر بفلتر اللون)
          products: [
            {
              $lookup: {
                from: "productvariants",
                let: { variantIds: "$variants" },
                pipeline: [
                  { $match: { $expr: { $in: ["$_id", "$$variantIds"] } } },
                  ...(colorFilter
                    ? [
                        {
                          $match: {
                            "color.name": { $in: colorFilter },
                          },
                        },
                      ]
                    : []),
                ],
                as: "variants",
              },
            },
            { $match: { "variants.0": { $exists: true } } },
            { $sort: sortOption },
            { $skip: (pageNum - 1) * limitNum },
            { $limit: limitNum },
            {
              $project: {
                title: 1,
                price: 1,
                rating: 1,
                numReviews: 1,
                subcategory: 1,
                category: 1,
                createdAt: 1,
                firstImage: {
                  $let: {
                    vars: {
                      selectedVariant: {
                        $first: {
                          $filter: {
                            input: "$variants",
                            as: "v",
                            cond: colorFilter
                              ? { $in: ["$$v.color.name", colorFilter] }
                              : true,
                          },
                        },
                      },
                    },
                    in: { $arrayElemAt: ["$$selectedVariant.images.url", 0] },
                  },
                },
                imagesOfColors: {
                  $map: {
                    input: "$variants",
                    as: "v",
                    in: { $arrayElemAt: ["$$v.images", 0] },
                  },
                },
              },
            },
          ],

          // 👇 فرع totalCount & priceStats (يتأثر بالمنتجات بعد فلترة اللون)
          totalCount: [
            {
              $lookup: {
                from: "productvariants",
                let: { variantIds: "$variants" },
                pipeline: [
                  { $match: { $expr: { $in: ["$_id", "$$variantIds"] } } },
                  ...(colorFilter
                    ? [
                        {
                          $match: {
                            "color.name": { $in: colorFilter },
                          },
                        },
                      ]
                    : []),
                ],
                as: "variants",
              },
            },
            { $match: { "variants.0": { $exists: true } } },
            { $count: "count" },
          ],
          // priceStats: [
          //   {
          //     $group: {
          //       _id: null,
          //       minPrice: { $min: "$price" },
          //       maxPrice: { $max: "$price" },
          //     },
          //   },
          // ],

          priceStats: [
            {
              $lookup: {
                from: "productvariants",
                let: { variantIds: "$variants" },
                pipeline: [
                  { $match: { $expr: { $in: ["$_id", "$$variantIds"] } } },
                  ...(colorFilter
                    ? [
                        {
                          $match: {
                            "color.name": { $in: colorFilter },
                          },
                        },
                      ]
                    : []),
                ],
                as: "variants",
              },
            },
            { $match: { "variants.0": { $exists: true } } },
            {
              $group: {
                _id: null,
                minPrice: { $min: "$price" },
                maxPrice: { $max: "$price" },
              },
            },
          ],

          colorCounts: [
            {
              $lookup: {
                from: "productvariants",
                let: { variantIds: "$variants" },
                pipeline: [
                  { $match: { $expr: { $in: ["$_id", "$$variantIds"] } } },
                ],
                as: "allVariants",
              },
            },
            { $unwind: "$allVariants" },
            {
              $group: {
                _id: { $toLower: "$allVariants.color.name" },
                name: { $first: "$allVariants.color.name" },
                count: { $sum: 1 },
              },
            },
            { $sort: { name: 1 } },
          ],
        },
      },
    ];

    const result = await Product.aggregate(pipeline);
    const data = result[0] || {
      products: [],
      totalCount: [],
      priceStats: [],
      colorCounts: [],
    };

    const total = data.totalCount[0]?.count || 0;
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      products: data.products,
      total,
      totalPages,
      priceStats: data.priceStats[0] || { minPrice: 0, maxPrice: 0 },
      currentPage: pageNum,
      limit: limitNum,
      colorCounts: data.colorCounts || [],
    });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id).populate("variants");
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  })
);

router.patch(
  "/:id",
  upload.array("variantImages", 30),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    let payload;
    try {
      payload = JSON.parse(req.body.payload);
    } catch {
      return res.status(400).json({ message: "Invalid payload format" });
    }

    // ✅ حدث بيانات المنتج الأساسية
    product.title = payload.title;
    product.description = payload.description;
    product.price = payload.price;
    product.category = payload.category;
    product.subcategory = payload.subcategory;

    // ✅ وزّع الصور الجديدة على الـ payload.variants
    const { files } = req;
    if (files && files.length > 0) {
      const variantIndexes = JSON.parse(req.body.variantIndexes || "[]");

      files.forEach((file, idx) => {
        const variantIndex = variantIndexes[idx];
        if (payload.variants[variantIndex]) {
          payload.variants[variantIndex].images.push({
            url: file.path, // أو Cloudinary secure_url
            filename: file.filename,
          });
        }
      });
    }

    // ✅ احفظ الـ variants في Collection منفصل
    const variantIds = await Promise.all(
      payload.variants.map(async (variant) => {
        if (variant._id) {
          // تحديث Variant قديم
          const updatedVariant = await ProductVariant.findByIdAndUpdate(
            variant._id,
            {
              color: variant.color,
              sizes: variant.sizes,
              images: variant.images,
              productId: product._id,
            },
            { new: true }
          );
          return updatedVariant._id;
        } else {
          // إنشاء Variant جديد
          const newVariant = await ProductVariant.create({
            color: variant.color,
            sizes: variant.sizes,
            images: variant.images,
            productId: product._id,
          });
          return newVariant._id;
        }
      })
    );

    // ✅ اربط المنتج بالـ variants IDs
    product.variants = variantIds;

    await product.save();

    res.json({ message: "Product updated successfully", product });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ message: "Product has been deleted successfully" });
  })
);

module.exports = router;
