const express = require('express');
const router = express.Router();
const doctorSharedFilesController = require('../controllers/doctorSharedFilesController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, sanitize } = require('../middleware/validate');
const { param, query } = require('express-validator');

router.use(authenticate, authorize('doctor'));
router.use(sanitize);

const listValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Invalid page'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Invalid limit (max 100)'),
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
];

const idParam = [param('id').isMongoId().withMessage('Invalid file ID')];

// GET /api/doctor/shared-files - List files shared with this doctor
router.get('/', listValidation, validate, doctorSharedFilesController.listSharedFiles);

// GET /api/doctor/shared-files/:id/preview - Presigned preview URL
router.get('/:id/preview', idParam, validate, doctorSharedFilesController.getPreviewUrl);

// GET /api/doctor/shared-files/:id/download - Presigned download URL
router.get('/:id/download', idParam, validate, doctorSharedFilesController.getDownloadUrl);

module.exports = router;
