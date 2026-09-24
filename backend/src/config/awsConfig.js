require('dotenv').config();

module.exports = {
  s3: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_S3_REGION || 'us-east-1',
    bucket: process.env.AWS_S3_BUCKET || 'gram-swasthya-files',
    endpoint: process.env.AWS_S3_ENDPOINT,
    forcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === 'true',
  },

  presigned: {
    uploadExpiry: 3600,
    downloadExpiry: 3600,
    previewExpiry: 1800,
  },

  thumbnail: {
    enabled: process.env.THUMBNAIL_ENABLED !== 'false',
    maxWidth: 400,
    maxHeight: 400,
    quality: 80,
  },

  ocr: {
    enabled: process.env.OCR_ENABLED === 'true',
    languages: ['eng', 'hin', 'tel', 'tam', 'mar'],
  },
};
