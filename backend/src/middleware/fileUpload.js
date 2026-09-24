const multer = require('multer');
const config = require('../config');
const logger = require('../utils/logger');

const MAX_FILE_SIZE = config.upload.maxFileSize;
const ALLOWED_MIME_TYPES = config.upload.allowedMimeTypes;
const ALLOWED_EXTENSIONS = config.upload.allowedExtensions;

// Magic bytes signatures for file type verification
const MAGIC_BYTES = {
  'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  'image/webp': [0x52, 0x49, 0x46, 0x46], // RIFF (need to check WEBP at offset 8)
  'application/msword': [0xd0, 0xcf, 0x11, 0xe0], // DOC
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    0x50, 0x4b, 0x03, 0x04,
  ], // DOCX (ZIP)
  'application/vnd.ms-excel': [0xd0, 0xcf, 0x11, 0xe0], // XLS
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [0x50, 0x4b, 0x03, 0x04], // XLSX (ZIP)
  'application/zip': [0x50, 0x4b, 0x03, 0x04],
};

function checkMagicBytes(buffer, mimeType) {
  const signatures = MAGIC_BYTES[mimeType];
  if (!signatures) return true; // Allow if no signature defined

  if (mimeType === 'image/webp') {
    // WebP: RIFF at offset 0, WEBP at offset 8
    return (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    );
  }

  // Check if buffer starts with the expected magic bytes
  if (buffer.length < signatures.length) return false;
  return signatures.every((byte, i) => buffer[i] === byte);
}

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

// Verify file content after upload (magic bytes check)
const verifyFileContent = (req, res, next) => {
  const files = req.files || (req.file ? [req.file] : []);
  if (!files.length) return next();

  for (const file of files) {
    if (!checkMagicBytes(file.buffer, file.mimetype)) {
      logger.warn('File rejected: magic bytes mismatch', {
        mimetype: file.mimetype,
        originalname: file.originalname,
      });
      return res.status(400).json({
        success: false,
        message: `File content does not match declared type: ${file.originalname}`,
      });
    }
  }
  next();
};

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
  verifyFileContent,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
};
