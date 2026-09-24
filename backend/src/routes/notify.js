const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, sanitize } = require('../middleware/validate');
const { body } = require('express-validator');

router.use(authenticate, authorize('doctor'));
router.use(sanitize);

const sendNotificationValidation = [
  body('patientId').isMongoId().withMessage('Valid patientId required'),
  body('title').isString().notEmpty().withMessage('Title required'),
  body('body').isString().notEmpty().withMessage('Body required'),
  body('data').optional().isObject().withMessage('Data must be an object'),
  body('type').optional().isString().withMessage('Type must be a string'),
];

const bulkNotificationValidation = [
  body('patientIds').isArray({ min: 1 }).withMessage('patientIds array required'),
  body('patientIds.*').isMongoId().withMessage('Each patientId must be valid'),
  body('title').isString().notEmpty().withMessage('Title required'),
  body('body').isString().notEmpty().withMessage('Body required'),
  body('data').optional().isObject().withMessage('Data must be an object'),
  body('type').optional().isString().withMessage('Type must be a string'),
];

const testNotificationValidation = [
  body('patientId').isMongoId().withMessage('Valid patientId required'),
];

// POST /api/notify/send - Send push notification to a patient
router.post('/send', sendNotificationValidation, validate, notificationController.sendNotification);

// POST /api/notify/bulk - Send push notification to multiple patients
router.post(
  '/bulk',
  bulkNotificationValidation,
  validate,
  notificationController.sendBulkNotification
);

// POST /api/notify/test - Send test notification to a patient
router.post('/test', testNotificationValidation, validate, notificationController.testNotification);

module.exports = router;
