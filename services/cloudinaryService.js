// const cloudinary = require("../config/cloudinary");
// const { CloudinaryError } = require("../utils/errors/AppError");
// const logger = require("../config/logger");

// class CloudinaryService {
//   constructor() {
//     this.maxConcurrentUploads = 5;
//   }

//   /**
//    * Upload multiple images with concurrency control
//    */
//   async uploadImages(files, folder = "products") {
//     try {
//       const uploadPromises = files.map((file) =>
//         this.uploadSingleImage(file, folder)
//       );

//       // Control concurrency
//       const results = [];
//       for (
//         let i = 0;
//         i < uploadPromises.length;
//         i += this.maxConcurrentUploads
//       ) {
//         const chunk = uploadPromises.slice(i, i + this.maxConcurrentUploads);
//         const chunkResults = await Promise.all(chunk);
//         results.push(...chunkResults);
//       }

//       return results;
//     } catch (error) {
//       logger.error("Cloudinary upload batch failed:", error);
//       throw new CloudinaryError("Failed to upload images");
//     }
//   }

//   /**
//    * Upload single image with optimized settings
//    */
//   async uploadSingleImage(file, folder) {
//     try {
//       const timestamp = Date.now();
//       const publicId = `${folder}/${timestamp}_${Math.random()
//         .toString(36)
//         .substr(2, 9)}`;

//       const result = await cloudinary.uploader.upload(
//         file.path || file.buffer,
//         {
//           folder,
//           public_id: publicId,
//           resource_type: "auto",
//           transformation: [
//             { width: 1200, height: 1200, crop: "limit" },
//             { quality: "auto:good" },
//             { format: "webp" }, // Better compression
//           ],
//           eager: [
//             { width: 800, height: 800, crop: "limit" },
//             { width: 400, height: 400, crop: "limit" },
//           ],
//         }
//       );

//       return {
//         url: result.secure_url,
//         publicId: result.public_id,
//         alt: file.originalname || "Product image",
//         width: result.width,
//         height: result.height,
//         format: result.format,
//         size: result.bytes,
//         thumbnail: result.eager?.[0]?.secure_url,
//         small: result.eager?.[1]?.secure_url,
//       };
//     } catch (error) {
//       logger.error("Cloudinary single upload failed:", error);
//       throw new CloudinaryError(`Failed to upload image: ${file.originalname}`);
//     }
//   }

//   /**
//    * Delete images in batch
//    */
//   async deleteImages(publicIds) {
//     try {
//       if (!publicIds.length) return;

//       // Split into chunks for batch deletion
//       const chunkSize = 100; // Cloudinary max per request
//       const chunks = [];

//       for (let i = 0; i < publicIds.length; i += chunkSize) {
//         chunks.push(publicIds.slice(i, i + chunkSize));
//       }

//       const deletePromises = chunks.map((chunk) =>
//         cloudinary.api.delete_resources(chunk, {
//           resource_type: "image",
//           type: "upload",
//         })
//       );

//       await Promise.all(deletePromises);
//       logger.info(`Deleted ${publicIds.length} images from Cloudinary`);
//     } catch (error) {
//       logger.error("Cloudinary delete batch failed:", error);
//       throw new CloudinaryError("Failed to delete images");
//     }
//   }

//   /**
//    * Extract public ID from Cloudinary URL
//    */
//   extractPublicId(url) {
//     const matches = url.match(
//       /\/upload\/(?:v\d+\/)?(.+?)\.(?:jpg|jpeg|png|webp)/i
//     );
//     return matches ? matches[1] : null;
//   }
// }

// module.exports = new CloudinaryService();

const cloudinary = require("../config/cloudinary");
const { CloudinaryError } = require("../utils/errors/AppError");
const logger = require("../config/logger");

class CloudinaryService {
  constructor() {
    this.maxConcurrentUploads = 5;
  }

