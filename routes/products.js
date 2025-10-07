const express = require("express");
const asyncHandler = require("express-async-handler");
const cloudinary = require("../config/cloudinary");
const Subcategory = require("../models/subcategoryModel");
const ProductVariant = require("../models/variantsModel");

// const {
//   Product,
//   validateProduct,
//   validateProductUpdate,
// } = require("../models/productModel");
const Product = require("../models/productModel");
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
//   "/show",
//   asyncHandler(async (req, res) => {
//     const { limit = 20, subcategory, color } = req.query;

//     const colorsArray = color
//       ? color.split(",").map((c) => c.toLowerCase())
//       : null;
//     const subcategoriesArray = subcategory ? subcategory.split(",") : null;

//     const match = {};
//     // if (subcategory) {
//     //   // match["subcategory"] = { $in: subcategory.split(",") };
//     //   match["subcategory.name"] = { $in: subcategory.split(",") };
//     // }

//     const result = await Product.aggregate([
//       {
//         $lookup: {
//           from: "subcategories",
//           localField: "subcategory",
//           foreignField: "_id",
//           as: "subcategory",
//         },
//       },
//       { $unwind: "$subcategory" },
//       {
//         $lookup: {
//           from: "productvariants",
//           localField: "variants",
//           foreignField: "_id",
//           as: "variants",
//         },
//       },

//       // 🟢 طبّق الماتش بتاع الـ subcategory هنا
//       // { $match: match },
//       // { $match: match },
//       {
//         $facet: {
//           products: [
//             ...(colorsArray
//               ? [
//                   {
//                     $set: {
//                       variants: {
//                         $filter: {
//                           input: "$variants",
//                           as: "v",
//                           cond: {
//                             $in: [{ $toLower: "$$v.color.name" }, colorsArray],
//                           },
//                         },
//                       },
//                     },
//                   },
//                   { $match: { variants: { $ne: [] } } },
//                 ]
//               : []),
//             //
//             ...(subcategoriesArray
//               ? [
//                   {
//                     $set: {
//                       subcategory: {
//                         $cond: {
//                           if: {
//                             $in: ["$subcategory.name", subcategoriesArray],
//                           },
//                           then: "$subcategory",
//                           else: null,
//                         },
//                       },
//                     },
//                   },
//                   { $match: { subcategory: { $ne: null } } },
//                 ]
//               : []),

//             {
//               $project: {
//                 title: 1,
//                 price: 1,
//                 rating: 1,
//                 subcategory: "$subcategory.name",
//                 variants: {
//                   $map: {
//                     input: "$variants",
//                     as: "v",
//                     in: {
//                       _id: "$$v._id",
//                       color: {
//                         name: { $toLower: "$$v.color.name" },
//                         value: "$$v.color.value",
//                       },
//                       firstImage: { $arrayElemAt: ["$$v.images.url", 0] },
//                     },
//                   },
//                 },
//               },
//             },
//             // { $match: match },
//             { $limit: Number(limit) },
//           ],

//           colors: [
//             { $unwind: "$variants" },

//             {
//               $group: {
//                 _id: { $toLower: "$variants.color.name" },
//                 value: { $first: "$variants.color.value" },
//                 counter: { $sum: 1 }, // 🟢 هيعد بناءً على الفلترة
//               },
//             },
//             {
//               $project: {
//                 _id: 0,
//                 name: "$_id",
//                 value: 1,
//                 counter: 1,
//               },
//             },
//             // { $match: { name: "black" } },
//             // { $match: match },
//           ],

//           subcategories: [
//             {
//               $group: {
//                 _id: "$subcategory.name",
//                 counter: { $sum: 1 }, // 🟢 هيعد عدد المنتجات في كل subcategory
//               },
//             },
//             {
//               $project: {
//                 _id: 0,
//                 name: "$_id",
//                 counter: 1,
//               },
//             },
//           ],
//         },
//       },
//     ]);

//     res.json({
//       products: result[0].products,
//       colors: result[0].colors,
//       subcategories: result[0].subcategories,
//     });
//   })
// );

// #######################################################
// router.get(
//   "/show",
//   asyncHandler(async (req, res) => {
//     const { color, subcategory } = req.query;

//     const colorsArray = color
//       ? color.split(",").map((c) => c.trim().toLowerCase())
//       : [];

//     const subcategoriesArray = subcategory
//       ? subcategory.split(",").map((s) => s.trim().toLowerCase())
//       : [];

//     const hasColorFilter = colorsArray.length > 0;
//     const hasSubcategoryFilter = subcategoriesArray.length > 0;

//     const subcategoryNameMatchStage = hasSubcategoryFilter
//       ? [
//           {
//             $match: {
//               $expr: {
//                 $in: [{ $toLower: "$subcategory.name" }, subcategoriesArray],
//               },
//             },
//           },
//         ]
//       : [];

//     const pipeline = [
//       ...(hasColorFilter
//         ? [
//             {
//               $lookup: {
//                 from: "productvariants",
//                 localField: "variants",
//                 foreignField: "_id",
//                 as: "matchedVariants",
//                 pipeline: [
//                   {
//                     $match: {
//                       $expr: {
//                         $in: [{ $toLower: "$color.name" }, colorsArray],
//                       },
//                     },
//                   },
//                 ],
//               },
//             },
//             { $match: { matchedVariants: { $ne: [] } } },
//             { $unset: "matchedVariants" },
//           ]
//         : []),

//       {
//         $lookup: {
//           from: "subcategories",
//           localField: "subcategory",
//           foreignField: "_id",
//           as: "subcategory",
//         },
//       },

