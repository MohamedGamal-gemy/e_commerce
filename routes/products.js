const express = require("express");
const asyncHandler = require("express-async-handler");
const cloudinary = require("../config/cloudinary");
const upload = require("../middlewares/upload");
const {
  Product,
  validateProduct,
  validateProductUpdate,
} = require("../models/productModel");
const { default: mongoose } = require("mongoose");
const router = express.Router();

// router.post(
//   "/",
//   upload.any(),
//   asyncHandler(async (req, res) => {
//     try {
//       let parsedVariants = req.body.variants;
//       if (typeof parsedVariants === "string") {
//         try {
//           parsedVariants = JSON.parse(parsedVariants);
//         } catch (parseErr) {
//           return res.status(400).json({ message: "Invalid JSON in variants" });
//         }
//       }

//       req.body.variants = parsedVariants;

//       const { error } = validateProduct(req.body);
//       if (error) {
//         console.log("Joi validation error:", error.details);
//         return res.status(400).json({ message: error.details[0].message });
//       }

//       const { title, description, price, category, subcategory } = req.body;
//       const files = req.files || [];

//       const variantImagesMap = {};
//       files.forEach((file) => {
//         const fieldName = file.fieldname;
//         const match = fieldName.match(/variantImages\[(\d+)\]/);
//         if (match) {
//           const variantIndex = parseInt(match[1], 10);
//           if (!variantImagesMap[variantIndex]) {
//             variantImagesMap[variantIndex] = [];
//           }
//           variantImagesMap[variantIndex].push(file);
//         }
//       });

//       for (let i = 0; i < parsedVariants.length; i++) {
//         if (!variantImagesMap[i] || variantImagesMap[i].length === 0) {
//           throw new Error(`At least one image is required for variant ${i}`);
//         }
//       }

//       const updatedVariants = await Promise.all(
//         parsedVariants.map(async (variant, index) => {
//           const variantImages = variantImagesMap[index] || [];

//           const images = await Promise.all(
//             variantImages.map(async (file) => {
//               const result = await new Promise((resolve, reject) => {
//                 const stream = cloudinary.uploader.upload_stream(
//                   {
//                     folder: `products/variants/${variant.color.name}`,
//                   },
//                   (error, result) => {
//                     if (error) return reject(error);
//                     resolve(result);
//                   }
//                 );
//                 stream.end(file.buffer);
//               });

//               return {
//                 url: result.secure_url,
//                 publicId: result.public_id,
//               };
//             })
//           );

//           return {
//             ...variant,
//             images: images.length > 0 ? images : [],
//           };
//         })
//       );

//       const product = new Product({
//         title,
//         description,
//         price,
//         category,
//         subcategory,
//         variants: updatedVariants,
//       });

//       await product.save();
//       res.status(201).json({
//         message: "Product created successfully",
//         product,
//       });
//     } catch (error) {
//       console.error("Backend error:", error);
//       res
//         .status(500)
//         .json({ message: `Failed to add product: ${error.message}` });
//     }
//   })
// );

// router.get(
//   "/",
//   asyncHandler(async (req, res) => {
//     const { limit = 8, page = 1 } = req.query;
//     const currentPage = Number(page) || 1;
//     const pageSize = Number(limit) || 8;
//     const skip = (currentPage - 1) * pageSize;
//     const totalCount = await Product.countDocuments();

//     const products = await Product.find()
//       .skip(skip)
//       .limit(pageSize)
//       .populate({
//         path: "variants",
//         populate: {
//           path: "images",
//           select: "url", // فقط نجيب url
//         },
//       })
//       .populate("category")
//       .populate("subcategory");

//     // const variants = products?.map((product) => {
//     //   product.variants;
//     // });
//     // const imgShow = variants[0]?.images[0].url;
//     // const newProducts = {
//     //   imgShow,
//     //   products,
//     // };
//     res.json({
//       products,
//       // imgShow,
//       totalPages: Math.ceil(totalCount / pageSize),
//       currentPage,
//     });

