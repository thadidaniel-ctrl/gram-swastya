const express = require('express');
const router = express.Router();
const patientAuthController = require('../controllers/patientAuthController');
const {
  sendOTPValidation,
  verifyOTPValidation,
  registerValidation,
} = require('../validators/patientValidator');
const { validate } = require('../middleware/validate');

router.post('/send-otp', sendOTPValidation, validate, patientAuthController.sendOTP);

router.post('/verify-otp', verifyOTPValidation, validate, patientAuthController.verifyOTP);

router.post('/register', registerValidation, validate, patientAuthController.register);

router.post('/refresh-token', patientAuthController.refreshToken);

router.post('/logout', patientAuthController.logout);

module.exports = router;
