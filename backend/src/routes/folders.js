const express = require('express');
const router = express.Router();
const folderController = require('../controllers/folderController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { body, param, query } = require('express-validator');

router.use(authenticate, authorize('patient'));

// Validation
const createFolderValidation = [
  body('folderName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Folder name is required (1-100 characters)'),
  body('parentFolderId').optional().isMongoId().withMessage('Invalid parent folder ID'),
  body('description')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Description too long'),
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Color must be a valid hex color'),
];

const updateFolderValidation = [
  body('folderName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Folder name must be 1-100 characters'),
  body('description')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Description too long'),
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Color must be a valid hex color'),
  body('parentFolderId').optional().isMongoId().withMessage('Invalid parent folder ID'),
];

const listValidation = [
  query('tree').optional().isIn(['true', 'false']).withMessage('tree must be true or false'),
  query('parent')
    .optional()
    .custom(value => value === 'root' || /^[0-9a-fA-F]{24}$/.test(value))
    .withMessage('Invalid parent ID'),
];

const idParam = [param('id').isMongoId().withMessage('Invalid folder ID')];

const folderFilesValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Invalid page'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Invalid limit'),
];

// Folder Routes

// GET /api/folders - Get all folders (tree or flat)
router.get('/', listValidation, validate, folderController.getFolders);

// GET /api/folders/list - Get folders flat list (alias for reference compatibility)
router.get('/list', listValidation, validate, folderController.getFolders);

// POST /api/folders/initialize - Create default system folders for a patient
router.post('/initialize', folderController.initializeFolders);

// POST /api/folders - Create folder
router.post('/', createFolderValidation, validate, folderController.createFolder);

// PUT /api/folders/:id - Update folder
router.put(
  '/:id',
  idParam,
  validate,
  updateFolderValidation,
  validate,
  folderController.updateFolder
);

// DELETE /api/folders/:id - Delete folder
router.delete('/:id', idParam, validate, folderController.deleteFolder);

// GET /api/folders/:id/files - Get files in folder
router.get('/:id/files', idParam, folderFilesValidation, validate, folderController.getFolderFiles);

module.exports = router;
