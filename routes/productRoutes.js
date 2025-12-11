const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const {
    configureVariantFields,
    processUploadedFiles
} = require('../middlewares/uploadMiddleware');
// const { protect, authorize } = require('../middlewares/auth');

// Configure upload middleware
const variantUpload = configureVariantFields(10, 5);

// Public routes
router.get('/', productController.getProducts);
router.get('/:id', productController.getProduct);

// Protected routes
// router.use(protect);

// Admin/Vendor routes
router.post(
    '/',
    // authorize('admin', 'vendor'),
    variantUpload,
    processUploadedFiles,
    productController.createProduct
);

router.put(
    '/:id',
    // authorize('admin', 'vendor'),
    variantUpload,
    processUploadedFiles,
    productController.updateProduct
);

router.delete(
    '/:id',
    // authorize('admin'),
    productController.deleteProduct
);

module.exports = router;