//     // .populate("subcategory");
//   })
// );
// router.get(
//   "/show",
//   asyncHandler(async (req, res) => {
//     const { subcategory } = req.query;
//     const query = {};
//     // if (subcategory) query.subcategory.name;
//     const products = await Product.find(
//       { "subcategory.name": "sweetshirt" },
//       "title rating price numReviews subcategory variants"
//     )
//       .populate("variants")
//       .populate("subcategory")
//       .limit(10)
//       .lean();
//     const filtered = products?.map((product) => {
//       const firstImage = product.variants[0]?.images[0]?.url;
//       const secondImage = product.variants[0]?.images[1]?.url;
//       const imagesColorsOfVariants = product.variants.map((variant) => {
//         return variant.images[0].url;
//       });
//       console.log(imagesColorsOfVariants);

//       return {
//         _id: product._id,
//         title: product.title,
//         price: product.price,
//         rating: product.rating,
//         numReviews: product.numReviews,
//         subcategory: product.subcategory,
//         firstImage,
//         secondImage,
//         imagesColorsOfVariants:
//           imagesColorsOfVariants.length > 1 ? imagesColorsOfVariants : null,
//       };
//     });
//     res.json(filtered);
//   })
// );

// router.get(
//   "/show",
//   asyncHandler(async (req, res) => {
//     const { subcategory, limit = 8, page = 1 } = req.query;

//     const filter = {};

//     if (subcategory) {
//       filter.subcategory = subcategory;
//     }

//     const products = await Product.find(
//       filter,
//       "title rating price numReviews subcategory variants"
//     )
//       .populate("variants", "images")
//       .limit(limit)
//       .skip((+page - 1) * limit)
//       .lean();

//     const filtered = products?.map((product) => {
//       const firstImage = product.variants?.[0]?.images?.[0]?.url ?? null;
//       const secondImage = product.variants?.[0]?.images?.[1]?.url ?? null;

//       const imagesColorsOfVariants = product.variants
//         .map((variant) => variant.images?.[0]?.url)
//         .filter(Boolean);

//       return {
//         _id: product._id,
//         title: product.title,
//         price: product.price,
//         rating: product.rating,
//         numReviews: product.numReviews,
//         subcategory: product.subcategory,
//         firstImage,
//         secondImage,
//         imagesColorsOfVariants:
//           imagesColorsOfVariants.length > 1 ? imagesColorsOfVariants : [],
//       };
//     });
//     const totalCount = await Product.countDocuments();
//     const totalPages = Math.ceil(totalCount / +limit);

//     res.json({ products: filtered, totalPages, currentPage: +page });
//   })
// );
// router.get(
//   "/show",
//   asyncHandler(async (req, res) => {
//     const { subcategory, limit = 8, page = 1 } = req.query;

//     const filter = {};

//     if (subcategory) {
//       filter.subcategory = subcategory;
//     }

//     const products = await Product.find(
//       filter,
//       "title rating price numReviews subcategory variants"
//     )
//       .populate("variants", "images")
//       .populate("subcategory")
//       .limit(+limit)
//       .skip((+page - 1) * +limit)
//       .lean();

//     const filtered = products.map((product) => {
//       const firstImage = product.variants?.[0]?.images?.[0]?.url ?? null;
//       const secondImage = product.variants?.[0]?.images?.[1]?.url ?? null;

//       const imagesColorsOfVariants = product.variants
//         .map((variant) => variant.images?.[0]?.url)
//         .filter(Boolean);

//       return {
//         _id: product._id,
//         title: product.title,
//         price: product.price,
//         rating: product.rating,
//         numReviews: product.numReviews,
//         subcategory: product.subcategory,
//         firstImage,
//         secondImage,
//         imagesColorsOfVariants,
//       };
//     });

//     const totalCount = await Product.countDocuments(filter);
//     const totalPages = Math.ceil(totalCount / +limit);

//     res.json({ products: filtered, totalPages, currentPage: +page });
//   })
// );


const Subcategory = require("../models/subcategoryModel");

