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
router.get(
  "/subcategories",
  asyncHandler(async (req, res) => {
    const aggregationPipeline = [
      {
        $sort: { _id: 1 },
      },

      {
        $group: {
          _id: "$subcategory",
          products: {
            $push: {
              _id: "$_id",
              title: "$title",
              slug: "$slug",
              variants: "$variants",
            },
          },
        },
      },

      {
        $project: {
          _id: 0,
          subcategoryId: "$_id",
          secondProduct: {
            $arrayElemAt: ["$products", 1],
          },
        },
      },

      {
        $match: {
          secondProduct: { $ne: null },
        },
      },

      {
        $lookup: {
          from: "subcategories",
          localField: "subcategoryId",
          foreignField: "_id",
          as: "subcategoryDetails",
        },
      },

      {
        $unwind: "$subcategoryDetails",
      },

      {
        $lookup: {
          from: "productvariants",
          localField: "secondProduct.variants.0",
          foreignField: "_id",
          as: "variantDetails",
        },
      },

      {
        $unwind: {
          path: "$variantDetails",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          subcategory: "$subcategoryDetails.name",
          title: "$secondProduct.title",
          slug: "$secondProduct.slug",
          firstImageUrl: {
            $arrayElemAt: ["$variantDetails.images.url", 0],
          },
        },
      },
    ];

    const results = await Product.aggregate(aggregationPipeline);

    res.status(200).json({
      status: "success",
      count: results.length,
      data: results,
    });
  })
);
router.get(
  "/show",
  asyncHandler(async (req, res) => {
    const {
      color,
      subcategory,
      minPrice,
      maxPrice,
      search,
      sort = "latest",
      page = 1,
      limit = 9,
    } = req.query;

    const colorsArray = color
      ? color.split(",").map((c) => c.trim().toLowerCase())
      : [];
    const subcategoriesArray = subcategory
      ? subcategory.split(",").map((s) => s.trim().toLowerCase())
      : [];

    const hasColorFilter = colorsArray.length > 0;
    const hasSubcategoryFilter = subcategoriesArray.length > 0;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const priceMatch = {};
    if (minPrice) priceMatch.$gte = parseFloat(minPrice);
    if (maxPrice) priceMatch.$lte = parseFloat(maxPrice);
    const hasPriceFilter = Object.keys(priceMatch).length > 0;

    const getColorFilterStages = () => {
      if (!hasColorFilter) return [];
      return [
        {
          $lookup: {
            from: "productvariants",
            localField: "variants",
            foreignField: "_id",
            as: "matchedVariants",
            pipeline: [
              { $addFields: { colorLower: { $toLower: "$color.name" } } },
              { $match: { colorLower: { $in: colorsArray } } },
            ],
          },
        },
        { $match: { matchedVariants: { $ne: [] } } },
      ];
    };

    const getTitleFilterStage = () => {
      if (!search) return [];
      return [{ $match: { title: { $regex: search, $options: "i" } } }];
    };

    const getPriceFilterStage = () => {
      if (!hasPriceFilter) return [];
      return [{ $match: { price: priceMatch } }];
    };

    const getSubcategoryFilterStages = () => {
      return [
        {
          $lookup: {
            from: "subcategories",
            localField: "subcategory",
            foreignField: "_id",
            as: "subcategory",
          },
        },
        { $unwind: "$subcategory" },
        ...(hasSubcategoryFilter
          ? [
              {
                $match: {
                  $expr: {
                    $in: [
                      { $toLower: "$subcategory.name" },
                      subcategoriesArray,
                    ],
                  },
                },
              },
            ]
          : []),
      ];
    };

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

    const filteringPipeline = [
      // 1. الفلاتر الأساسية (الأسرع)
      ...getTitleFilterStage(),
      ...getPriceFilterStage(), // 2. فلترة الألوان (تعتمد على lookup)
      ...getColorFilterStages(), // 3. فلترة الفئات الفرعية (تعتمد على lookup)
      ...getSubcategoryFilterStages(),
    ]; // -------------------- // 4. حساب العدد الإجمالي (Total Count) // --------------------

    const totalCount = await Product.aggregate([
      ...filteringPipeline, // نستخدم كل مراحل الفلترة المشتركة
      { $count: "total" },
    ]);
    const totalProducts = totalCount[0]?.total || 0; // -------------------- // 5. بناء بايبلاين النتائج النهائية (مع العرض والترتيب والترقيم) // --------------------

    const finalPipeline = [
      ...filteringPipeline, // مراحل الفلترة // ربط الـ variants (لإظهارها في النتيجة)

      {
        $lookup: {
          from: "productvariants",
          localField: "variants",
          foreignField: "_id",
          as: "variants",
        },
      }, // فلترة الـvariants نفسها لو فيه لون محدد (لتنسيق الإخراج فقط)

      {
        $addFields: {
          variants: {
            $cond: {
              if: hasColorFilter,
              then: {
                $filter: {
                  input: "$variants",
                  as: "v",
                  cond: { $in: [{ $toLower: "$$v.color.name" }, colorsArray] },
                },
              },
              else: "$variants",
            },
          },
        },
      }, // تنسيق المخرجات النهائية (Project)

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
                secondImage: { $arrayElemAt: ["$$v.images.url", 1] },
              },
            },
          },
        },
      }, // الترتيب والترقيم

      { $sort: sortStage },
      { $skip: skip },
      { $limit: parseInt(limit) },
    ]; // تنفيذ البايبلاين للحصول على المنتجات

    const products = await Product.aggregate(finalPipeline);

    res.json({
      products,
      pagination: {
        total: totalProducts,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalProducts / parseInt(limit)),
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
