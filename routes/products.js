const express = require("express");
const asyncHandler = require("express-async-handler");
const cloudinary = require("../config/cloudinary");
const Subcategory = require("../models/subcategoryModel");
const ProductVariant = require("../models/variantsModel");

const {
  Product,
  validateProduct,
  validateProductUpdate,
} = require("../models/productModel");
const { upload } = require("../middlewares/upload");
const router = express.Router();

router.post(
  "/",
  upload.any(), 
  asyncHandler(async (req, res) => {
    // Parse JSON body
    let payload;
    try {
      payload = JSON.parse(req.body.payload);
    } catch (err) {
      return res.status(400).json({ message: "Invalid JSON payload" });
    }

    // Validate payload structure
    const { error, value } = validateProduct(payload);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { title, description, price, category, subcategory, variants } =
      value;
    const files = req.files;

    // Map images to variants
    const variantImagesMap = variants.reduce((acc, v, i) => {
      acc[i] = [];
      return acc;
    }, {});

    Object.values(files)
      .flat()
      .forEach((file) => {
        // file.fieldname => 'variantImages[0]'
        const match = file.fieldname.match(/^variantImages\[(\d+)\]$/);
        if (match) {
          const idx = parseInt(match[1], 10);
          variantImagesMap[idx].push({
            url: file.path,
            publicId: file.filename,
          });
        }
      });

    // Create and save product
    const product = await Product.create({
      title,
      description,
      price,
      category,
      subcategory,
    });

    // Create variants
    const variantDocs = await Promise.all(
      variants.map(async (variant, idx) => {
        const images = variantImagesMap[idx];
        if (!images || images.length === 0) {
          throw new Error(`Missing images for variant ${idx}`);
        }
        const variantDoc = await ProductVariant.create({
          productId: product._id,
          color: variant.color,
          sizes: variant.sizes,
          images,
        });
        return variantDoc._id;
      })
    );

    // Link variants to product
    product.variants = variantDocs;
    await product.save();

    res.status(201).json({ message: "Product created", product });
  })
);

// GET /api/products - جلب كل المنتجات
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

  // show
});
router.get(
  "/show",
  asyncHandler(async (req, res) => {
    const {
      subcategory,
      color,
      minPrice,
      maxPrice,
      title,
      sort = "newest", // default
      limit = 8,
      page = 1,
    } = req.query;

    const filter = {};
    let productIdsByColor = [];

    // ✅ Subcategory filter
    if (subcategory) {
      const subNames = subcategory.split(",");
      const matchedSubs = await Subcategory.find({
        name: { $in: subNames },
      }).select("_id");
      const subIds = matchedSubs.map((s) => s._id);
      if (subIds.length > 0) {
        filter.subcategory = { $in: subIds };
      } else {
        return res.json({
          products: [],
          totalPages: 0,
          currentPage: +page,
          priceRange: { min: 0, max: 0 },
        });
      }
    }

    // ✅ Color filter
    if (color) {
      const colorsArray = color.split(",");
      const matchedVariants = await ProductVariant.find({
        "color.name": { $in: colorsArray },
      }).select("productId");
      productIdsByColor = matchedVariants.map((v) => v.productId.toString());
      if (productIdsByColor.length > 0) {
        filter._id = { $in: productIdsByColor };
      } else {
        return res.json({
          products: [],
          totalPages: 0,
          currentPage: +page,
          priceRange: { min: 0, max: 0 },
        });
      }
    }

    // ✅ Price filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // ✅ Title search
    if (title) {
      filter.title = { $regex: title, $options: "i" };
    }

    // ✅ Sorting
    let sortOption = {};
    switch (sort) {
      case "price-asc":
        sortOption.price = 1;
        break;
      case "price-desc":
        sortOption.price = -1;
        break;
      case "rating":
        sortOption.rating = -1;
        break;
      case "new":
        sortOption.createdAt = -1;
        break;
      case "old":
        sortOption.createdAt = 1;
        break;
      default:
        sortOption.createdAt = -1; // newest first
    }

    const skip = (+page - 1) * +limit;

    // ✅ Get products
    const products = await Product.find(filter)
      .populate({ path: "variants", select: "images color" })
      .populate("subcategory", "name")
      .populate("category", "name")
      .sort(sortOption)
      .limit(+limit)
      .skip(skip)
      .lean();

    // ✅ Format products
    const variantsColorsOfImages = products.map((product) =>
      product.variants.map((v) => v.images[0])
    );
    // const imagesOfColors=variantsColorsOfImages.map(())
    // console.log(variantsColorsOfImages);

    const formattedProducts = products.map((product) => ({
      _id: product._id,
      title: product.title,
      price: product.price,
      rating: product.rating,
      numReviews: product.numReviews,
      subcategory: product.subcategory,
      category: product.category,
      firstImage: product.variants?.[0]?.images?.[0]?.url || null,
      imagesOfColors: product.variants.map((variant) => variant.images[0]),
    }));
    // console.log(formattedProducts);

    // ✅ Count and pages
    const totalCount = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / +limit);

    // ✅ Get real price range
    const priceStats = await Product.aggregate([
      {
        $group: {
          _id: null,
          minPrice: { $min: "$price" },
          maxPrice: { $max: "$price" },
        },
      },
    ]);
    const priceRange = priceStats[0] || { minPrice: 0, maxPrice: 0 };

    res.json({
      products: formattedProducts,
      totalPages,
      currentPage: +page,
      priceRange, // ✅ رجعها للواجهة
    });
  })
);

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
// single
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
