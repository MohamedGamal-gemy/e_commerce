
// 💡 الدالة المساعدة لتحديد الحقول الأساسية المطلوبة بالإدراج (Inclusion)
function getProjectionFields() {
    return {
        _id: 1,
        title: 1,
        slug: 1,
        price: 1,
        originalPrice: 1,
        discountIsActive: 1,
        discountValue: 1,
        discountType: 1,
        rating: 1,
        numReviews: 1,
        mainImage: 1, 
    };
}


function buildProductPipeline({
    colorsArray = [],
    subcategoriesArray = [],
    search,
    priceMatch,
}) {
    const initialMatch = {
        status: "active",
    };

    const pipeline = [];

    // 1. فلترة الفئة الفرعية (Subcategory)
    if (subcategoriesArray.length > 0) {
        initialMatch.subcategory = { $in: subcategoriesArray };
    }
    
    // 2. فلترة السعر
    if (Object.keys(priceMatch).length > 0) {
        initialMatch.price = priceMatch;
    }
    
    // 3. فلترة الألوان - سيتم التعامل معها بعد lookup على variants
    // Note: colorNames field removed - filtering will be done via variant lookup

    // 4. البحث بالنص (Search)
    if (search) {
        initialMatch.$text = { $search: search };
        pipeline.push({ $match: initialMatch });
        // المرحلة الأولى: لتمكين الـ Score والحقول الأساسية
        pipeline.push({ $project: { score: { $meta: "textScore" }, ...getProjectionFields() } });
        pipeline.push({ $sort: { score: -1 } });
    } else {
        pipeline.push({ $match: initialMatch });
    }

    // 5. جلب معلومات الـ Variants (الألوان والصور)
    pipeline.push({
        $lookup: {
            from: "productvariants",
            localField: "_id",
            foreignField: "productId",
            as: "availableColors",
            pipeline: [
                {
                    $project: {
                        _id: 1,
                        isDefault: 1,
                        color: 1,
                        mainImageUrl: { $arrayElemAt: ["$images.url", 0] },
                        secondImageUrl: { $arrayElemAt: ["$images.url", 1] },
                    },
                },
                { $sort: { isDefault: -1 } } 
            ],
        },
    });

    // 5.5. فلترة الألوان بعد lookup (إذا كانت موجودة)
    // Note: colorNames field removed - filtering is done via variant lookup
    if (colorsArray.length > 0) {
        pipeline.push({
            $match: {
                "availableColors": {
                    $elemMatch: {
                        "color.name": {
                            $regex: colorsArray.join("|"),
                            $options: "i"
                        }
                    }
                }
            }
        });
    }

    // 6. فك بيانات الصور الرئيسية للمنتج من الـ Variant الافتراضي
    pipeline.push({
        $addFields: {
            mainImageUrl: { $arrayElemAt: ["$availableColors.mainImageUrl", 0] },
            secondImageUrl: { $arrayElemAt: ["$availableColors.secondImageUrl", 0] },
        }
    });

    // 7. مرحلة الإسقاط والتوحيد النهائي (باستخدام الإدراج فقط)
    
    // نجمع جميع الحقول المطلوبة النهائية
    const finalProjection = {
        ...getProjectionFields(),
        mainImageUrl: 1,    
        secondImageUrl: 1,
        availableColors: 1, 
    };

    if (search) {
        finalProjection.score = 1;
    }

    pipeline.push({ $project: finalProjection });

    // 8. تنظيف خاص للبحث النصي: إزالة Score إذا تم إدراجه في الخطوة 7
    if (search) {
        pipeline.push({ $project: { score: 0 } });
    }

    return pipeline;
}

module.exports = { buildProductPipeline };