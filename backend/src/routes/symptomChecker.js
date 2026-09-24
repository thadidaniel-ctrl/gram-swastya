const express = require('express');
const router = express.Router();
const symptomCheckerController = require('../controllers/symptomCheckerController');
const { authenticate } = require('../middleware/auth');
const { sanitize } = require('../middleware/validate');

router.use(authenticate);
router.use(sanitize);

// POST /api/symptom-checker/analyze - Analyze symptoms (Patient)
router.post('/analyze', symptomCheckerController.analyze);

module.exports = router;
