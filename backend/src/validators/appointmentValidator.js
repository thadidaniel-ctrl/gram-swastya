const { body } = require('express-validator');

const bookAppointmentValidation = [
  body('doctor')
    .notEmpty()
    .withMessage('doctor is required')
    .isMongoId()
    .withMessage('Invalid doctor id'),
  body('scheduledAt')
    .notEmpty()
    .withMessage('scheduledAt is required')
    .isISO8601()
    .withMessage('scheduledAt must be a valid ISO date'),
  body('duration')
    .optional()
    .isInt({ min: 10, max: 120 })
    .withMessage('duration must be between 10 and 120 minutes'),
  body('type')
    .optional()
    .isIn(['video', 'audio', 'in_person'])
    .withMessage('Invalid consultation type'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('notes must be at most 500 characters'),
  body('paymentMethod')
    .optional()
    .isIn(['upi', 'net_banking', 'cash', 'insurance'])
    .withMessage('Invalid payment method'),
];

module.exports = { bookAppointmentValidation };
