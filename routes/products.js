const express = require("express");
const router = express.Router();
const Product = require("../models/product");
const upload = require("../middlewares/uploadImages");
const {
  createProduct,
  updateProduct,
  getVariantByColor,
  processProductController,
  deleteProduct,
  deleteMultipleProducts,
  getProductInfo,
} = require("../controllers/products.controller");
const {
  getProductsAggregationHandler,
} = require("../handlers/productsAggregationHandler");

// router.post("/", upload.any(), createProduct);
router.post("/", upload.any(), processProductController);
router.patch("/:id", upload.any(), processProductController);
// router.delete("/:id", deleteMultipleProducts);
router.delete(
  "/bulk-delete",
  // protect,
  // allowedTo("admin"),
  deleteMultipleProducts
);

router.delete(
  "/:id",
  // protect,
  // allowedTo("admin"),
  deleteProduct
);
//
// router.get("/analytics", async (req, res) => {
//   try {
//     const products = await Product.find().select(
//       "price totalStock isAvailable numVariants productTypeName colors rating numReviews"
//     );

//     // =====================
//     // KPIs
//     // =====================
//     const totalProducts = products.length;

//     let active = 0;
//     let inactive = 0;
//     let outOfStock = 0;
//     let lowStock = 0;

//     let minPrice = Infinity;
//     let maxPrice = 0;
//     let totalPrice = 0;

//     let totalVariants = 0;

//     // Maps
//     const productsByType = new Map();
//     const colorsUsage = new Map();

//     products.forEach((p) => {
//       // availability
//       p.isAvailable ? active++ : inactive++;

//       // stock
//       if (p.totalStock === 0) outOfStock++;
//       if (p.totalStock > 0 && p.totalStock <= 15) lowStock++;

//       // price
//       if (typeof p.price === "number") {
//         minPrice = Math.min(minPrice, p.price);
//         maxPrice = Math.max(maxPrice, p.price);
//         totalPrice += p.price;
//       }

//       // variants
//       totalVariants += p.numVariants || 0;

//       // product types
//       const typeKey = p.productTypeName || "Unknown";
//       productsByType.set(typeKey, (productsByType.get(typeKey) || 0) + 1);

//       // colors usage
//       p.colors.forEach((c) => {
//         const key = c.name.toLowerCase();
//         colorsUsage.set(key, (colorsUsage.get(key) || 0) + 1);
//       });
//     });

//     if (minPrice === Infinity) minPrice = 0;

//     // =====================
//     // Formatting
//     // =====================
//     const productsByTypeArr = Array.from(productsByType.entries()).map(
//       ([type, count]) => ({ type, count })
//     );

//     const colorsUsageArr = Array.from(colorsUsage.entries()).map(
//       ([color, count]) => ({ color, count })
//     );

//     res.json({
//       kpis: {
//         totalProducts,
//         active,
//         inactive,
//         outOfStock,
//         lowStock,
//         avgPrice: totalProducts
//           ? Number((totalPrice / totalProducts).toFixed(2))
//           : 0,
//         minPrice,
//         maxPrice,
//         totalVariants,
//       },

//       breakdown: {
//         productsByType: productsByTypeArr,
//         colorsUsage: colorsUsageArr,
//       },
//     });
//   } catch (error) {
//     console.error("Error fetching analytics:", error);
//     res.status(500).json({ error: "Failed to fetch analytics" });
//   }
// });

