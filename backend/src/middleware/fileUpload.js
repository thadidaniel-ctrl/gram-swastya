const multer = require('multer');
const config = require('../config/awsConfig');
const logger = require('../utils/logger');

const MAX_FILE_SIZE = config.upload.maxFileSize;
const ALLOWED_MIME_TYPES = config.upload.allowedMimeTypes;
const ALLOWED_EXTENSIONS = config.upload.allowedExtensions;

function fileFilter(req, file, cb) {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    logger.warn('File rejected: invalid MIME type', {
      mimetype: file.mimetype,
      originalname: file.originalname,
    });
    return cb(
      new Error(`File type not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`),
      false
    );
  }

  // Check extension
  const ext = file.originalname.split('.').pop().toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    logger.warn('File rejected: invalid extension', {
      extension: ext,
      originalname: file.originalname,
    });
    return cb(
      new Error(`File extension not allowed. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`),
      false
    );
  }

  cb(null, true);
}

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10, // max 10 files at once
  },
});

// Single file upload
const uploadSingle = upload.single('file');

// Multiple files upload
const uploadMultiple = upload.array('files', 10);

// Error handler for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum 10 files at once.',
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field.',
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
    });
  }

  if (err.message && err.message.includes('not allowed')) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  next(err);
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  handleMulterError,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
};
