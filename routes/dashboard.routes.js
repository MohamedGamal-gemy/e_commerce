// const express = require("express");
// const router = express.Router();
// const asyncHandler = require("express-async-handler");
// const Order = require("../models/order/order.schema");
// const Product = require("../models/product");
// //
// router.get(
//   "/sales",
//   asyncHandler(async (req, res) => {
//     const range = Number(req.query.range) || 7;

//     const fromDate = new Date();
//     fromDate.setDate(fromDate.getDate() - range);

//     const data = await Order.aggregate([
//       {
//         $match: {
//           createdAt: { $gte: fromDate },
//           status: { $ne: "cancelled" },
//         },
//       },
//       {
//         $group: {
//           _id: {
//             $dateToString: {
//               format: "%Y-%m-%d",
//               date: "$createdAt",
//             },
//           },
//           revenue: { $sum: "$totalPrice" },
//           orders: { $sum: 1 },
//         },
//       },
//       { $sort: { _id: 1 } },
//     ]);

//     res.json({
//       success: true,
//       range,
//       data,
//     });
//   })
// );
// //
// router.get(
//   "/overview",
//   asyncHandler(async (req, res) => {
//     const LOW_STOCK_THRESHOLD = 5;

//     const [orderStats] = await Order.aggregate([
//       {
//         $group: {
//           _id: null,
//           totalRevenue: { $sum: "$totalPrice" },
//           totalOrders: { $sum: 1 },
//           pendingShipment: {
//             $sum: {
//               $cond: [{ $in: ["$status", ["paid", "processing"]] }, 1, 0],
//             },
//           },
//           cancelledOrders: {
//             $sum: {
//               $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0],
//             },
//           },
//         },
//       },
//     ]);

//     const lowStockCount = await Product.countDocuments({
//       "colors.sizes.stock": { $lt: LOW_STOCK_THRESHOLD },
//     });

//     const totalRevenue = orderStats?.totalRevenue || 0;
//     const totalOrders = orderStats?.totalOrders || 0;

//     res.json({
//       success: true,
//       kpis: {
//         totalRevenue,
//         totalOrders,
//         avgOrderValue:
//           totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
//         pendingShipment: orderStats?.pendingShipment || 0,
//         cancelledOrders: orderStats?.cancelledOrders || 0,
//       },
//       alerts: {
//         lowStockProducts: lowStockCount,
//       },
//     });
//   })
// );

// //
// router.get(
//   "/inventory",
//   asyncHandler(async (req, res) => {
//     const threshold = Number(req.query.threshold) || 5;

//     const products = await Product.find(
//       { "colors.sizes.stock": { $lt: threshold } },
//       "title mainImage colors totalStock"
//     );

//     const lowStock = [];
//     let outOfStockSizes = 0;

//     products.forEach((product) => {
//       const criticalSizes = [];

//       product.colors.forEach((color) => {
//         color.sizes.forEach((size) => {
//           if (size.stock < threshold) {
//             if (size.stock === 0) outOfStockSizes++;

//             criticalSizes.push({
//               color: color.name,
//               image: color.image,
//               size: size.size,
//               stock: size.stock,
//             });
//           }
//         });
//       });

//       if (criticalSizes.length) {
//         lowStock.push({
//           productId: product._id,
//           title: product.title,
//           //   mainImage: product.mainImage,
//           totalStock: product.totalStock,
//           criticalSizes,
//         });
//       }
//     });

//     res.json({
//       success: true,
//       summary: {
//         lowStockProducts: lowStock.length,
//         outOfStockSizes,
//       },
//       data: lowStock,
//     });
//   })
// );

// //###############################

// router.get(
//   "/top-customers",
//   asyncHandler(async (req, res) => {
//     const topCustomers = await Order.aggregate([
//       {
//         $group: {
//           _id: "$user",
//           totalSpent: { $sum: "$totalPrice" },
//           ordersCount: { $sum: 1 },
//           lastOrder: { $max: "$createdAt" },
//           customerName: { $first: "$billingDetails.fullName" },
//         },
//       },
//       { $sort: { totalSpent: -1 } },
//       { $limit: 10 },
//     ]);

//     res.json({ success: true, data: topCustomers });
//   })
// );

