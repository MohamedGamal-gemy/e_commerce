// 📁 controllers/color.controller.js
const ProductVariant = require("../models/productVariant");

/**
 * @desc Get available colors and their product counts
 * @route GET /api/colors
 * @query productTypeName (optional)
 * @query productTypeId (optional)
 * @access Public
 */
exports.getColorsWithCounts = async (req, res) => {
  try {
    const { productTypeName, productTypeId } = req.query;

    // 🧠 تمرير الفلترة للـ static method داخل الموديل
    const colors = await ProductVariant.getColorCounts({
      productTypeName,
      productTypeId,
    });

    res.status(200).json({
      success: true,
      count: colors.length,
      colors,
    });
  } catch (error) {
    console.error("❌ Error fetching color counts:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching color counts",
    });
  }
};
