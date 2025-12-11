const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class SKUHelper {
    /**
     * Generate unique SKU for variant
     */
    generateSKU(title, color, size) {
        const titleCode = title
            .substring(0, 3)
            .toUpperCase()
            .replace(/[^A-Z]/g, 'X');

        const colorCode = color
            ? color.substring(0, 2).toUpperCase()
            : 'CL';

        const sizeCode = size
            ? size.replace(/[^A-Z0-9]/g, '').substring(0, 3).toUpperCase()
            : 'ONE';

        const unique = uuidv4().substring(0, 6).toUpperCase();

        return `${titleCode}-${colorCode}-${sizeCode}-${unique}`;
    }

    /**
     * Validate SKU format
     */
    isValidSKU(sku) {
        const skuPattern = /^[A-Z0-9]{3}-[A-Z0-9]{2}-[A-Z0-9]{2,3}-[A-Z0-9]{6}$/;
        return skuPattern.test(sku);
    }

    /**
     * Generate cache key for SKU operations
     */
    generateSKUCacheKey(productId, color, size) {
        const input = `${productId}-${color}-${size}`;
        return `sku:${crypto.createHash('md5').update(input).digest('hex')}`;
    }
}

module.exports = new SKUHelper();