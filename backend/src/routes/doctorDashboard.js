const express = require('express');
const router = express.Router();
const doctorDashboardController = require('../controllers/doctorDashboardController');
const { authenticate, authorize } = require('../middleware/auth');
const { sanitize } = require('../middleware/validate');

router.use(authenticate, authorize('doctor'));
router.use(sanitize);

// GET /api/doctor/dashboard - Doctor overview (used for session restore too)
router.get('/dashboard', doctorDashboardController.getDashboard);

// GET /api/doctor/dashboard/stats - Quick stats for polling
router.get('/dashboard/stats', doctorDashboardController.getQuickStats);

module.exports = router;
