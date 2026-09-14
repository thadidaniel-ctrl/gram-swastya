const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  updateReminderPreferencesValidation,
  acknowledgeNotificationValidation,
  acknowledgeByMedicineValidation,
} = require('../validators/reminderValidator');

router.use(authenticate, authorize('patient'));

// Reminder preferences
router.get('/reminders/preferences', notificationController.getPreferences);
router.put(
  '/reminders/preferences',
  updateReminderPreferencesValidation,
  validate,
  notificationController.updatePreferences
);
router.post('/reminders/test', notificationController.sendTest);

// Notifications
router.get('/notifications', notificationController.getNotifications);
router.put('/notifications/mark-all-read', notificationController.markAllAsRead);
router.put('/notifications/:id/read', notificationController.markAsRead);
router.post(
  '/notifications/:id/acknowledge',
  acknowledgeNotificationValidation,
  validate,
  notificationController.acknowledge
);
router.post(
  '/notifications/acknowledge-by-medicine',
  acknowledgeByMedicineValidation,
  validate,
  notificationController.acknowledgeByMedicine
);

// Web Push subscription
router.post('/webpush-token', notificationController.saveWebPushSubscription);

module.exports = router;