router.get(
  "/show",
  asyncHandler(async (req, res) => {
    const { subcategory, limit = 8, page = 1 } = req.query;

    const filter = {};

    if (subcategory) {
      const namesArray = subcategory.toString().split(",");

      // هنجيب الـ _id المقابلة للأسماء
      const matched = await Subcategory.find({
        name: { $in: namesArray },
      }).select("_id");

      const subcategoryIds = matched.map((s) => s._id);

      if (subcategoryIds.length > 0) {
        filter.subcategory = { $in: subcategoryIds };
      } else {
        // لو مفيش تطابق، رجّع فاضي مباشرة
        return res.json({ products: [], totalPages: 0, currentPage: +page });
      }
    }

    const products = await Product.find(
      filter,
      "title rating price numReviews subcategory variants"
    )
      .populate("variants", "images")
      .populate("subcategory")
      .limit(+limit)
      .skip((+page - 1) * +limit)
      .lean();

    const filtered = products.map((product) => {
      const firstImage = product.variants?.[0]?.images?.[0]?.url ?? null;
      const secondImage = product.variants?.[0]?.images?.[1]?.url ?? null;

      const imagesColorsOfVariants = product.variants
        .map((variant) => variant.images?.[0]?.url)
        .filter(Boolean);

      return {
        _id: product._id,
        title: product.title,
        price: product.price,
        rating: product.rating,
        numReviews: product.numReviews,
        subcategory: product.subcategory,
        firstImage,
        secondImage,
        imagesColorsOfVariants,
      };
    });

    const totalCount = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / +limit);

    res.json({ products: filtered, totalPages, currentPage: +page });
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { limit = 8, page = 1 } = req.query;
    const currentPage = Number(page) || 1;
    const pageSize = Number(limit) || 8;
    const skip = (currentPage - 1) * pageSize;

    const products = await Product.find()
      .skip(skip)
      .limit(pageSize)
      .populate({
        path: "variants",
        populate: {
          path: "images",
          select: "url",
        },
      })
      .populate("category")
      .populate("subcategory");

    const filtered = products.map((prod) => {
      const firstImage =
        prod.variants?.[0]?.images?.[0]?.url || "/fallback.jpg";

      return {
        _id: prod._id,
        title: prod.title,
        price: prod.price,
        description: prod.description,
        rating: prod.rating,
        numReviews: prod.numReviews,
        category: prod.category,
        subcategory: prod.subcategory,
        createdAt: prod.createdAt,
        firstImage, // ✅ أهم سطر
      };
    });
    const totalCount = await Product.countDocuments();
    const totalPages = Math.ceil(totalCount / pageSize);

    res.json({ products: filtered, currentPage, totalPages });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id)
      .populate("category")
      .populate("subcategory")
      .populate("variants");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  })
);

// router.patch(
//   "/:id",
//   asyncHandler(async (req, res) => {
//     const { id } = req.params;

//     const product = await Product.findById(id);

//     if (!product) {
//       return res.status(404).json({ message: "Product not found" });
//     }

//     // تحديث الحقول الأساسية (title, price, description, category...)
//     product.title = req.body.title || product.title;
//     product.price = req.body.price || product.price;
//     product.description = req.body.description || product.description;
//     product.category = req.body.category || product.category;
//     product.subcategory = req.body.subcategory || product.subcategory;

//     // لو عندك تحديث لمتغيرات (variants) أو صور، ممكن تضيفها هنا برضو

//     const updatedProduct = await product.save();

//     res.status(200).json(updatedProduct);
//   })
// );

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // تحديث الحقول
    product.title = req.body.title || product.title;
    product.price = req.body.price || product.price;
    product.description = req.body.description || product.description;

    // لو category أو subcategory جايين كـ كائن بدل string (ID)، خذ الـ _id منهم
    if (req.body.category) {
      product.category =
        typeof req.body.category === "string"
          ? req.body.category
          : req.body.category._id;
    }

    if (req.body.subcategory) {
      product.subcategory =
        typeof req.body.subcategory === "string"
          ? req.body.subcategory
          : req.body.subcategory._id;
    }

    const updated = await product.save();

    // اعد جلب المنتج مع populated البيانات
    const updatedProduct = await Product.findById(id)
      .populate("category")
      .populate("subcategory");

    res.status(200).json(updatedProduct);
  })
);

// router.get(
//   "/admin/:id",
//   asyncHandler(async (req, res) => {
//     const product = await Product.findById(req.params.id).populate(
//       "category subcategory "
//     );

//     if (!product) {
//       return res.status(404).json({ message: "Product not found" });
//     }

//     res.json(product);
//   })
// );