router.get("/analytics", async (req, res) => {
  try {
    const products = await Product.find().select(
      "price totalStock isAvailable numVariants productTypeName colors title slug"
    );

    const LOW_STOCK_THRESHOLD = 5; // حد التنبيه للمقاس الواحد

    let kpis = {
      totalProducts: products.length,
      active: 0,
      inactive: 0,
      outOfStockProducts: 0, // منتجات مخلصة تماماً
      lowStockVariantsCount: 0, // عدد المقاسات/الألوان التي قاربت على الانتهاء
      totalPrice: 0,
      totalVariants: 0,
      minPrice: Infinity,
      maxPrice: 0,
    };

    const productsByType = new Map();
    // مصفوفة لتخزين أهم 10 نواقص لإظهارها في الـ Dashboard
    const urgentRestockAlerts = [];

    products.forEach((p) => {
      p.isAvailable ? kpis.active++ : kpis.inactive++;
      kpis.totalVariants += p.numVariants || 0;

      // حساب الأسعار
      if (typeof p.price === "number") {
        kpis.minPrice = Math.min(kpis.minPrice, p.price);
        kpis.maxPrice = Math.max(kpis.maxPrice, p.price);
        kpis.totalPrice += p.price;
      }

      // --- الفحص الذكي للمخزون (Smart Inventory Scan) ---
      let hasIssue = false;
      p.colors.forEach((color) => {
        color.sizes.forEach((size) => {
          if (size.stock < LOW_STOCK_THRESHOLD) {
            kpis.lowStockVariantsCount++;
            hasIssue = true;

            // إضافة تنبيه عاجل إذا كان المقاس 0
            if (size.stock === 0 && urgentRestockAlerts.length < 10) {
              urgentRestockAlerts.push({
                productName: p.title,
                color: color.name,
                size: size.size,
                slug: p.slug,
              });
            }
          }
        });
      });

      if (p.totalStock === 0) kpis.outOfStockProducts++;

      // تصنيف الأنواع
      const typeKey = p.productTypeName || "Unknown";
      productsByType.set(typeKey, (productsByType.get(typeKey) || 0) + 1);
    });

    res.json({
      kpis: {
        ...kpis,
        minPrice: kpis.minPrice === Infinity ? 0 : kpis.minPrice,
        avgPrice: kpis.totalProducts
          ? Number((kpis.totalPrice / kpis.totalProducts).toFixed(2))
          : 0,
      },
      urgentAlerts: urgentRestockAlerts, // هذا سيغذي الـ UI بتنبيهات مباشرة
      breakdown: {
        productsByType: Array.from(productsByType.entries()).map(
          ([type, count]) => ({ type, count })
        ),
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Analytics failed" });
  }
});
//

router.get("/:slug/variants/by-color", getVariantByColor);

// router.get("/", async (req, res) => {
//   try {
//     const products = await Product.find().select(
//       " productTypeName colors title price numVariants totalStock isAvailable rating numReviews slug "
//     );
//     // .populate("variants");
//     res.json(products);
//   } catch (error) {
//     console.error("Error fetching products:", error);
//     res.status(500).json({ error: "Failed to fetch products" });
//   }
// });

// router.get("/", async (req, res) => {
//   try {
//     const { search, type, stockStatus } = req.query;
//     let query = {};

//     // 1. البحث بالاسم (Title)
//     if (search) {
//       query.title = { $regex: search, $options: "i" };
//     }

//     // 2. الفلترة بنوع المنتج (Sweater, T-Shirt, etc.)
//     if (type && type !== "all") {
//       query.productTypeName = type;
//     }

//     // 3. الفلترة بحالة المخزون (الذكية)
//     if (stockStatus === "out") {
//       query.totalStock = 0;
//     } else if (stockStatus === "low") {
//       // بنجيب المنتجات اللي فيها على الأقل مقاس واحد ناقص (Smart Filter)
//       query["colors.sizes.stock"] = { $lt: 5 };
//     }

//     const products = await Product.find(query)
//       .select(
//         "productTypeName colors title price numVariants totalStock isAvailable rating numReviews slug"
//       )
//       .sort({ createdAt: -1 }); // الأحدث أولاً

//     res.json(products);
//   } catch (error) {
//     res.status(500).json({ error: "Failed to fetch products" });
//   }
// });
router.get("/", async (req, res) => {
  try {
    // تأكد من مسميات Query Params القادمة من nuqs (استخدمنا q و stock هناك)
    const { q, type, stock } = req.query;
    let query = {};

    // 1. البحث بالاسم
    if (q) {
      query.title = { $regex: q, $options: "i" };
    }

    // 2. الفلترة بالنوع
    if (type && type !== "all") {
      query.productTypeName = type;
    }

    // 3. الفلترة الذكية للمخزون
    if (stock === "out") {
      // حالة "نافذ تماماً": إما الإجمالي صفر أو يوجد مقاس مخزونه 0
      query.colors = {
        $elemMatch: {
          sizes: { $elemMatch: { stock: 0 } },
        },
      };
    } else if (stock === "low") {
      // حالة "مخزون منخفض": يوجد على الأقل مقاس واحد مخزونه أقل من 5
      query.colors = {
        $elemMatch: {
          sizes: { $elemMatch: { stock: { $gt: 0, $lt: 5 } } },
        },
      };
    }

    const products = await Product.find(query)
      .select(
        "productTypeName colors title price numVariants totalStock isAvailable rating numReviews slug"
      )
      .sort({ createdAt: -1 }).populate("variants");

    res.json(products);
  } catch (error) {
    console.error("Filtering Error:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});
function normalizeQuery(q) {
  if (!q) return null;
  if (Array.isArray(q)) return q;
  return q.split(",").map((v) => v.trim());
  //
}
function normalizeValue(str) {
  return str
    .toLowerCase()
    .replace(/\s+/g, "") // remove spaces
    .replace(/-/g, "") // remove dashes
    .trim();
}
router.get("/card-list", async (req, res) => {
  try {
    const typeQuery = normalizeQuery(req.query.type);
    const colorQuery = normalizeQuery(req.query.color);

    const minPriceQuery =
      req.query.minPrice !== undefined ? Number(req.query.minPrice) : null;

    const maxPriceQuery =
      req.query.maxPrice !== undefined ? Number(req.query.maxPrice) : null;

    /* ======================================================
     1️⃣ Base Mongo Query (NO PRICE FILTER HERE)
    ====================================================== */
    const baseQuery = {};

    if (typeQuery) {
      baseQuery.productTypeName = { $in: typeQuery };
    }

    /* ======================================================
     2️⃣ Get GLOBAL price bounds (before price filter)
    ====================================================== */
    const priceStats = await Product.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: null,
          minPrice: { $min: "$price" },
          maxPrice: { $max: "$price" },
        },
      },
    ]);

    const priceBounds = {
      min: priceStats[0]?.minPrice ?? 0,
      max: priceStats[0]?.maxPrice ?? 0,
    };

    /* ======================================================
     3️⃣ Apply PRICE filter (AFTER bounds)
    ====================================================== */
    const filteredQuery = { ...baseQuery };

    if (minPriceQuery !== null || maxPriceQuery !== null) {
      filteredQuery.price = {};
      if (minPriceQuery !== null) filteredQuery.price.$gte = minPriceQuery;
      if (maxPriceQuery !== null) filteredQuery.price.$lte = maxPriceQuery;
    }

    /* ======================================================
     4️⃣ Fetch products
    ====================================================== */
    const products = await Product.find(filteredQuery).select(
      "productTypeName colors title price totalStock isAvailable rating numReviews slug"
    );

    /* ======================================================
     5️⃣ Build UNIQUE COLORS + COUNT
    ====================================================== */
    const colorsMap = new Map();

    products.forEach((product) => {
      product.colors.forEach((color) => {
        const key = normalizeValue(color.name);

        if (!colorsMap.has(key)) {
          colorsMap.set(key, {
            name: color.name,
            value: color.value,
            _id: color._id,
            productIds: new Set(),
          });
        }

        colorsMap.get(key).productIds.add(product._id.toString());
      });
    });

    const uniqueColors = Array.from(colorsMap.values()).map((c) => ({
      name: c.name,
      value: c.value,
      _id: c._id,
      count: c.productIds.size,
    }));

    /* ======================================================
     6️⃣ Expand products by colors + COLOR FILTER
    ====================================================== */
    const expanded = products.map((product) =>
      product.colors
        .filter((c) => {
          if (!colorQuery) return true;
          const normalized = normalizeValue(c.name);
          return colorQuery.some((q) => normalizeValue(q) === normalized);
        })
        .map((c) => ({
          _id: `${product._id}_${c._id}`,
          productId: product._id,
          title: product.title,
          price: product.price,
          slug: product.slug,
          rating: product.rating,
          numReviews: product.numReviews,
          productTypeName: product.productTypeName,
          totalStock: product.totalStock,
          isAvailable: product.isAvailable,
          color: {
            name: c.name,
            value: c.value,
            image: c.image,
            sizes:c.sizes,
            _id: c._id,
          },
        }))
    );

    /* ======================================================
     7️⃣ Remove empty + Interleave (Round-robin)
    ====================================================== */
    const nonEmpty = expanded.filter((g) => g.length > 0);
    const result = [];

    const max = Math.max(0, ...nonEmpty.map((g) => g.length));

    for (let i = 0; i < max; i++) {
      for (const group of nonEmpty) {
        if (group[i]) result.push(group[i]);
      }
    }

    /* ======================================================
     8️⃣ Product Types (from RESULT)
    ====================================================== */
    const productTypes = [...new Set(result.map((p) => p.productTypeName))];

    /* ======================================================
     9️⃣ ACTIVE price range (after all filters)
    ====================================================== */
    let activeMin = Infinity;
    let activeMax = 0;

    result.forEach((p) => {
      if (typeof p.price === "number") {
        activeMin = Math.min(activeMin, p.price);
        activeMax = Math.max(activeMax, p.price);
      }
    });

    if (activeMin === Infinity) activeMin = 0;

    /* ======================================================
     ✅ Response
    ====================================================== */
    res.json({
      data: result,

      filters: {
        colors: uniqueColors,
        productTypes,
        priceBounds, // 🔥 للسلايدر
        activePriceRange: {
          min: activeMin,
          max: activeMax,
        },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// router.get("/filters", getProductsFilters);
router.get("/:slug", getProductInfo);

module.exports = router;
