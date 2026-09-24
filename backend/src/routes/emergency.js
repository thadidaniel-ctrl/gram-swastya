const express = require('express');
const router = express.Router();
const emergencyController = require('../controllers/emergencyController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, sanitize } = require('../middleware/validate');
const { body, param } = require('express-validator');

router.use(authenticate);
router.use(sanitize);

const callValidation = [
  body('lat').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
  body('lng').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
  body('address').optional().isString().trim().withMessage('Address must be a string'),
  body('emergencyType')
    .optional()
    .isIn(['cardiac', 'trauma', 'maternal', 'pediatric', 'respiratory', 'stroke', 'general'])
    .withMessage('Invalid emergency type'),
  body('description').optional().isString().withMessage('Description must be a string'),
  body('contactPhone').optional().isMobilePhone().withMessage('Invalid contact phone'),
];

const callIdValidation = [param('callId').isString().notEmpty().withMessage('Call ID required')];

// POST /api/emergency/call - Dispatch ambulance (Patient)
router.post('/call', callValidation, validate, emergencyController.callAmbulance);

// GET /api/emergency/status/:callId - Get real-time call status (Patient)
router.get('/status/:callId', callIdValidation, validate, emergencyController.getCallStatus);

// GET /api/emergency/active - Get patient's active emergency calls
router.get('/active', emergencyController.getActiveCalls);

// Driver endpoints (require driver role)
router.use('/driver', authorize('driver'));

const driverLocationUpdateValidation = [
  param('callId').isString().notEmpty().withMessage('Call ID required'),
  body('lat').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
  body('lng').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
  body('status')
    .optional()
    .isIn([
      'en_route',
      'en_route_pickup',
      'on_scene',
      'en_route_hospital',
      'at_hospital',
      'completed',
    ])
    .withMessage('Invalid status'),
];

// POST /api/emergency/driver/location/:callId - Driver updates location
router.post(
  '/driver/location/:callId',
  driverLocationUpdateValidation,
  validate,
  emergencyController.driverUpdateLocation
);

// POST /api/emergency/driver/accept/:callId - Driver accepts dispatch
router.post(
  '/driver/accept/:callId',
  callIdValidation,
  validate,
  emergencyController.driverAcceptCall
);

module.exports = router;
