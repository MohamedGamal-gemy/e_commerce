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
    const { category, subcategory } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;

    const products = await Product.find(filter).sort({ createdAt: -1 });

    if (!products) {
      return res.status(404).json({ message: "No products found" });
    }

    res.status(200).json(products);
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    const { error } = validateProductUpdate(updateData);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json(updatedProduct);
  })
);

//

router.patch(
  "/:id/variant/:variantId/color",
  asyncHandler(async (req, res) => {
    const { id, variantId } = req.params;
    const { name, value } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const variant = product.variants.id(variantId);
    if (!variant) {
      return res.status(404).json({ message: "Variant not found" });
    }

    if (name) variant.color.name = name;
    if (value) variant.color.value = value;

    await product.save();

    res.status(200).json({ message: "Color updated", product });
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
