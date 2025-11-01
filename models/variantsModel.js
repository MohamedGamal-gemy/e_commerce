// const mongoose = require("mongoose");


// const ProductVariantSchema = new mongoose.Schema(
//   {
//     productId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Product",
//       required: true,
//     },
//     sku: {
//       type: String,
//       // required: [true, "SKU is required"],
//       // unique: true, // يضمن عدم تكرار كود المنتج الفريد
//     },
//     color: {
//       name: { type: String, required: [true, "Color name is required"] },
//       value: {
//         type: String,
//         required: [true, "Color value (HEX) is required"],
//       },
//     },
//     images: [
//       {
//         url: { type: String, required: [true, "Image URL is required"] },
//         publicId: { type: String },
//       },
//     ],
//     // 🔥 إدارة المخزون على مستوى المقاس
//     sizes: [
//       {
//         size: { type: String, required: [true, "Size is required"] },
//         stock: {
//           type: Number,
//           default: 0,
//           min: [0, "Stock can't be negative"],
//         },
//         // يمكن إضافة سعر مختلف للمقاسات الكبيرة هنا اختيارياً
//         // customPrice: { type: Number, default: 0 }
//       },
//     ],
//   },
//   { timestamps: true }
// );

// // يجب إضافة middleware هنا لتحديث totalStock و isAvailable في ProductSchema بعد الحفظ

// const ProductVariant = mongoose.model("ProductVariant", ProductVariantSchema);
// module.exports = ProductVariant;


const mongoose = require("mongoose");
const Product = require("./productModel");

const ProductVariantSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    sku: String,
    color: {
      name: { type: String, required: true },
      value: { type: String, required: true },
    },
    images: [
      {
        url: { type: String, required: true },
        publicId: String,
      },
    ],
    sizes: [
      {
        size: { type: String, required: true },
        stock: { type: Number, default: 0, min: 0 },
      },
    ],
  },
  { timestamps: true }
);

// ✅ بعد حفظ أي variant جديد، ضيفه تلقائيًا لقائمة variants في الـ Product
ProductVariantSchema.post("save", async function (doc) {
  await Product.findByIdAndUpdate(doc.productId, {
    $addToSet: { variants: doc._id }, // addToSet تمنع التكرار
  });
});

const ProductVariant = mongoose.model("ProductVariant", ProductVariantSchema);
module.exports = ProductVariant;
