const slugify = require('slugify');
const crypto = require('crypto');

class SlugHelper {
    /**
     * Generate unique slug with fallback
     */
    async generateUniqueSlug(title, Model, existingId = null) {
        const baseSlug = slugify(title, {
            lower: true,
            strict: true,
            trim: true,
            locale: 'en'
        });

        let slug = baseSlug;
        let counter = 1;

        // Check for existing slug
        while (true) {
            const query = { slug };
            if (existingId) {
                query._id = { $ne: existingId };
            }

            const exists = await Model.exists(query);

            if (!exists) {
                return slug;
            }

            slug = `${baseSlug}-${counter}`;
            counter++;
        }
    }

    /**
     * Generate cache key for slug operations
     */
    generateSlugCacheKey(title) {
        return `slug:${crypto.createHash('md5').update(title).digest('hex')}`;
    }
}

module.exports = new SlugHelper();