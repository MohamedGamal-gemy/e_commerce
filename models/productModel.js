
// const mongoose = require("mongoose");

// const ProductSchema = new mongoose.Schema(
//   {
//     title: {
//       type: String,
//       required: [true, "Title is required"],
//       trim: true,
//       minlength: [2, "Title must be at least 2 characters"],
//     },
//     slug: {
//       type: String,
//       // required: [true, "Slug is required"],
//       // unique: true,
//       trim: true,
//     },
//     description: {
//       type: String,
//       required: [true, "Description is required"],
//       trim: true,
//     },
//     // 🔥 سعر البيع الأصلي (قبل أي خصم)
//     originalPrice: {
//       type: Number,
//       // required: [true, "Original Price is required"],
//       min: [0.01, "Original Price must be greater than 0"],
//     },
//     // 💡 سعر البيع الحالي (السعر الذي سيتم عرضه للشراء بعد الخصم)
//     price: {
//       type: Number,
//       required: [true, "Price is required"],
//       min: [0.01, "Price must be greater than 0"],
//       // يُفضل أن يكون price <= originalPrice
//     },

//     // حالة وتصنيف المنتج
//     category: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Category",
//       required: true,
//     },
//     subcategory: { type: mongoose.Schema.Types.ObjectId, ref: "Subcategory" },

//     // حالة المخزون والتوفر (تُحدَّث تلقائياً بواسطة الـ Variants)
//     totalStock: {
//       type: Number,
//       default: 0,
//       min: [0, "Total stock can't be negative"],
//     },
//     // 🔥 حالة التوفر السريعة (للتصفية والبحث)
//     isAvailable: { type: Boolean, default: true },

//     // خصائص إضافية
//     rating: { type: Number, default: 0, min: 0, max: 5 },
//     numReviews: { type: Number, default: 0, min: 0 },
//     isActive: { type: Boolean, default: true },
//     isFeatured: { type: Boolean, default: false },

//     // الروابط للـ Variants
//     variants: [{ type: mongoose.Schema.Types.ObjectId, ref: "ProductVariant" }],
//   },
//   { timestamps: true }
// );

// // يجب إضافة middleware هنا لحساب الخصم أو التحقق من أن price <= originalPrice قبل الحفظ

// const Product = mongoose.model("Product", ProductSchema);
// module.exports = Product;



const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [2, "Title must be at least 2 characters"],
    },
    slug: { type: String, trim: true },
    description: { type: String, required: true, trim: true },
    originalPrice: { type: Number, min: 0 },
    price: { type: Number, required: true, min: 0.01 },

    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    subcategory: { type: mongoose.Schema.Types.ObjectId, ref: "Subcategory" },

    totalStock: { type: Number, default: 0, min: 0 },
    isAvailable: { type: Boolean, default: true },

    rating: { type: Number, default: 0, min: 0, max: 5 },
    numReviews: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },

    variants: [{ type: mongoose.Schema.Types.ObjectId, ref: "ProductVariant" }],
  },
  { timestamps: true }
);

// ✅ Virtual populate for reviews
ProductSchema.virtual("reviews", {
  ref: "Review",
  foreignField: "product",
  localField: "_id",
});

// ✅ Ensure virtuals are included in JSON
ProductSchema.set("toJSON", { virtuals: true });
ProductSchema.set("toObject", { virtuals: true });

// ✅ Helper to recalc rating automatically
ProductSchema.statics.updateProductRating = async function (productId) {
  const Review = mongoose.model("Review");
  const reviews = await Review.find({ product: productId });

  const numReviews = reviews.length;
  const averageRating =
    numReviews > 0
      ? reviews.reduce((acc, r) => acc + r.rating, 0) / numReviews
      : 0;

  await this.findByIdAndUpdate(productId, {
    numReviews,
    rating: Number(averageRating.toFixed(1)),
  });
};

const Product = mongoose.model("Product", ProductSchema);
module.exports = Product;
