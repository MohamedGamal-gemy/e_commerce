const express = require("express");
const asyncHandler = require("express-async-handler");
const cloudinary = require("../config/cloudinary");
const Subcategory = require("../models/subcategoryModel");
const ProductVariant = require("../models/variantsModel");

const Product = require("../models/productModel");
const { upload } = require("../middlewares/upload");
const redis = require("../config/redis");
const { facets, show, createProduct } = require("../controllers/products.controller");

const { default: mongoose } = require("mongoose");
const router = express.Router();
router.post("/", upload.array("variantImages", 30), asyncHandler(createProduct));

// router.post(
//   "/",
//   upload.array("variantImages", 30),
//   asyncHandler(async (req, res) => {
//     let payload;
//     try {
//       payload = JSON.parse(req.body.payload);
//     } catch {
//       return res.status(400).json({ message: "Invalid payload format" });
//     }

//     // ✅ أنشئ المنتج الأساسي
//     const product = new Product({
//       title: payload.title,
//       description: payload.description,
//       price: payload.price,
//       category: payload.category,
//       subcategory: payload.subcategory,
//     });

//     // ✅ اربط الصور بالـ variants
//     const { files } = req;
//     if (files && files.length > 0) {
//       const variantIndexes = JSON.parse(req.body.variantIndexes || "[]");

//       files.forEach((file, idx) => {
//         const variantIndex = variantIndexes[idx];
//         if (payload.variants[variantIndex]) {
//           payload.variants[variantIndex].images.push({
//             url: file.path, // أو secure_url من Cloudinary
//             filename: file.filename,
//           });
//         }
//       });
//     }

//     // ✅ خزّن الـ Variants في Collection منفصل
//     const variantIds = await Promise.all(
//       payload.variants.map(async (variant) => {
//         const newVariant = await ProductVariant.create({
//           color: variant.color,
//           sizes: variant.sizes,
//           images: variant.images,
//           productId: product._id,
//         });
//         return newVariant._id;
//       })
//     );

//     // ✅ اربط المنتج بالـ variants
//     product.variants = variantIds;
//     await product.save();

