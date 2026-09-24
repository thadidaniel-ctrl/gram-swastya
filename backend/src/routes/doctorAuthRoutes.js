const express = require('express');
const router = express.Router();
const doctorAuthController = require('../controllers/doctorAuthController');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');

const sendOTPValidation = [
  body('phone')
    .optional()
    .isString()
    .isLength({ min: 10, max: 15 })
    .withMessage('Invalid phone number'),
  body('email').optional().isEmail().withMessage('Invalid email'),
  body('purpose')
    .optional()
    .isIn(['login', 'registration', 'password_reset'])
    .withMessage('Invalid purpose'),
];

const verifyOTPValidation = [
  body('tempToken').isString().notEmpty().withMessage('tempToken is required'),
  body('otp').isString().isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
];

router.post('/send-otp', sendOTPValidation, validate, doctorAuthController.sendOTP);

router.post('/verify-otp', verifyOTPValidation, validate, doctorAuthController.verifyOTP);

router.post('/refresh-token', doctorAuthController.refreshToken);

router.post('/logout', doctorAuthController.logout);

module.exports = router;
