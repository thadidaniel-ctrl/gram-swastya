const express = require('express');
const router = express.Router();
const patientMedicineController = require('../controllers/patientMedicineController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, sanitize } = require('../middleware/validate');
const { body, param } = require('express-validator');

router.use(authenticate, authorize('patient'));
router.use(sanitize);

const medicineFieldsValidation = [
  body('name').isString().trim().notEmpty().withMessage('Medicine name is required'),
  body('genericName').optional().isString().trim().withMessage('Generic name must be a string'),
  body('strength').optional().isString().trim().withMessage('Strength must be a string'),
  body('form')
    .optional()
    .isIn(['tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'inhaler', 'patch'])
    .withMessage('Invalid medicine form'),
  body('frequency')
    .optional()
    .isIn(['daily', 'weekly', 'monthly', 'custom', 'as_needed'])
    .withMessage('Invalid frequency'),
  body('doseTimes').optional().isArray().withMessage('doseTimes must be an array'),
  body('startDate').optional().isISO8601().withMessage('Invalid start date'),
  body('endDate').optional().isISO8601().withMessage('Invalid end date'),
  body('totalQuantity').optional().isNumeric().withMessage('Total quantity must be a number'),
  body('remainingQuantity')
    .optional()
    .isNumeric()
    .withMessage('Remaining quantity must be a number'),
  body('lowStockThreshold')
    .optional()
    .isNumeric()
    .withMessage('Low stock threshold must be a number'),
];

const idValidation = [param('id').isMongoId().withMessage('Invalid medicine id')];

// GET /api/patient/medicines - List patient's medicines
router.get('/', patientMedicineController.listMedicines);

// POST /api/patient/medicines - Create a medicine
router.post('/', medicineFieldsValidation, validate, patientMedicineController.createMedicine);

// PUT /api/patient/medicines/:id - Update a medicine
router.put(
  '/:id',
  idValidation,
  validate,
  medicineFieldsValidation,
  validate,
  patientMedicineController.updateMedicine
);

// DELETE /api/patient/medicines/:id - Delete a medicine
router.delete('/:id', idValidation, validate, patientMedicineController.deleteMedicine);

module.exports = router;
