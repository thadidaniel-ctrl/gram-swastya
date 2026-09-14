require('dotenv').config();

module.exports = {
  s3: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_S3_REGION || 'us-east-1',
    bucket: process.env.AWS_S3_BUCKET || 'gram-swasthya-files',
    endpoint: process.env.AWS_S3_ENDPOINT, // for S3-compatible (MinIO, etc.)
    forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === 'true',
  },

  // File upload limits
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/tiff',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/zip',
    ],
    allowedExtensions: [
      'pdf',
      'jpg',
      'jpeg',
      'png',
      'webp',
      'tiff',
      'tif',
      'doc',
      'docx',
      'txt',
      'zip',
    ],
  },

  // Presigned URL expiry
  presigned: {
    uploadExpiry: 3600, // 1 hour
    downloadExpiry: 3600, // 1 hour
    previewExpiry: 1800, // 30 min
  },

  // Thumbnail generation
  thumbnail: {
    enabled: process.env.THUMBNAIL_ENABLED !== 'false',
    maxWidth: 400,
    maxHeight: 400,
    quality: 80,
  },

  // OCR
  ocr: {
    enabled: process.env.OCR_ENABLED === 'true',
    languages: ['eng', 'hin', 'tel', 'tam', 'mar'],
  },
};
