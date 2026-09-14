const mongoose = require('mongoose');
const { Notification, Medicine } = require('../models');
const { sendTestReminder } = require('../services/medicineReminder');

function getPatientId(req) {
  return req.user?._id || req.user?.id;
}

// GET /api/patient/reminders/preferences
exports.getPreferences = async (req, res, next) => {
  try {
    const patient = req.user;
    res.json({
      success: true,
      data: {
        enableReminders: patient.reminderPreferences?.enableReminders ?? true,
        enablePushNotifications: patient.reminderPreferences?.enablePushNotifications ?? true,
        dontNotifyBefore: patient.reminderPreferences?.dontNotifyBefore ?? '22:00',
      },
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/patient/reminders/preferences
exports.updatePreferences = async (req, res, next) => {
  try {
    const { enableReminders, enablePushNotifications, dontNotifyBefore } = req.body;

    const updates = {};
    if (typeof enableReminders === 'boolean')
      updates['reminderPreferences.enableReminders'] = enableReminders;
    if (typeof enablePushNotifications === 'boolean')
      updates['reminderPreferences.enablePushNotifications'] = enablePushNotifications;
    if (dontNotifyBefore) updates['reminderPreferences.dontNotifyBefore'] = dontNotifyBefore;

    const updated = await mongoose
      .model('Patient')
      .findByIdAndUpdate(getPatientId(req), { $set: updates }, { new: true });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    res.json({
      success: true,
      data: {
        enableReminders: updated.reminderPreferences?.enableReminders ?? true,
        enablePushNotifications: updated.reminderPreferences?.enablePushNotifications ?? true,
        dontNotifyBefore: updated.reminderPreferences?.dontNotifyBefore ?? '22:00',
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/patient/notifications
exports.getNotifications = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { type, unread } = req.query;

    const filter = { patient: getPatientId(req) };
    if (type) filter.type = type;
    if (unread === 'true') filter.read = false;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Notification.countDocuments(filter),
      Notification.countDocuments({ patient: getPatientId(req), read: false }),
    ]);

    res.json({
      success: true,
      data: notifications,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        unreadCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/patient/notifications/:id/read
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, patient: getPatientId(req) },
      { $set: { read: true } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};

// PUT /api/patient/notifications/mark-all-read
exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { patient: getPatientId(req), read: false },
      { $set: { read: true } }
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// POST /api/patient/notifications/:id/acknowledge  (body: {status: 'taken'|'missed'|'skipped'|'snoozed'})
exports.acknowledge = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['taken', 'missed', 'skipped', 'snoozed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, patient: getPatientId(req) },
      {
        $set: {
          read: true,
          'response.acknowledged': true,
          'response.acknowledgedAt': new Date(),
          'response.status': status,
        },
      },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    // Also log the dose in the medicine's doseLogs
    if (notification.medicine && status === 'taken') {
      const medicine = await Medicine.findById(notification.medicine);
      if (medicine) {
        medicine.doseLogs.push({
          scheduledTime: new Date(notification.deliveredAt),
          takenTime: new Date(),
          status: 'taken',
          notes: notification.data?.doseTime ? `dose ${notification.data.doseTime}` : '',
        });
        await medicine.save();
      }
    }

    res.json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};

// POST /api/patient/notifications/acknowledge-by-medicine (body: {medicineId, status})
exports.acknowledgeByMedicine = async (req, res, next) => {
  try {
    const { medicineId, status } = req.body;

    if (!medicineId || !['taken', 'missed', 'skipped', 'snoozed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid request' });
    }

    await Notification.findOneAndUpdate(
      {
        patient: getPatientId(req),
        medicine: medicineId,
        type: 'medicine_reminder',
        read: false,
      },
      {
        $set: {
          read: true,
          'response.acknowledged': true,
          'response.acknowledgedAt': new Date(),
          'response.status': status,
        },
      },
      { new: true, sort: { createdAt: -1 } }
    );

    if (status === 'taken') {
      const medicine = await Medicine.findById(medicineId);
      if (medicine) {
        medicine.doseLogs.push({
          scheduledTime: new Date(),
          takenTime: new Date(),
          status: 'taken',
        });
        await medicine.save();
      }
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// POST /api/patient/reminders/test  (manual test endpoint)
exports.sendTest = async (req, res, next) => {
  try {
    const medicines = await Medicine.find({
      patient: getPatientId(req),
      isActive: true,
    });

    if (medicines.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'No active medicines to remind',
      });
    }

    const results = await sendTestReminder(medicines);
    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
};

// POST /api/patient/webpush-token - Save Web Push subscription
exports.saveWebPushSubscription = async (req, res, next) => {
  try {
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription data: endpoint and keys (p256dh, auth) required',
      });
    }

    const updated = await mongoose.model('Patient').findByIdAndUpdate(
      getPatientId(req),
      {
        $set: {
          webPushSubscription: { endpoint, keys },
          fcmToken: null, // Clear FCM token when using Web Push
        },
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    res.json({ success: true, message: 'Web Push subscription saved' });
  } catch (error) {
    next(error);
  }
};
