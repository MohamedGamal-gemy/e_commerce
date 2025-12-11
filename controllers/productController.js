const asyncHandler = require("../middlewares/asyncHandler");
const { validateProduct } = require("../utils/validators/productValidator");
const productService = require("../services/productService");
const cloudinaryService = require("../services/cloudinaryService");
const { AppError } = require("../utils/errors/AppError");
const Product = require("../models/product");

class ProductController {
  /**
   * @desc    Create new product with variants
   * @route   POST /api/v1/products
   * @access  Private/Admin
   */
  // createProduct = asyncHandler(async (req, res) => {
  //   // Validate request data
  //   const validatedData = validateProduct(req.body);

  //   // Upload main image if exists
  //   let mainImageData = null;
  //   if (req.processedFiles?.mainImage) {
  //     const [uploaded] = await cloudinaryService.uploadImages(
  //       [req.processedFiles.mainImage],
  //       "products/main"
  //     );
  //     mainImageData = uploaded;
  //   }

  //   // Upload variant images
  //   const variantFiles = req.processedFiles?.variants || {};
  //   const variantImages = {};

  //   // Process variant images in parallel
  //   const variantUploadPromises = Object.keys(variantFiles).map(
  //     async (index) => {
  //       const files = variantFiles[index].images;
  //       if (files && files.length > 0) {
  //         const uploaded = await cloudinaryService.uploadImages(
  //           files,
  //           `products/variants`
  //         );
  //         variantImages[index] = uploaded;
  //       }
  //     }
  //   );

  //   await Promise.all(variantUploadPromises);

  //   // Create product with variants
  //   const product = await productService.createProductWithVariants(
  //     validatedData,
  //     validatedData.variants,
  //     {
  //       mainImage: mainImageData,
  //       variants: variantImages,
  //     },
  //     req.user.id
  //   );

  //   // Send response
  //   res.status(201).json({
  //     success: true,
  //     message: "Product created successfully",
  //     data: product,
  //   });
  // });

  /**
   * @desc    Get all products (with filters, sorting, pagination)
   * @route   GET /api/v1/products
   * @access  Public
   */
  getProducts = asyncHandler(async (req, res) => {
    let {
      page = 1,
      limit = 20,
      search = "",
      productType,
      status,
      isFeatured,
      sort = "-createdAt",
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    // 🔍 Filters
    const filters = {};

    if (search) {
      filters.title = { $regex: search, $options: "i" };
    }

    if (productType) filters.productType = productType;
    if (status) filters.status = status;
    if (isFeatured !== undefined) filters.isFeatured = isFeatured === "true";

    // 📦 Query
    const productsQuery = Product.find(filters)
      .populate("productType", "name")
      .populate("variants")
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit);

    const [products, total] = await Promise.all([
      productsQuery,
      Product.countDocuments(filters),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      count: products.length,
      pagination: {
        page,
        limit,
        totalPages,
        total,
      },
      data: products,
    });
  });

  /**
   * @desc    Update product with variants
   * @route   PUT /api/v1/products/:id
   * @access  Private/Admin
   */
  updateProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Validate request data
    const validatedData = validateProduct(req.body);

    // Upload new main image if provided
    let mainImageData = null;
    if (req.processedFiles?.mainImage) {
      const [uploaded] = await cloudinaryService.uploadImages(
        [req.processedFiles.mainImage],
        "products/main"
      );
      mainImageData = uploaded;
    }

    // Process variant images
    const variantFiles = req.processedFiles?.variants || {};
    const variantImages = {};

    const variantUploadPromises = Object.keys(variantFiles).map(
      async (index) => {
        const files = variantFiles[index].images;
        if (files && files.length > 0) {
          const uploaded = await cloudinaryService.uploadImages(
            files,
            `products/variants`
          );
          variantImages[index] = uploaded;
        }
      }
    );

    await Promise.all(variantUploadPromises);

    // Update product with variants
    const product = await productService.updateProductWithVariants(
      id,
      validatedData,
      validatedData.variants,
      {
        mainImage: mainImageData,
        variants: variantImages,
      },
      req.user.id
    );

    // Send response
    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  });

  /**
   * @desc    Get single product
   * @route   GET /api/v1/products/:id
   * @access  Public
   */
  getProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;
    // console.log(id);

    const product = await productService.getProductById(id);

    res.status(200).json({
      success: true,
      data: product,
    });
  });

  /**
   * @desc    Delete product
   * @route   DELETE /api/v1/products/:id
   * @access  Private/Admin
   */
  deleteProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      // Get product with variants
      const [product, variants] = await Promise.all([
        Product.findById(id).session(session),
        ProductVariant.find({ productId: id }).session(session),
      ]);

      if (!product) {
        throw new AppError("Product not found", 404);
      }

      // Extract all image public IDs for deletion
      const publicIds = [];

      // Add main image
      if (product.mainImage) {
        const publicId = cloudinaryService.extractPublicId(product.mainImage);
        if (publicId) publicIds.push(publicId);
      }

      // Add variant images
      variants.forEach((variant) => {
        variant.images.forEach((img) => {
          if (img.publicId) publicIds.push(img.publicId);
        });
      });

      // Delete from Cloudinary
      if (publicIds.length > 0) {
        await cloudinaryService.deleteImages(publicIds);
      }

      // Delete variants
      await ProductVariant.deleteMany({ productId: id }, { session });

      // Delete product
      await Product.findByIdAndDelete(id, { session });

      await session.commitTransaction();

      // Invalidate cache
      await productService.invalidateProductCache(id);

      res.status(200).json({
        success: true,
        message: "Product deleted successfully",
      });
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  });
}

//

module.exports = new ProductController();
