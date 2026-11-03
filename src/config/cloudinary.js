const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload buffer to Cloudinary
 * @param {Buffer} buffer
 * @param {Object} options
 * @returns {Promise<Object>}
 */
const uploadBuffer = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "auto",
        ...options,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );
    stream.end(buffer);
  });
};

/**
 * Delete file by public_id from Cloudinary
 * @param {string} publicId
 * @param {Object} options
 * @returns {Promise<Object>}
 */
const deleteFile = async (publicId, options = {}) => {
  return cloudinary.uploader.destroy(publicId, options);
};

module.exports = {
  cloudinary,
  uploadBuffer,
  deleteFile,
};

