const express = require('express');
const router = express.Router();
const patientProfileController = require('../controllers/patientProfileController');
const { updateProfileValidation } = require('../validators/patientValidator');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('patient'));

router.get('/profile', patientProfileController.getProfile);

router.put('/profile', updateProfileValidation, validate, patientProfileController.updateProfile);

router.get('/health-history', patientProfileController.getHealthHistory);

router.post('/allergies', patientProfileController.addAllergy);

router.delete('/allergies/:allergen', patientProfileController.removeAllergy);

router.put('/fcm-token', patientProfileController.updateFCMToken);

module.exports = router;
