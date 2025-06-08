const express = require("express");
const asyncHandler = require("express-async-handler");
const cloudinary = require("../config/cloudinary");
const upload = require("../middlewares/upload");
const {
  Product,
  validateProduct,
  validateProductUpdate,
} = require("../models/Product");

const router = express.Router();

router.post(
  "/",
  upload.any(),
  asyncHandler(async (req, res) => {
    try {
      let parsedVariants = req.body.variants;
      if (typeof parsedVariants === "string") {
        try {
          parsedVariants = JSON.parse(parsedVariants);
        } catch (parseErr) {
          return res.status(400).json({ message: "Invalid JSON in variants" });
        }
      }

      req.body.variants = parsedVariants;

      const { error } = validateProduct(req.body);
      if (error) {
        console.log("Joi validation error:", error.details);
        return res.status(400).json({ message: error.details[0].message });
      }

      const { title, description, price, category, subcategory } = req.body;
      const files = req.files || [];

      const variantImagesMap = {};
      files.forEach((file) => {
        const fieldName = file.fieldname;
        const match = fieldName.match(/variantImages\[(\d+)\]/);
        if (match) {
          const variantIndex = parseInt(match[1], 10);
          if (!variantImagesMap[variantIndex]) {
            variantImagesMap[variantIndex] = [];
          }
          variantImagesMap[variantIndex].push(file);
        }
      });

      for (let i = 0; i < parsedVariants.length; i++) {
        if (!variantImagesMap[i] || variantImagesMap[i].length === 0) {
          throw new Error(`At least one image is required for variant ${i}`);
        }
      }

      const updatedVariants = await Promise.all(
        parsedVariants.map(async (variant, index) => {
          const variantImages = variantImagesMap[index] || [];

          const images = await Promise.all(
            variantImages.map(async (file) => {
              const result = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                  {
                    folder: `products/variants/${variant.color.name}`,
                  },
                  (error, result) => {
                    if (error) return reject(error);
                    resolve(result);
                  }
                );
                stream.end(file.buffer);
              });

              return {
                url: result.secure_url,
                publicId: result.public_id,
              };
            })
          );

          return {
            ...variant,
            images: images.length > 0 ? images : [],
          };
        })
      );

      const product = new Product({
        title,
        description,
        price,
        category,
        subcategory,
        variants: updatedVariants,
      });

      await product.save();
      res.status(201).json({
        message: "Product created successfully",
        product,
      });
    } catch (error) {
      console.error("Backend error:", error);
      res
        .status(500)
        .json({ message: `Failed to add product: ${error.message}` });
    }
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { category, subcategory, color, minPrice, maxPrice } = req.query;

    const filter = {};

    if (category) filter.category = category;

    if (subcategory) {
      filter.subcategory = { $in: subcategory.split(",") };
    }

    if (color) {
      filter["variants"] = {
        $elemMatch: {
          "color.name": { $in: color.split(",") },
        },
      };
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    const sortSelector = req.query.sort;

    const products = await Product.find(filter)
      .sort({ price: sortSelector === "high" ? -1 : 1 })
      .select("-__v");  

    if (!products || products.length === 0) {
      return res.status(404).json({ message: "No products found" });
    }

    res.status(200).json(products);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
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