  /**
   * Upload multiple images with concurrency control
   */
  async uploadImages(files, folder = "products") {
    const startTime = Date.now();

    try {
      logger.info(
        `Starting upload of ${files.length} images to folder: ${folder}`
      );

      const uploadPromises = files.map((file, index) =>
        this.uploadSingleImage(file, folder, index)
      );

      // Control concurrency
      const results = [];
      for (
        let i = 0;
        i < uploadPromises.length;
        i += this.maxConcurrentUploads
      ) {
        const chunk = uploadPromises.slice(i, i + this.maxConcurrentUploads);
        const chunkResults = await Promise.all(chunk);
        results.push(...chunkResults);
      }

      const duration = Date.now() - startTime;
      logger.cloudinaryLog("upload", files.length, duration);

      logger.info(`Upload completed: ${files.length} files in ${duration}ms`);
      return results;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error("Cloudinary upload batch failed", {
        error: error.message,
        fileCount: files.length,
        folder,
        duration: `${duration}ms`,
      });
      throw new CloudinaryError("Failed to upload images");
    }
  }

  /**
   * Upload single image with optimized settings
   */
  async uploadSingleImage(file, folder, index = 0) {
    const startTime = Date.now();

    try {
      const timestamp = Date.now();
      const publicId = `${folder}/${timestamp}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      logger.debug(`Uploading file ${index + 1}: ${file.originalname}`);

      const result = await cloudinary.uploader.upload(
        file.path || file.buffer,
        {
          folder,
          public_id: publicId,
          resource_type: "auto",
          transformation: [
            { width: 1200, height: 1200, crop: "limit" },
            { quality: "auto:good" },
            { format: "webp" },
          ],
          eager: [
            { width: 800, height: 800, crop: "limit" },
            { width: 400, height: 400, crop: "limit" },
          ],
        }
      );

      const duration = Date.now() - startTime;
      logger.debug(`File uploaded in ${duration}ms: ${result.public_id}`);

      return {
        url: result.secure_url,
        publicId: result.public_id,
        alt: file.originalname || "Product image",
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes,
        thumbnail: result.eager?.[0]?.secure_url,
        small: result.eager?.[1]?.secure_url,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error("Cloudinary single upload failed", {
        error: error.message,
        fileName: file.originalname,
        folder,
        duration: `${duration}ms`,
      });
      throw new CloudinaryError(`Failed to upload image: ${file.originalname}`);
    }
  }

  /**
   * Delete images in batch
   */
  async deleteImages(publicIds) {
    const startTime = Date.now();

    try {
      if (!publicIds.length) {
        logger.debug("No images to delete from Cloudinary");
        return;
      }

      logger.info(`Deleting ${publicIds.length} images from Cloudinary`);

      // Split into chunks for batch deletion
      const chunkSize = 100;
      const chunks = [];

      for (let i = 0; i < publicIds.length; i += chunkSize) {
        chunks.push(publicIds.slice(i, i + chunkSize));
      }

      logger.debug(`Split into ${chunks.length} chunks for deletion`);

      const deletePromises = chunks.map((chunk) =>
        cloudinary.api.delete_resources(chunk, {
          resource_type: "image",
          type: "upload",
        })
      );

      await Promise.all(deletePromises);

      const duration = Date.now() - startTime;
      logger.cloudinaryLog("delete", publicIds.length, duration);

      logger.info(`Deleted ${publicIds.length} images in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error("Cloudinary delete batch failed", {
        error: error.message,
        imageCount: publicIds.length,
        duration: `${duration}ms`,
      });
      throw new CloudinaryError("Failed to delete images");
    }
  }

  /**
   * Extract public ID from Cloudinary URL
   */
  extractPublicId(url) {
    try {
      const matches = url.match(
        /\/upload\/(?:v\d+\/)?(.+?)\.(?:jpg|jpeg|png|webp)/i
      );
      return matches ? matches[1] : null;
    } catch (error) {
      logger.warn("Failed to extract public ID from URL", {
        url,
        error: error.message,
      });
      return null;
    }
  }
}

module.exports = new CloudinaryService();