// router.get(
//   "/",
//   asyncHandler(async (req, res) => {
//     const {
//       category,
//       subcategory,
//       color,
//       minPrice,
//       maxPrice,
//       sort,
//       title,
//       rating,
//       page = 1,
//       limit = 8,
//     } = req.query;

//     const filter = {};

//     if (category) filter.category = category;

//     if (subcategory) {
//       filter.subcategory = { $in: subcategory.split(",") };
//     }

//     if (color) {
//       filter["variants"] = {
//         $elemMatch: {
//           "color.name": { $in: color.split(",") },
//         },
//       };
//     }

//     if (minPrice || maxPrice) {
//       filter.price = {};
//       if (minPrice) filter.price.$gte = Number(minPrice);
//       if (maxPrice) filter.price.$lte = Number(maxPrice);
//     }

//     if (title) {
//       filter.title = { $regex: title, $options: "i" };
//     }

//     if (rating) {
//       filter.rating = { $gte: Number(rating) };
//     }

//     let sortQuery = {};
//     switch (sort) {
//       case "high":
//         sortQuery = { price: -1 };
//         break;
//       case "low":
//         sortQuery = { price: 1 };
//         break;
//       case "high_rating":
//         sortQuery = { rating: -1 };
//         break;
//       case "new":
//         sortQuery = { createdAt: -1 };
//         break;
//       case "old":
//         sortQuery = { createdAt: 1 };
//         break;
//       default:
//         sortQuery = {};
//     }

//     const currentPage = Number(page) || 1;
//     const pageSize = Number(limit) || 8;
//     const skip = (currentPage - 1) * pageSize;

//     const totalItems = await Product.countDocuments(filter);

//     const products = await Product.find({ filter })
//       .sort(sortQuery)
//       .skip(skip)
//       .limit(pageSize)
//       .select("-__v");

//     const updatedProducts = products.map((product) => {
//       const productObj = product.toObject();
//       productObj.variants = productObj.variants.map((variant) => ({
//         ...variant,
//         images: variant.images.slice(0, 2),
//       }));
//       return productObj;
//     });

//     if (!products || products.length === 0) {
//       return res.status(404).json({ message: "No products found" });
//     }

//     res.status(200).json({
//       products: updatedProducts,
//       currentPage,
//       totalPages: Math.ceil(totalItems / pageSize),
//       totalItems,
//     });
//   })
// );

// router.get(
//   "/:id",
//   asyncHandler(async (req, res) => {
//     const product = await Product.findById(req.params.id);
//     if (!product) {
//       return res.status(404).json({ message: "Product not found" });
//     }
//     res.json(product);
//   })
// );

router.patch(
  "/:id",
  upload.any(),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    let updateData = { ...req.body };
    if (typeof updateData.variants === "string") {
      try {
        updateData.variants = JSON.parse(updateData.variants);
      } catch (err) {
        return res.status(400).json({ message: "Invalid variants JSON" });
      }
    }

    const { error } = validateProductUpdate(updateData);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const files = req.files || [];
    const mapByVariant = {};
    files.forEach((file) => {
      const m = file.fieldname.match(/variantImages\[(\d+)\]/);
      if (m) {
        const idx = +m[1];
        if (!mapByVariant[idx]) mapByVariant[idx] = [];
        mapByVariant[idx].push(file);
      }
    });

    for (let idx = 0; idx < updateData.variants.length; idx++) {
      const variant = updateData.variants[idx];
      const toUpload = mapByVariant[idx] || [];

      if (toUpload.length) {
        const uploaded = await Promise.all(
          toUpload.map(
            (file) =>
              new Promise((resolve, reject) => {
                cloudinary.uploader
                  .upload_stream(
                    { folder: "products/variants" },
                    (err, result) => {
                      if (err) return reject(err);
                      resolve({
                        url: result.secure_url,
                        publicId: result.public_id,
                      });
                    }
                  )
                  .end(file.buffer);
              })
          )
        );

        if (!Array.isArray(variant.images)) {
          variant.images = [];
        }
        variant.images.push(...uploaded);
      }
    }

    ["title", "description", "price", "category", "subcategory"].forEach(
      (f) => {
        if (updateData[f] !== undefined) {
          product[f] = updateData[f];
        }
      }
    );
    product.variants = updateData.variants;

    await product.save();

    res.status(200).json({
      message: "Product updated successfully ",
      data: product,
    });
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
