const { body, param, query } = require('express-validator');

const sendOTPValidation = [
  body('phone')
    .optional()
    .matches(/^\+?[1-9]\d{9,14}$/)
    .withMessage('Invalid phone number format'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Invalid email address'),
  body('purpose')
    .optional()
    .isIn(['registration', 'login', 'password_reset', 'phone_verification', 'email_verification'])
    .withMessage('Invalid purpose'),
  body().custom((value, { req }) => {
    if (!req.body.phone && !req.body.email) {
      throw new Error('Either phone or email is required');
    }
    return true;
  }),
];

const verifyOTPValidation = [
  body('tempToken').notEmpty().withMessage('tempToken is required'),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('OTP must be 6 digits'),
];

const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be 1-100 characters'),
  body('age').optional().isInt({ min: 1, max: 120 }).withMessage('Age must be between 1 and 120'),
  body('gender').optional().isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender'),
  body('bloodType')
    .optional()
    .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
    .withMessage('Invalid blood type'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Invalid email address'),
  body('address.village').optional().trim().isLength({ max: 100 }),
  body('address.district').optional().trim().isLength({ max: 100 }),
  body('address.state').optional().trim().isLength({ max: 100 }),
  body('address.pincode')
    .optional()
    .matches(/^\d{6}$/)
    .withMessage('Invalid pincode'),
  body('emergencyContact.name').optional().trim().isLength({ max: 100 }),
  body('emergencyContact.phone')
    .optional()
    .matches(/^\+?[1-9]\d{9,14}$/)
    .withMessage('Invalid phone number'),
  body('emergencyContact.relation').optional().trim().isLength({ max: 50 }),
  body('preferredLanguage')
    .optional()
    .isIn(['en', 'hi', 'te', 'ta', 'mr'])
    .withMessage('Invalid language'),
];

const registerValidation = [
  body('phone')
    .optional()
    .matches(/^\+?[1-9]\d{9,14}$/)
    .withMessage('Valid phone number required'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Invalid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain number'),
  body('name').notEmpty().trim().isLength({ min: 1, max: 100 }).withMessage('Name required'),
  body('age').notEmpty().isInt({ min: 1, max: 120 }).withMessage('Age required'),
  body('gender').notEmpty().isIn(['Male', 'Female', 'Other']).withMessage('Gender required'),
  body('bloodType')
    .optional()
    .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
    .withMessage('Invalid blood type'),
  body('address.village').optional().trim(),
  body('address.district').optional().trim(),
  body('address.state').optional().trim(),
  body('address.pincode')
    .optional()
    .matches(/^\d{6}$/),
  body('emergencyContact.name').optional().trim(),
  body('emergencyContact.phone')
    .optional()
    .matches(/^\+?[1-9]\d{9,14}$/),
  body('emergencyContact.relation').optional().trim(),
];

module.exports = {
  sendOTPValidation,
  verifyOTPValidation,
  updateProfileValidation,
  registerValidation,
};
