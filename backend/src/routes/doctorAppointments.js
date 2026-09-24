const express = require('express');
const router = express.Router();
const doctorAppointmentsController = require('../controllers/doctorAppointmentsController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, sanitize } = require('../middleware/validate');
const { query, param, body } = require('express-validator');

router.use(authenticate, authorize('doctor'));
router.use(sanitize);

const appointmentListValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
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
  query('type')
    .optional()
    .isIn(['video', 'audio', 'in_person'])
    .withMessage('Invalid appointment type'),
  query('startDate').optional().isISO8601().withMessage('Start date must be ISO 8601'),
  query('endDate').optional().isISO8601().withMessage('End date must be ISO 8601'),
  query('search').optional().isString().trim().withMessage('Search must be a string'),
];

const appointmentIdValidation = [
  param('appointmentId').isMongoId().withMessage('Invalid appointment ID'),
];

const statusUpdateValidation = [
  param('appointmentId').isMongoId().withMessage('Invalid appointment ID'),
  body('status')
    .isIn(['confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'])
    .withMessage('Invalid status'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
  body('cancellationReason')
    .optional()
    .isString()
    .withMessage('Cancellation reason must be a string'),
];

// GET /api/doctor/appointments - List doctor's appointments
router.get(
  '/appointments',
  appointmentListValidation,
  validate,
  doctorAppointmentsController.getAppointments
);

// GET /api/doctor/appointments/upcoming - Get upcoming appointments (for dashboard)
router.get('/appointments/upcoming', doctorAppointmentsController.getUpcomingAppointments);

// GET /api/doctor/appointments/:appointmentId - Get appointment details
router.get(
  '/appointments/:appointmentId',
  appointmentIdValidation,
  validate,
  doctorAppointmentsController.getAppointmentDetail
);

// PATCH /api/doctor/appointments/:appointmentId/status - Update appointment status
router.patch(
  '/appointments/:appointmentId/status',
  statusUpdateValidation,
  validate,
  doctorAppointmentsController.updateAppointmentStatus
);

module.exports = router;