// //
// router.get(
//   "/overview-v2",
//   asyncHandler(async (req, res) => {
//     const LOW_STOCK_THRESHOLD = 5;

//     const stats = await Order.aggregate([
//       {
//         $facet: {
//           // 1. الأرقام الأساسية
//           mainKpis: [
//             {
//               $group: {
//                 _id: null,
//                 revenue: { $sum: "$totalPrice" },
//                 orders: { $sum: 1 },
//                 itemsSold: { $sum: { $size: "$items" } },
//               },
//             },
//           ],
//           // 2. أفضل 5 منتجات مبيعاً (لأصحاب الفاشون)
//           topProducts: [
//             { $unwind: "$items" },
//             {
//               $group: {
//                 _id: "$items.product",
//                 totalSold: { $sum: "$items.quantity" },
//                 revenue: {
//                   $sum: { $multiply: ["$items.price", "$items.quantity"] },
//                 },
//                 title: { $first: "$items.productSnapshot.title" },
//                 image: { $first: "$items.productSnapshot.image" },
//               },
//             },
//             { $sort: { totalSold: -1 } },
//             { $limit: 5 },
//           ],
//           // 3. تحليل المقاسات (Size Popularity) - مهم جداً للـ Inventory
//           sizeAnalysis: [
//             { $unwind: "$items" },
//             {
//               $group: {
//                 _id: "$items.size",
//                 count: { $sum: "$items.quantity" },
//               },
//             },
//             { $sort: { count: -1 } },
//           ],
//           // 4. تقسيم المبيعات حسب حالة الدفع (Cash vs Card)
//           paymentMethods: [
//             {
//               $group: {
//                 _id: "$payment.method",
//                 count: { $sum: 1 },
//               },
//             },
//           ],
//         },
//       },
//     ]);

//     // حساب المنتجات منخفضة المخزن (Low Stock)
//     const lowStockCount = await Product.countDocuments({
//       "colors.sizes.stock": { $lt: LOW_STOCK_THRESHOLD },
//     });

//     res.json({
//       success: true,
//       kpis: stats[0].mainKpis[0],
//       topProducts: stats[0].topProducts,
//       sizes: stats[0].sizeAnalysis,
//       payments: stats[0].paymentMethods,
//       lowStock: lowStockCount,
//     });
//   })
// );
// module.exports = router;

const express = require("express");
const router = express.Router();
const asyncHandler = require("express-async-handler");
const Order = require("../models/order/order.schema");
const Product = require("../models/product");
const User = require("../models/user"); // تأكد من المسار الصحيح لموديل اليوزر

//

