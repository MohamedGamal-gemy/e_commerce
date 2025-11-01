// // 📁 controllers/products/pipeline/buildProductPipeline.js

// function buildProductPipeline({
//     colorsArray = [],
//     subcategoriesArray = [],
//     search,
//     priceMatch,
// }) {
//     const pipeline = [];

//     // 🟢 البحث بالنص
//     if (search) {
//         pipeline.push({
//             $match: { title: { $regex: search, $options: "i" } },
//         });
//     }

//     // 🟢 فلترة السعر
//     if (Object.keys(priceMatch).length > 0) {
//         pipeline.push({ $match: { price: priceMatch } });
//     }

//     // 🟢 جلب الفئة الفرعية
//     pipeline.push({
//         $lookup: {
//             from: "subcategories",
//             localField: "subcategory",
//             foreignField: "_id",
//             as: "subcategory",
//         },
//     });

//     pipeline.push({
//         $unwind: {
//             path: "$subcategory",
//             preserveNullAndEmptyArrays: true,
//         },
//     });

//     // 🟢 فلترة الفئة الفرعية بالاسم
//     if (subcategoriesArray.length > 0) {
//         pipeline.push({
//             $match: {
//                 $expr: {
//                     $in: [{ $toLower: "$subcategory.name" }, subcategoriesArray],
//                 },
//             },
//         });
//     }

//     // 🟢 جلب الـ variants (ألوان)
//     pipeline.push({
//         $lookup: {
//             from: "productvariants",
//             localField: "_id",        // ✅ العلاقة الصحيحة
//             foreignField: "productId", // ✅ المفتاح في الـ variant
//             as: "variants",
//         },
//     });

//     // 🟢 فلترة الألوان (إن وجدت)
//     if (colorsArray.length > 0) {
//         pipeline.push({
//             $addFields: {
//                 variants: {
//                     $filter: {
//                         input: "$variants",
//                         as: "v",
//                         cond: {
//                             $in: [{ $toLower: "$$v.color.name" }, colorsArray],
//                         },
//                     },
//                 },
//             },
//         });
//     }

//     // 🟢 تنسيق الـ variants (صور + اللون)
//     pipeline.push({
//         $addFields: {
//             variants: {
//                 $map: {
//                     input: "$variants",
//                     as: "v",
//                     in: {
//                         _id: "$$v._id",
//                         color: { $toLower: "$$v.color.name" },
//                         mainImage: { $arrayElemAt: ["$$v.images.url", 0] },
//                         secondImage: { $arrayElemAt: ["$$v.images.url", 1] },
//                     },
//                 },
//             },
//         },
//     });

//     // 🟢 استبعاد المنتجات اللي مالهاش variants لو فيه فلترة ألوان
//     if (colorsArray.length > 0) {
//         pipeline.push({
//             $match: {
//                 variants: { $ne: [] },
//             },
//         });
//     }

//     // 🟢 المخرجات النهائية (Projection)
//     pipeline.push({
//         $project: {
//             _id: 1,
//             title: 1,
//             price: 1,
//             rating: 1,
//             subcategory: "$subcategory.name",
//             variants: 1,
//         },
//     });

//     return pipeline;
// }

// module.exports = { buildProductPipeline };


// 📁 controllers/products/pipeline/buildProductPipeline.js
function buildProductPipeline({
    colorsArray = [],
    subcategoriesArray = [],
    search,
    priceMatch,
}) {
    const pipeline = [];

    // 🟢 البحث بالنص
    if (search) {
        pipeline.push({
            $match: { title: { $regex: search, $options: "i" } },
        });
    }

    // 🟢 فلترة السعر
    if (Object.keys(priceMatch).length > 0) {
        pipeline.push({ $match: { price: priceMatch } });
    }

    // 🟢 جلب الفئة الفرعية
    pipeline.push({
        $lookup: {
            from: "subcategories",
            localField: "subcategory",
            foreignField: "_id",
            as: "subcategory",
        },
    });

    pipeline.push({
        $unwind: { path: "$subcategory", preserveNullAndEmptyArrays: true },
    });

    // 🟢 فلترة الفئة الفرعية
    if (subcategoriesArray.length > 0) {
        pipeline.push({
            $match: {
                $expr: {
                    $in: [{ $toLower: "$subcategory.name" }, subcategoriesArray],
                },
            },
        });
    }

    // 🟢 جلب الـ variants بدون تكرار
    pipeline.push({
        $lookup: {
            from: "productvariants",
            let: { productId: "$_id" },
            pipeline: [
                { $match: { $expr: { $eq: ["$productId", "$$productId"] } } },
                {
                    $group: {
                        _id: { color: { $toLower: "$color.name" } },
                        variant: { $first: "$$ROOT" },
                    },
                },
                {
                    $replaceRoot: { newRoot: "$variant" },
                },
            ],
            as: "variants",
        },
    });

    // 🟢 فلترة الألوان (إن وجدت)
    if (colorsArray.length > 0) {
        pipeline.push({
            $addFields: {
                variants: {
                    $filter: {
                        input: "$variants",
                        as: "v",
                        cond: { $in: [{ $toLower: "$$v.color.name" }, colorsArray] },
                    },
                },
            },
        });
    }

    // 🟢 جلب أول صورتين فقط لكل variant
    pipeline.push({
        $addFields: {
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
    });

    // 🟢 لو في فلترة بالألوان، نستبعد المنتجات اللي variants فاضية
    if (colorsArray.length > 0) {
        pipeline.push({
            $match: {
                variants: { $ne: [] },
            },
        });
    }

    // 🟢 إخراج الحقول المطلوبة فقط
    pipeline.push({
        $project: {
            _id: 1,
            title: 1,
            price: 1,
            rating: 1,
            subcategory: "$subcategory.name",
            variants: 1,
        },
    });

    return pipeline;
}

module.exports = { buildProductPipeline };
