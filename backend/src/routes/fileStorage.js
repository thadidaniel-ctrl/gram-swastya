const express = require('express');
const router = express.Router();
const fileStorageController = require('../controllers/fileStorageController');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadMultiple, handleMulterError } = require('../middleware/fileUpload');
const { validate } = require('../middleware/validate');
const { body, param, query } = require('express-validator');

router.use(authenticate, authorize('patient'));

// Validation
const uploadValidation = [
  body('category')
    .optional()
    .isIn([
      'Lab Report',
      'Prescription',
      'Medical Image',
      'Hospital Record',
      'Vaccination',
      'Insurance',
      'Other',
    ])
    .withMessage('Invalid category'),
  body('tags').optional().isString().withMessage('Tags must be comma-separated string'),
  body('folderId').optional().isMongoId().withMessage('Invalid folder ID'),
  body('description')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Description too long'),
];

const shareValidation = [
  body('doctorId').isMongoId().withMessage('Valid doctor ID required'),
  body('expiresIn')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('expiresIn must be 1-365 days'),
  body('expiresAt').optional().isISO8601().withMessage('Invalid expiry date (ISO 8601)'),
  body('message')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Message too long (max 1000 characters)'),
];

const updateValidation = [
  body('fileName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Invalid file name'),
  body('description')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Description too long'),
  body('category')
    .optional()
    .isIn([
      'Lab Report',
      'Prescription',
      'Medical Image',
      'Hospital Record',
      'Vaccination',
      'Insurance',
      'Other',
    ])
    .withMessage('Invalid category'),
  body('tags').optional().isString().withMessage('Tags must be comma-separated string'),
  body('folderId').optional().isMongoId().withMessage('Invalid folder ID'),
];

const listValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Invalid page'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Invalid limit (max 50)'),
  query('folderId').optional().isMongoId().withMessage('Invalid folder ID'),
  query('category')
    .optional()
    .isIn([
      'Lab Report',
      'Prescription',
      'Medical Image',
      'Hospital Record',
      'Vaccination',
      'Insurance',
      'Other',
    ])
    .withMessage('Invalid category'),
  query('search').optional().isString().withMessage('Invalid search'),
  query('tags').optional().isString().withMessage('Invalid tags'),
  query('sortBy')
    .optional()
    .isIn(['uploadedAt', 'fileName', 'fileSize', 'category'])
    .withMessage('Invalid sortBy'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Invalid sortOrder'),
  query('includeDeleted').optional().isBoolean().withMessage('includeDeleted must be boolean'),
];

const idParam = [param('id').isMongoId().withMessage('Invalid file ID')];

const doctorIdParam = [param('doctorId').isMongoId().withMessage('Invalid doctor ID')];

const bulkDeleteValidation = [
  body('fileIds').isArray({ min: 1 }).withMessage('fileIds must be a non-empty array'),
  body('fileIds.*').isMongoId().withMessage('Each fileId must be a valid MongoDB ID'),
];

// File Storage Routes

// GET /api/file-storage - List files
router.get('/', listValidation, validate, fileStorageController.getFiles);

// GET /api/file-storage/stats - Storage stats
router.get('/stats', fileStorageController.getStats);

// POST /api/file-storage/upload - Upload files
router.post(
  '/upload',
  uploadMultiple,
  handleMulterError,
  uploadValidation,
  validate,
  fileStorageController.uploadFiles
);

// GET /api/file-storage/:id/download - Download URL
router.get('/:id/download', idParam, validate, fileStorageController.getDownloadUrl);

// GET /api/file-storage/:id/preview - Preview URL
router.get('/:id/preview', idParam, validate, fileStorageController.getPreviewUrl);

// PUT /api/file-storage/:id - Update file metadata
router.put('/:id', idParam, validate, updateValidation, validate, fileStorageController.updateFile);

// DELETE /api/file-storage/:id - Delete file
router.delete('/:id', idParam, validate, fileStorageController.deleteFile);

// POST /api/file-storage/:id/restore - Restore file from trash
router.post('/:id/restore', idParam, validate, fileStorageController.restoreFile);

// POST /api/file-storage/bulk-delete - Bulk delete files
router.post('/bulk-delete', bulkDeleteValidation, validate, fileStorageController.bulkDeleteFiles);

// GET /api/file-storage/activity - Activity timeline
router.get('/activity', fileStorageController.getActivity);

// POST /api/file-storage/:id/share - Share with doctor
router.post(
  '/:id/share',
  idParam,
  validate,
  shareValidation,
  validate,
  fileStorageController.shareFile
);

// DELETE /api/file-storage/:id/share/:doctorId - Unshare
router.delete(
  '/:id/share/:doctorId',
  idParam,
  doctorIdParam,
  validate,
  fileStorageController.unshareFile
);

// POST /api/file-storage/:id/version - Create new version
router.post(
  '/:id/version',
  idParam,
  validate,
  uploadMultiple,
  handleMulterError,
  fileStorageController.createVersion
);

module.exports = router;