router.get(
  "/overview-pro",
  asyncHandler(async (req, res) => {
    const range = Number(req.query.range) || 30; // افتراضي 30 يوم
    const now = new Date();
    const currentStart = new Date(now.setDate(now.getDate() - range));
    const previousStart = new Date(
      new Date().setDate(currentStart.getDate() - range)
    );

    const stats = await Order.aggregate([
      {
        $facet: {
          // 1. حساب الـ KPIs للفترة الحالية
          currentPeriod: [
            {
              $match: {
                createdAt: { $gte: currentStart },
                status: { $ne: "cancelled" },
              },
            },
            {
              $group: {
                _id: null,
                revenue: { $sum: "$totalPrice" },
                orders: { $sum: 1 },
                customers: { $addToSet: "$user" },
              },
            },
            {
              $project: {
                revenue: 1,
                orders: 1,
                customerCount: { $size: "$customers" },
              },
            },
          ],
          // 2. حساب الـ KPIs للفترة السابقة للمقارنة
          previousPeriod: [
            {
              $match: {
                createdAt: { $gte: previousStart, $lt: currentStart },
                status: { $ne: "cancelled" },
              },
            },
            {
              $group: {
                _id: null,
                revenue: { $sum: "$totalPrice" },
                orders: { $sum: 1 },
              },
            },
          ],
          // 3. تحليل مبيعات الفئات (لـ Pie Chart)
          categorySales: [
            { $unwind: "$items" },
            {
              $group: {
                _id: "$items.productSnapshot.productTypeName",
                value: {
                  $sum: { $multiply: ["$items.price", "$items.quantity"] },
                },
              },
            },
            { $sort: { value: -1 } },
            { $limit: 5 },
          ],
          // 4. حالة الطلبات (لـ Donut Chart)
          orderStatusDist: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
        },
      },
    ]);

    // منطق حساب نسبة النمو (Growth Calculation)
    const curr = stats[0].currentPeriod[0] || {
      revenue: 0,
      orders: 0,
      customerCount: 0,
    };
    const prev = stats[0].previousPeriod[0] || { revenue: 0, orders: 0 };

    const calculateGrowth = (c, p) =>
      p === 0 ? 100 : Math.round(((c - p) / p) * 100);

    res.json({
      success: true,
      kpis: {
        revenue: {
          value: curr.revenue,
          growth: calculateGrowth(curr.revenue, prev.revenue),
        },
        orders: {
          value: curr.orders,
          growth: calculateGrowth(curr.orders, prev.orders),
        },
        customers: { value: curr.customerCount },
      },
      charts: {
        categories: stats[0].categorySales,
        orderStatus: stats[0].orderStatusDist,
      },
    });
  })
);
//
router.get(
  "/sales-trend",
  asyncHandler(async (req, res) => {
    const days = Number(req.query.days) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const salesData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $ne: "cancelled" },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$totalPrice" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({ success: true, data: salesData });
  })
);
//
router.get(
  "/top-performers",
  asyncHandler(async (req, res) => {
    const topProducts = await Order.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          name: { $first: "$items.productSnapshot.title" },
          image: { $first: "$items.productSnapshot.image" },
          totalSold: { $sum: "$items.quantity" },
          totalRevenue: {
            $sum: { $multiply: ["$items.price", "$items.quantity"] },
          },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
    ]);

    res.json({ success: true, data: topProducts });
  })
);
//
router.get(
  "/recent-orders",
  asyncHandler(async (req, res) => {
    const orders = await Order.find()
      .select("orderNumber status totalPrice createdAt items billingDetails")
      .populate("user", "username email") // لجلب بيانات المستخدم الأساسية
      .sort({ createdAt: -1 }) // الأحدث أولاً
      .limit(5); // عرض آخر 5 طلبات فقط

    // تنسيق البيانات لتناسب الجدول في التصميم
    const formattedOrders = orders.map((order) => ({
      id: order._id,
      orderID: order.orderNumber || `#${order._id.toString().slice(-7)}`,
      product: {
        name: order.items[0]?.productSnapshot?.title || "Unknown Product",
        image: order.items[0]?.productSnapshot?.image || "",
      },
      customer: order.billingDetails?.fullName || order.user?.username,
      date: order.createdAt,
      total: order.totalPrice,
      status: order.status,
    }));

    res.json({ success: true, data: formattedOrders });
  })
);
//
// router.get(
//   "/top-customers-weekly",
//   asyncHandler(async (req, res) => {
//     const lastWeek = new Date();
//     // lastWeek.setDate(lastWeek.getDate() - 90);
//     lastWeek.setDate(lastWeek.getDate() - 7);

//     const topCustomers = await Order.aggregate([
//       {
//         $match: {
//           createdAt: { $gte: lastWeek },
//           status: { $ne: "cancelled" }, // استبعاد الطلبات الملغاة
//         },
//       },
//       {
//         $group: {
//           _id: "$user",
//           ordersCount: { $sum: 1 },
//           totalSpent: { $sum: "$totalPrice" },
//           // جلب اسم العميل من آخر طلب قام به
//           customerName: { $last: "$billingDetails.fullName" },
//         },
//       },
//       {
//         $lookup: {
//           from: "users", // ربط مع جدول المستخدمين لجلب الصورة الشخصية
//           localField: "_id",
//           foreignField: "_id",
//           as: "userDetails",
//         },
//       },
//       { $unwind: "$userDetails" },
//       { $sort: { ordersCount: -1 } }, // الترتيب حسب عدد الطلبات
//       { $limit: 5 },
//       {
//         $project: {
//           _id: 1,
//           name: "$customerName",
//           orders: "$ordersCount",
//           avatar: "$userDetails.avatar", // تأكد من وجود حقل الصورة في موديل المستخدم
//           total: "$totalSpent",
//         },
//       },
//     ]);

