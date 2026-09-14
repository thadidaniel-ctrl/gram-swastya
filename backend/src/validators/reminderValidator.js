const { body } = require('express-validator');

const updateReminderPreferencesValidation = [
  body('enableReminders').optional().isBoolean().withMessage('enableReminders must be a boolean'),
  body('enablePushNotifications')
    .optional()
    .isBoolean()
    .withMessage('enablePushNotifications must be a boolean'),
  body('dontNotifyBefore')
    .optional()
    .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
    .withMessage('dontNotifyBefore must be in HH:mm format'),
];

const acknowledgeNotificationValidation = [
  body('status')
    .notEmpty()
    .isIn(['taken', 'missed', 'skipped', 'snoozed'])
    .withMessage('status must be taken, missed, skipped or snoozed'),
];

const acknowledgeByMedicineValidation = [
  body('medicineId').isMongoId().withMessage('Invalid medicineId'),
  body('status')
    .notEmpty()
    .isIn(['taken', 'missed', 'skipped', 'snoozed'])
    .withMessage('status must be taken, missed, skipped or snoozed'),
];

module.exports = {
  updateReminderPreferencesValidation,
  acknowledgeNotificationValidation,
  acknowledgeByMedicineValidation,
};