//     res.status(201).json({
//       message: "Product created successfully",
//       product,
//     });
//   })
// );
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
// 
router.get(
  "/admin/analytics",
  asyncHandler(async (req, res) => {
    const [stats] = await Product.aggregate([
      {
        $lookup: {
          from: "productvariants",
          localField: "variants",
          foreignField: "_id",
          as: "variants",
        },
      },
      {
        $addFields: {
          totalStock: {
            $sum: {
              $map: {
                input: "$variants",
                as: "variant",
                in: { $sum: "$$variant.sizes.stock" },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          averageRating: { $avg: "$rating" },
          totalStock: { $sum: "$totalStock" },
          lowStockProducts: {
            $sum: {
              $cond: [{ $lt: ["$totalStock", 5] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalProducts: 1,
          averageRating: { $round: ["$averageRating", 1] },
          totalStock: 1,
          lowStockProducts: 1,
        },
      },
    ]);

    res.json(stats || {
      totalProducts: 0,
      averageRating: 0,
      totalStock: 0,
      lowStockProducts: 0,
    });
  })
);

// 
router.get(
  "/admin",
  asyncHandler(async (req, res) => {
    const { subcategory, page = 1, limit = 10 } = req.query;

    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);
    const skip = (pageNumber - 1) * pageSize;

    const matchStage = {};

    if (subcategory) {
      matchStage["subcategory.name"] = subcategory;
    }

    const productsAgg = await Product.aggregate([
      {
        $lookup: {
          from: "productvariants",
          localField: "variants",
          foreignField: "_id",
          as: "variants",
        },
      },
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
        $addFields: {
          totalStock: {
            $sum: {
              $map: {
                input: "$variants",
                as: "variant",
                in: { $sum: "$$variant.sizes.stock" },
              },
            },
          },
          mainImage: {
            $arrayElemAt: [
              {
                $map: {
                  input: { $first: "$variants.images" },
                  as: "img",
                  in: "$$img.url",
                },
              },
              0,
            ],
          },
        },
      },

      // فلترة إذا كانت subcategory موجودة
      ...(subcategory ? [{ $match: matchStage }] : []),

      {
        $project: {
          title: 1,
          price: 1,
          rating: 1,
          totalStock: 1,
          mainImage: 1,
          subcategory: "$subcategory.name",
          createdAt: 1,
        },
      },

      { $sort: { createdAt: -1 } },

      // استخدام $facet لتجميع البيانات + العد الكلي
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: skip }, { $limit: pageSize }],
        },
      },
    ]);

    const products = productsAgg[0].data;
    const total = productsAgg[0].metadata[0]?.total || 0;

    res.json({
      products,
      total,
      page: pageNumber,
      pages: Math.ceil(total / pageSize),
    });
  })
);


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
// router.get(
//   "/show",
//   asyncHandler(async (req, res) => {
//     const {
//       color,
//       subcategory,
//       minPrice,
//       maxPrice,
//       search,
//       sort = "latest",
//       page = 1,
//       limit = 9,
//     } = req.query;

//     const colorsArray = color
//       ? color.split(",").map((c) => c.trim().toLowerCase())
//       : [];
//     const subcategoriesArray = subcategory
//       ? subcategory.split(",").map((s) => s.trim().toLowerCase())
//       : [];

//     const hasColorFilter = colorsArray.length > 0;
//     const hasSubcategoryFilter = subcategoriesArray.length > 0;
//     const skip = (parseInt(page) - 1) * parseInt(limit);

//     const priceMatch = {};
//     if (minPrice) priceMatch.$gte = parseFloat(minPrice);
//     if (maxPrice) priceMatch.$lte = parseFloat(maxPrice);
//     const hasPriceFilter = Object.keys(priceMatch).length > 0;

//     const getColorFilterStages = () => {
//       if (!hasColorFilter) return [];
//       return [
//         {
//           $lookup: {
//             from: "productvariants",
//             localField: "variants",
//             foreignField: "_id",
//             as: "matchedVariants",
//             pipeline: [
//               { $addFields: { colorLower: { $toLower: "$color.name" } } },
//               { $match: { colorLower: { $in: colorsArray } } },
//             ],
//           },
//         },
//         { $match: { matchedVariants: { $ne: [] } } },
//       ];
//     };

//     const getTitleFilterStage = () => {
//       if (!search) return [];
//       return [{ $match: { title: { $regex: search, $options: "i" } } }];
//     };

//     const getPriceFilterStage = () => {
//       if (!hasPriceFilter) return [];
//       return [{ $match: { price: priceMatch } }];
//     };

//     const getSubcategoryFilterStages = () => {
//       return [
//         {
//           $lookup: {
//             from: "subcategories",
//             localField: "subcategory",
//             foreignField: "_id",
//             as: "subcategory",
//           },
//         },
//         { $unwind: "$subcategory" },
//         ...(hasSubcategoryFilter
//           ? [
//               {
//                 $match: {
//                   $expr: {
//                     $in: [
//                       { $toLower: "$subcategory.name" },
//                       subcategoriesArray,
//                     ],
//                   },
//                 },
//               },
//             ]
//           : []),
//       ];
//     };

//     const sortStage = (() => {
//       switch (sort) {
//         case "price_asc":
//           return { price: 1 };
//         case "price_desc":
//           return { price: -1 };
//         case "top_rated":
//           return { rating: -1 };
//         default:
//           return { createdAt: -1 };
//       }
//     })();

//     const filteringPipeline = [
//       // 1. الفلاتر الأساسية (الأسرع)
//       ...getTitleFilterStage(),
//       ...getPriceFilterStage(), // 2. فلترة الألوان (تعتمد على lookup)
//       ...getColorFilterStages(), // 3. فلترة الفئات الفرعية (تعتمد على lookup)
//       ...getSubcategoryFilterStages(),
//     ]; // -------------------- // 4. حساب العدد الإجمالي (Total Count) // --------------------

//     const totalCount = await Product.aggregate([
//       ...filteringPipeline, // نستخدم كل مراحل الفلترة المشتركة
//       { $count: "total" },
//     ]);
//     const totalProducts = totalCount[0]?.total || 0; // -------------------- // 5. بناء بايبلاين النتائج النهائية (مع العرض والترتيب والترقيم) // --------------------

//     const finalPipeline = [
//       ...filteringPipeline, // مراحل الفلترة // ربط الـ variants (لإظهارها في النتيجة)

//       {
//         $lookup: {
//           from: "productvariants",
//           localField: "variants",
//           foreignField: "_id",
//           as: "variants",
//         },
//       }, // فلترة الـvariants نفسها لو فيه لون محدد (لتنسيق الإخراج فقط)

//       {
//         $addFields: {
//           variants: {
//             $cond: {
//               if: hasColorFilter,
//               then: {
//                 $filter: {
//                   input: "$variants",
//                   as: "v",
//                   cond: { $in: [{ $toLower: "$$v.color.name" }, colorsArray] },
//                 },
//               },
//               else: "$variants",
//             },
//           },
//         },
//       }, // تنسيق المخرجات النهائية (Project)

//       {
//         $project: {
//           _id: 1,
//           title: 1,
//           price: 1,
//           rating: 1,
//           subcategory: "$subcategory.name",
//           variants: {
//             $map: {
//               input: "$variants",
//               as: "v",
//               in: {
//                 _id: "$$v._id",
//                 color: { $toLower: "$$v.color.name" },
//                 mainImage: { $arrayElemAt: ["$$v.images.url", 0] },
//                 secondImage: { $arrayElemAt: ["$$v.images.url", 1] },
//               },
//             },
//           },
//         },
//       }, // الترتيب والترقيم

//       { $sort: sortStage },
//       { $skip: skip },
//       { $limit: parseInt(limit) },
//     ]; // تنفيذ البايبلاين للحصول على المنتجات

//     const products = await Product.aggregate(finalPipeline);

//     res.json({
//       products,
//       pagination: {
//         total: totalProducts,
//         page: parseInt(page),
//         limit: parseInt(limit),
//         totalPages: Math.ceil(totalProducts / parseInt(limit)),
//       },
//     });
//   })
// );
// #######################################################
// admin

// ####################################
router.get("/facets", facets);
router.get("/show", show);

// ####################################

router.get(
  "/admin/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const product = await Product.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },

      // ربط الـ variants
      {
        $lookup: {
          from: "productvariants",
          localField: "variants",
          foreignField: "_id",
          as: "variants",
        },
      },

      {
        $lookup: {
          from: "subcategories",
          localField: "subcategory",
          foreignField: "_id",
          as: "subcategory",
        },
      },

      // Unwind arrays
      { $unwind: { path: "$subcategory", preserveNullAndEmptyArrays: true } },

      // حساب totalStock
      {
        $addFields: {
          totalStock: {
            $sum: {
              $map: {
                input: "$variants",
                as: "variant",
                in: {
                  $sum: "$$variant.sizes.stock",
                },
              },
            },
          },
        },
      },

      // تحديد الحقول النهائية
      {
        $project: {
          title: 1,
          description: 1,
          price: 1,
          discount: 1,
          rating: 1,
          totalStock: 1,
          subcategory: "$subcategory.name",
          variants: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    if (!product.length)
      return res.status(404).json({ message: "Product not found" });

    res.json({ product: product[0] });
  })
);

// 
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

// router.delete(
//   "/:id",
//   asyncHandler(async (req, res) => {
//     const { id } = req.params;
//     const deletedProduct = await Product.findByIdAndDelete(id);

//     if (!deletedProduct) {
//       return res.status(404).json({ message: "Product not found" });
//     }

//     res.json({ message: "Product has been deleted successfully" });
//   })
// );
// admin
router.delete(
  "/admin/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      res.status(404);
      throw new Error("Product not found ❌");
    }

    await product.deleteOne();

    res.status(200).json({
      message: "Product deleted successfully ✅",
      deletedId: id,
    });
  })
);

module.exports = router;