//     res.json({ success: true, data: topCustomers });
//   })
// );
router.get(
  "/top-customers-all",
  asyncHandler(async (req, res) => {
    const topCustomers = await Order.aggregate([
      {
        // 1. استبعاد الطلبات الملغاة لضمان دقة البيانات
        $match: {
          status: { $ne: "cancelled" },
        },
      },
      {
        // 2. التجميع بناءً على معرف المستخدم (user ID)
        $group: {
          _id: "$user",
          ordersCount: { $sum: 1 }, // حساب عدد الطلبات لكل عميل
          totalSpent: { $sum: "$totalPrice" }, // حساب إجمالي ما أنفقه العميل
          customerName: { $last: "$billingDetails.fullName" }, // أخذ أحدث اسم مسجل للعميل
        },
      },
      {
        // 3. ربط البيانات مع مجموعة المستخدمين (Users Collection) لجلب بيانات إضافية كالصورة
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      { $unwind: "$userDetails" },
      {
        // 4. الترتيب تنازلياً بناءً على عدد الطلبات (أو totalSpent حسب رغبتك)
        $sort: { ordersCount: -1 },
      },
      {
        // 5. تحديد عدد النتائج (مثلاً أفضل 10 عملاء)
        $limit: 10,
      },
      {
        // 6. اختيار الحقول التي ستظهر في النتيجة النهائية
        $project: {
          _id: 1,
          name: "$customerName",
          orders: "$ordersCount",
          total: "$totalSpent",
          avatar: "$userDetails.avatar", // تأكد من وجود حقل avatar في موديل User
          email: "$userDetails.email",
        },
      },
    ]);

    res.json({
      success: true,
      count: topCustomers.length,
      data: topCustomers,
    });
  })
);
//
router.get(
  "/inventory-alerts",
  asyncHandler(async (req, res) => {
    const threshold = Number(req.query.threshold) || 5;

    const lowStockReport = await Product.aggregate([
      { $unwind: "$colors" },
      { $unwind: "$colors.sizes" },
      { $match: { "colors.sizes.stock": { $lte: threshold } } },
      {
        $group: {
          _id: "$_id",
          title: { $first: "$title" },
          //   mainImage: { $first: "$mainImage" },
          criticalVariants: {
            $push: {
              color: "$colors.name",
              size: "$colors.sizes.size",
              image: "$colors.sizes.image",
              stock: "$colors.sizes.stock",
            },
          },
        },
      },
    ]);

    res.json({
      success: true,
      count: lowStockReport.length,
      data: lowStockReport,
    });
  })
);
// 1. Sales Trend API - (للرسم البياني الخطي)
router.get(
  "/sales",
  asyncHandler(async (req, res) => {
    const range = Number(req.query.range) || 7;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - range);

    const data = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: fromDate },
          status: { $ne: "cancelled" }, // استبعاد الملغي
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$totalPrice" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({ success: true, range, data });
  })
);

