// const mongoose = require("mongoose");
// const Product = require("./productModel");

// const reviewSchema = new mongoose.Schema(
//   {
//     product: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Product",
//       required: true,
//       index: true,
//     },
//     user: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//       index: true,
//     },
//     rating: {
//       type: Number,
//       required: true,
//       min: [1, "Rating must be at least 1"],
//       max: [5, "Rating must be at most 5"],
//     },
//     comment: {
//       type: String,
//       required: true,
//       trim: true,
//       minlength: [3, "Comment must be at least 3 characters"],
//     },
//     isApproved: {
//       type: Boolean,
//       default: true, // لو عايز تتحكم في الموافقة
//       index: true,
//     },
//     feedback: {
//       upvotes: { type: Number, default: 0 },
//       downvotes: { type: Number, default: 0 },
//     },
//     editedAt: { type: Date },
//   },
//   { timestamps: true }
// );

// // ✅ منع تكرار المراجعات لنفس المستخدم على نفس المنتج
// reviewSchema.index({ product: 1, user: 1 }, { unique: true });

// // ✅ تحديث تقييم المنتج تلقائيًا بعد إضافة أو حذف مراجعة
// reviewSchema.post("save", async function () {
//   await Product.updateProductRating(this.product);
// });

// reviewSchema.post("remove", async function () {
//   await Product.updateProductRating(this.product);
// });

// // ✅ تنسيق JSON وإخفاء الحقول غير الضرورية
// reviewSchema.set("toJSON", {
//   transform: (doc, ret) => {
//     delete ret.__v;
//     return ret;
//   },
// });

// // ✅ إضافة طريقة لتعديل المراجعة مع تحديث editedAt
// reviewSchema.methods.editReview = async function (newRating, newComment) {
//   if (newRating) this.rating = newRating;
//   if (newComment) this.comment = newComment;
//   this.editedAt = new Date();
//   await this.save();
// };

// const Review = mongoose.model("Review", reviewSchema);
// module.exports = Review;
