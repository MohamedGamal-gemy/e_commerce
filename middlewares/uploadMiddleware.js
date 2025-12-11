const multer = require('multer');
const path = require('path');
const { AppError } = require('../utils/errors/AppError');

// Memory storage for better performance
const storage = multer.memoryStorage();

// File filter for security
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|gif/;
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    const isImage = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const isMimeAllowed = allowedMimes.includes(file.mimetype);

    if (isImage && isMimeAllowed) {
        cb(null, true);
    } else {
        cb(new AppError('Invalid file type. Only images are allowed.', 400), false);
    }
};

// Configure multer with limits
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB per file
        files: 20, // Max 20 files total
    }
});

/**
 * Dynamic field configuration for variants
 */
const configureVariantFields = (maxVariants = 10, maxImagesPerVariant = 5) => {
    const fields = [
        { name: 'mainImage', maxCount: 1 }
    ];

    // Add dynamic fields for variants
    for (let i = 0; i < maxVariants; i++) {
        fields.push({
            name: `variants[${i}][images]`,
            maxCount: maxImagesPerVariant
        });
    }

    return upload.fields(fields);
};

/**
 * Middleware to process uploaded files
 */
const processUploadedFiles = (req, res, next) => {
    if (!req.files) {
        return next();
    }

    try {
        const processedFiles = {
            mainImage: req.files.mainImage?.[0] || null,
            variants: {}
        };

        // Process variant images
        Object.keys(req.files).forEach(key => {
            const match = key.match(/variants\[(\d+)\]\[images\]/);
            if (match) {
                const index = parseInt(match[1]);
                if (!processedFiles.variants[index]) {
                    processedFiles.variants[index] = { images: [] };
                }
                processedFiles.variants[index].images = req.files[key];
            }
        });

        req.processedFiles = processedFiles;
        next();
    } catch (error) {
        next(new AppError('Failed to process uploaded files', 400));
    }
};

module.exports = {
    configureVariantFields,
    processUploadedFiles,
    upload
};