// 2. Main Dashboard Overview - (العقل المدبر للداشبورد)
router.get(
  "/overview",
  asyncHandler(async (req, res) => {
    const LOW_STOCK_THRESHOLD = 5;
    const now = new Date();
    const startOfToday = new Date(now.setHours(0, 0, 0, 0));

    const stats = await Order.aggregate([
      // نفلتر البيانات الأساسية أولاً (اختياري: استبعاد الطلبات الملغاة من الإحصائيات العامة)
      { $match: { status: { $ne: "cancelled" } } },
      {
        $facet: {
          // أ) المؤشرات المالية الأساسية
          mainKpis: [
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: "$totalPrice" },
                totalOrders: { $sum: 1 },
                itemsSold: { $sum: { $size: "$items" } },
              },
            },
          ],
          // ب) أفضل 5 منتجات مبيعاً (Men Fashion Focus)
          topProducts: [
            { $unwind: "$items" },
            {
              $group: {
                _id: "$items.product",
                totalSold: { $sum: "$items.quantity" },
                revenue: {
                  $sum: { $multiply: ["$items.price", "$items.quantity"] },
                },
                title: { $first: "$items.productSnapshot.title" },
                image: { $first: "$items.productSnapshot.image" },
              },
            },
            { $sort: { totalSold: -1 } },
            { $limit: 5 },
          ],
          // ج) تحليل المقاسات (الأكثر طلباً)
          sizeAnalysis: [
            { $unwind: "$items" },
            {
              $group: {
                _id: "$items.size",
                count: { $sum: "$items.quantity" },
              },
            },
            { $sort: { count: -1 } },
          ],
          // د) تحليل الألوان (الأكثر طلباً في ملابس الرجال)
          colorAnalysis: [
            { $unwind: "$items" },
            {
              $group: {
                _id: "$items.color.name",
                count: { $sum: "$items.quantity" },
              },
            },
            { $sort: { count: -1 } },
          ],
          // هـ) تحليل ولاء العملاء (Retention)
          customerRetention: [
            { $group: { _id: "$user", orderCount: { $sum: 1 } } },
            {
              $group: {
                _id: null,
                repeatCustomers: {
                  $sum: { $cond: [{ $gt: ["$orderCount", 1] }, 1, 0] },
                },
                oneTimeCustomers: {
                  $sum: { $cond: [{ $eq: ["$orderCount", 1] }, 1, 0] },
                },
              },
            },
          ],
          // و) طرق الدفع
          paymentStats: [
            { $group: { _id: "$payment.method", count: { $sum: 1 } } },
          ],
        },
      },
    ]);

    // حسابات خارج الـ Aggregate (اليوزرز والمخزن)
    const totalUsers = await User.countDocuments({ role: "user" });
    const newUsersToday = await User.countDocuments({
      role: "user",
      createdAt: { $gte: startOfToday },
    });

    const lowStockCount = await Product.countDocuments({
      "colors.sizes.stock": { $lt: LOW_STOCK_THRESHOLD },
    });

    const pendingShipment = await Order.countDocuments({
      status: { $in: ["pending", "processing"] },
    });

    // تجهيز الرد النهائي مع ضمان وجود قيم افتراضية
    const kpis = stats[0].mainKpis[0] || {
      totalRevenue: 0,
      totalOrders: 0,
      itemsSold: 0,
    };
    const retention = stats[0].customerRetention[0] || {
      repeatCustomers: 0,
      oneTimeCustomers: 0,
    };

    res.json({
      success: true,
      kpis: {
        ...kpis,
        avgOrderValue:
          kpis.totalOrders > 0
            ? Math.round(kpis.totalRevenue / kpis.totalOrders)
            : 0,
        totalUsers,
        newUsersToday,
        pendingShipment,
      },
      inventory: {
        lowStockAlerts: lowStockCount,
      },
      charts: {
        topProducts: stats[0].topProducts,
        sizeDistribution: stats[0].sizeAnalysis,
        colorDistribution: stats[0].colorAnalysis,
        paymentMethods: stats[0].paymentStats,
        customerLoyalty: [
          { name: "Repeat", value: retention.repeatCustomers },
          { name: "New", value: retention.oneTimeCustomers },
        ],
      },
    });
  })
);

// 3. Detailed Inventory API
router.get(
  "/inventory",
  asyncHandler(async (req, res) => {
    const threshold = Number(req.query.threshold) || 5;
    const products = await Product.find(
      { "colors.sizes.stock": { $lt: threshold } },
      "title mainImage colors totalStock"
    );

    const lowStock = [];
    let outOfStockSizes = 0;

    products.forEach((product) => {
      const criticalSizes = [];
      product.colors.forEach((color) => {
        color.sizes.forEach((size) => {
          if (size.stock < threshold) {
            if (size.stock === 0) outOfStockSizes++;
            criticalSizes.push({
              color: color.name,
              image: color.image,
              size: size.size,
              stock: size.stock,
            });
          }
        });
      });

      if (criticalSizes.length) {
        lowStock.push({
          productId: product._id,
          title: product.title,
          totalStock: product.totalStock,
          criticalSizes,
        });
      }
    });

    res.json({
      success: true,
      summary: { lowStockProducts: lowStock.length, outOfStockSizes },
      data: lowStock,
    });
  })
);

// 4. Top Customers API
router.get(
  "/top-customers",
  asyncHandler(async (req, res) => {
    const topCustomers = await Order.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      {
        $group: {
          _id: "$user",
          totalSpent: { $sum: "$totalPrice" },
          ordersCount: { $sum: 1 },
          lastOrder: { $max: "$createdAt" },
          customerName: { $first: "$billingDetails.fullName" },
          customerEmail: { $first: "$billingDetails.email" },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
    ]);

    res.json({ success: true, data: topCustomers });
  })
);

module.exports = router;
