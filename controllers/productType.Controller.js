const mongoose = require("mongoose");
const ProductType = require("../models/productType");

// GET /api/product-types
exports.getAllProductTypes = async (req, res) => {
  try {
    const { color } = req.query;

    const populateOptions = { path: "dynamicProductCount" };

    if (color) {
      // فلترة ديناميكية على virtual count حسب اللون
      populateOptions.match = {
        colorNames: { $regex: new RegExp(`^${color}$`, "i") },
      };
    }

    const productTypes = await ProductType.find({ isActive: true })
      .populate(populateOptions)
      .sort({ order: 1 })
      .lean();

    res.json({ count: productTypes.length, productTypes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/product-types/:id
exports.getProductTypeById = async (req, res) => {
  try {
    const productType = await ProductType.findById(req.params.id)
      .populate("dynamicProductCount")
      .lean();

    if (!productType)
      return res.status(404).json({ message: "ProductType not found" });

    res.json(productType);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/product-types
exports.createProductType = async (req, res) => {
  try {
    const { name, description, image, order } = req.body;

    const newProductType = new ProductType({
      name,
      description,
      image,
      order,
    });

    await newProductType.save();

    res.status(201).json(newProductType);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/product-types/:id
exports.updateProductType = async (req, res) => {
  try {
    const updated = await ProductType.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).lean();

    if (!updated)
      return res.status(404).json({ message: "ProductType not found" });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/product-types/:id
exports.deleteProductType = async (req, res) => {
  try {
    const deleted = await ProductType.findByIdAndDelete(req.params.id).lean();

    if (!deleted)
      return res.status(404).json({ message: "ProductType not found" });

    res.json({ message: "ProductType deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
