const express = require('express');
const router = express.Router();
const doctorPatientsController = require('../controllers/doctorPatientsController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, sanitize } = require('../middleware/validate');
const { query, param } = require('express-validator');

router.use(authenticate, authorize('doctor'));
router.use(sanitize);

const patientListValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('search').optional().isString().trim().withMessage('Search must be a string'),
  query('status')
    .optional()
    .isIn([
      'scheduled',
      'confirmed',
      'in_progress',
      'completed',
      'cancelled',
      'no_show',
      'rescheduled',
    ])
    .withMessage('Invalid status'),
];

const patientIdValidation = [param('patientId').isMongoId().withMessage('Invalid patient ID')];

// GET /api/doctor/patients - List patients assigned to this doctor
router.get('/patients', patientListValidation, validate, doctorPatientsController.getPatients);

// GET /api/doctor/patients/:patientId - Get patient details
router.get(
  '/patients/:patientId',
  patientIdValidation,
  validate,
  doctorPatientsController.getPatientDetail
);

module.exports = router;