//       {
//         $unwind: {
//           path: "$subcategory",
//           // preserveNullAndEmptyArrays: true
//         },
//       },

//       ...subcategoryNameMatchStage,

//       {
//         $lookup: {
//           from: "productvariants",
//           localField: "variants",
//           foreignField: "_id",
//           as: "variants",
//         },
//       },

//       {
//         $project: {
//           _id: 1,
//           title: 1,
//           price: 1,
//           rating: 1,
//           subcategory: "$subcategory.name",

//           variants: {
//             $cond: {
//               if: hasColorFilter,
//               then: {
//                 $filter: {
//                   input: "$variants",
//                   as: "v",
//                   cond: {
//                     $in: [{ $toLower: "$$v.color.name" }, colorsArray],
//                   },
//                 },
//               },
//               else: "$variants",
//             },
//           },
//         },
//       },

//       {
//         $project: {
//           _id: 1,
//           title: 1,
//           price: 1,
//           rating: 1,
//           subcategory: 1,

//           variants: {
//             $map: {
//               input: "$variants",
//               as: "v",
//               in: {
//                 _id: "$$v._id",
//                 color: { $toLower: "$$v.color.name" },
//                 mainImage: {
//                   $arrayElemAt: ["$$v.images.url", 0],
//                 },
//               },
//             },
//           },
//         },
//       },
//     ];

//     const products = await Product.aggregate(pipeline);
//     res.json(products);
//   })
// );

router.get(
  "/show",
  asyncHandler(async (req, res) => {
    const {
      color,
      subcategory,
      minPrice,
      maxPrice,
      sort = "latest",
      page = 1,
      limit = 9,
    } = req.query;

    // تحويل القيم من query string
    const colorsArray = color
      ? color.split(",").map((c) => c.trim().toLowerCase())
      : [];

    const subcategoriesArray = subcategory
      ? subcategory.split(",").map((s) => s.trim().toLowerCase())
      : [];

    const hasColorFilter = colorsArray.length > 0;
    const hasSubcategoryFilter = subcategoriesArray.length > 0;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // فلترة حسب اسم الـ subcategory
    const subcategoryNameMatchStage = hasSubcategoryFilter
      ? [
          {
            $match: {
              $expr: {
                $in: [{ $toLower: "$subcategory.name" }, subcategoriesArray],
              },
            },
          },
        ]
      : [];

    // تحديد نوع الترتيب
    const sortStage = (() => {
      switch (sort) {
        case "price_asc":
          return { price: 1 };
        case "price_desc":
          return { price: -1 };
        case "top_rated":
          return { rating: -1 };
        default:
          return { createdAt: -1 };
      }
    })();

    const pipeline = [
      ...(hasColorFilter
        ? [
            {
              $lookup: {
                from: "productvariants",
                localField: "variants",
                foreignField: "_id",
                as: "matchedVariants",
                pipeline: [
                  {
                    $addFields: {
                      colorLower: { $toLower: "$color.name" },
                    },
                  },
                  {
                    $match: {
                      colorLower: { $in: colorsArray },
                    },
                  },
                ],
              },
            },
            {
              $match: {
                matchedVariants: { $ne: [] },
              },
            },
          ]
        : []),

      ...(minPrice || maxPrice
        ? [
            {
              $match: {
                ...(minPrice && { price: { $gte: parseFloat(minPrice) } }),
                ...(maxPrice && { price: { $lte: parseFloat(maxPrice) } }),
              },
            },
          ]
        : []),

      // 🟢 ربط الـ subcategory
      {
        $lookup: {
          from: "subcategories",
          localField: "subcategory",
          foreignField: "_id",
          as: "subcategory",
        },
      },
      { $unwind: "$subcategory" },
      ...subcategoryNameMatchStage,

      // 🟢 ربط الـ variants
      {
        $lookup: {
          from: "productvariants",
          localField: "variants",
          foreignField: "_id",
          as: "variants",
        },
      },

      // 🟢 فلترة الـvariants نفسها لو فيه لون محدد
      {
        $addFields: {
          variants: {
            $cond: {
              if: hasColorFilter,
              then: {
                $filter: {
                  input: "$variants",
                  as: "v",
                  cond: {
                    $in: [{ $toLower: "$$v.color.name" }, colorsArray],
                  },
                },
              },
              else: "$variants",
            },
          },
        },
      },

      // 🟢 تنسيق المخرجات النهائية
      {
        $project: {
          _id: 1,
          title: 1,
          price: 1,
          rating: 1,
          subcategory: "$subcategory.name",
          variants: {
            $map: {
              input: "$variants",
              as: "v",
              in: {
                _id: "$$v._id",
                color: { $toLower: "$$v.color.name" },
                mainImage: { $arrayElemAt: ["$$v.images.url", 0] },
              },
            },
          },
        },
      },

      // 🟢 الترتيب
      { $sort: sortStage },

      // 🟢 Pagination
      { $skip: skip },
      { $limit: parseInt(limit) },
    ];

    // تنفيذ البايبلاين
    const products = await Product.aggregate(pipeline);

    // 🟢 حساب الإجمالي بدون pagination
    const totalCountPipeline = pipeline.filter(
      (stage) =>
        !(
          "$skip" in stage ||
          "$limit" in stage ||
          "$sort" in stage ||
          "$project" in stage
        )
    );

    const totalCount = await Product.aggregate([
      ...totalCountPipeline,
      { $count: "total" },
    ]);

    res.json({
      products,
      pagination: {
        total: totalCount[0]?.total || 0,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil((totalCount[0]?.total || 0) / parseInt(limit)),
      },
    });
  })
);

// #######################################################

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
