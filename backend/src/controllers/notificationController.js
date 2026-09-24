const { Patient, Notification: NotificationModel } = require('../models');
const logger = require('../utils/logger');
const { sendToPatient } = require('../services/webPushService');
const {
  sendNotification: sendFCMNotification,
  sendToToken,
} = require('../services/pushNotificationService');

class NotificationController {
  async sendNotification(req, res) {
    try {
      const { patientId, title, body, data, type } = req.body;

      if (!patientId) {
        return res.status(400).json({
          success: false,
          message: 'patientId is required',
        });
      }

      if (!title || !body) {
        return res.status(400).json({
          success: false,
          message: 'title and body are required',
        });
      }

      const patient = await Patient.findById(patientId)
        .select('fcmToken webPushSubscription name')
        .lean();

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found',
        });
      }

      const payload = {
        title,
        body,
        type: type || 'general',
        data: data || {},
      };

      let result;

      // Try Web Push first (VAPID)
      if (patient.webPushSubscription?.endpoint) {
        result = await sendToPatient(patient, payload);
        if (result.via === 'webpush' && result.status === 'sent') {
          logger.info('Notification sent via Web Push', { patientId });
          return res.json({ success: true, message: 'Notification sent via Web Push', result });
        }
      }

      // Fallback to FCM
      if (patient.fcmToken) {
        result = await sendFCMNotification(patient, payload);
        if (result.status === 'sent') {
          logger.info('Notification sent via FCM', { patientId });
          return res.json({ success: true, message: 'Notification sent via FCM', result });
        }
      }

      logger.warn('No delivery channel available for patient', { patientId });
      return res.json({
        success: false,
        message: 'No push subscription available for patient',
        reason: 'no_subscription',
      });
    } catch (error) {
      logger.error('Send notification error:', error);
      res.status(500).json({ success: false, message: 'Failed to send notification' });
    }
  }

  async sendBulkNotification(req, res) {
    try {
      const { patientIds, title, body, data, type } = req.body;

      if (!patientIds || !Array.isArray(patientIds) || patientIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'patientIds array is required',
        });
      }

      if (!title || !body) {
        return res.status(400).json({
          success: false,
          message: 'title and body are required',
        });
      }

      const payload = {
        title,
        body,
        type: type || 'general',
        data: data || {},
      };

      const patients = await Patient.find({ _id: { $in: patientIds } })
        .select('fcmToken webPushSubscription _id')
        .lean();

      const results = [];

      for (const patient of patients) {
        const patientPayload = { ...payload, data: { ...payload.data, patientId: patient._id } };

        let result;
        if (patient.webPushSubscription?.endpoint) {
          result = await sendToPatient(patient, patientPayload);
        } else if (patient.fcmToken) {
          const { sendToToken } = require('../services/pushNotificationService');
          result = await sendToToken(patient.fcmToken, patientPayload);
        } else {
          result = { status: 'skipped', reason: 'no_subscription' };
        }

        results.push({
          patientId: patient._id,
          ...result,
        });
      }

      res.json({ success: true, results });
    } catch (error) {
      logger.error('Send bulk notification error:', error);
      res.status(500).json({ success: false, message: 'Failed to send bulk notifications' });
    }
  }

  async testNotification(req, res) {
    try {
      const { patientId } = req.body;

      if (!patientId) {
        return res.status(400).json({
          success: false,
          message: 'patientId is required',
        });
      }

      const patient = await Patient.findById(patientId)
        .select('fcmToken webPushSubscription name')
        .lean();

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found',
        });
      }

      const testPayload = {
        title: 'Test Notification',
        body: `Hello ${patient.name || 'Patient'}, this is a test notification from Gram Swasthya!`,
        type: 'test',
        data: { type: 'test', timestamp: new Date().toISOString() },
      };

      let result;
      if (patient.webPushSubscription?.endpoint) {
        result = await sendToPatient(patient, testPayload);
      } else if (patient.fcmToken) {
        const { sendToToken } = require('../services/pushNotificationService');
        result = await sendToToken(patient.fcmToken, testPayload);
      } else {
        return res.status(400).json({
          success: false,
          message: 'Patient has no push subscription',
        });
      }

      res.json({ success: true, message: 'Test notification sent', result });
    } catch (error) {
      logger.error('Test notification error:', error);
      res.status(500).json({ success: false, message: 'Failed to send test notification' });
    }
  }

  // Reminder preferences methods
  async getPreferences(req, res) {
    try {
      const patient = await Patient.findById(req.user._id).select('reminderPreferences').lean();
      if (!patient) {
        return res.status(404).json({ success: false, message: 'Patient not found' });
      }
      res.json({ success: true, preferences: patient.reminderPreferences || {} });
    } catch (error) {
      logger.error('Get preferences error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch preferences' });
    }
  }

  async updatePreferences(req, res) {
    try {
      const { enableReminders, enablePushNotifications, dontNotifyBefore, quietStart, quietEnd } =
        req.body;
      const updates = {};
      if (enableReminders !== undefined)
        updates['reminderPreferences.enableReminders'] = enableReminders;
      if (enablePushNotifications !== undefined)
        updates['reminderPreferences.enablePushNotifications'] = enablePushNotifications;
      if (dontNotifyBefore !== undefined)
        updates['reminderPreferences.dontNotifyBefore'] = dontNotifyBefore;
      if (quietStart !== undefined) updates['reminderPreferences.quietStart'] = quietStart;
      if (quietEnd !== undefined) updates['reminderPreferences.quietEnd'] = quietEnd;

      const patient = await Patient.findByIdAndUpdate(
        req.user._id,
        { $set: updates },
        { new: true, runValidators: true }
      ).select('reminderPreferences');

      if (!patient) {
        return res.status(404).json({ success: false, message: 'Patient not found' });
      }
      res.json({ success: true, preferences: patient.reminderPreferences });
    } catch (error) {
      logger.error('Update preferences error:', error);
      res.status(500).json({ success: false, message: 'Failed to update preferences' });
    }
  }

  async sendTest(req, res) {
    try {
      const patient = await Patient.findById(req.user._id)
        .select('fcmToken webPushSubscription name')
        .lean();
      if (!patient) {
        return res.status(404).json({ success: false, message: 'Patient not found' });
      }

      const testPayload = {
        title: 'Test Reminder',
        body: `Hello ${patient.name || 'Patient'}, this is a test reminder from Gram Swasthya!`,
        type: 'test',
        data: { type: 'medicine_reminder', timestamp: new Date().toISOString() },
      };

      let result;
      if (patient.webPushSubscription?.endpoint) {
        result = await sendToPatient(patient, testPayload);
      } else if (patient.fcmToken) {
        result = await sendToToken(patient.fcmToken, testPayload);
      } else {
        return res
          .status(400)
          .json({ success: false, message: 'Patient has no push subscription' });
      }

      res.json({ success: true, message: 'Test reminder sent', result });
    } catch (error) {
      logger.error('Send test reminder error:', error);
      res.status(500).json({ success: false, message: 'Failed to send test reminder' });
    }
  }

  // Notifications methods
  async getNotifications(req, res) {
    try {
      const { page = 1, limit = 20, unreadOnly } = req.query;
      const filter = { patientId: req.user._id };
      if (unreadOnly === 'true') filter.read = false;

      const [notifications, total] = await Promise.all([
        NotificationModel.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(parseInt(limit))
          .lean(),
        NotificationModel.countDocuments(filter),
      ]);

      res.json({
        success: true,
        notifications,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Get notifications error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
    }
  }

  async markAllAsRead(req, res) {
    try {
      await NotificationModel.updateMany(
        { patientId: req.user._id, read: false },
        { $set: { read: true, readAt: new Date() } }
      );
      res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
      logger.error('Mark all as read error:', error);
      res.status(500).json({ success: false, message: 'Failed to mark notifications as read' });
    }
  }

  async markAsRead(req, res) {
    try {
      const { id } = req.params;
      await NotificationModel.findOneAndUpdate(
        { _id: id, patientId: req.user._id },
        { $set: { read: true, readAt: new Date() } }
      );
      res.json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
      logger.error('Mark as read error:', error);
      res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
    }
  }

  async acknowledge(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body; // 'taken', 'snoozed', 'skipped'

      const notification = await NotificationModel.findOneAndUpdate(
        { _id: id, patientId: req.user._id },
        { $set: { acknowledged: true, acknowledgedAt: new Date(), status } },
        { new: true }
      );

      if (!notification) {
        return res.status(404).json({ success: false, message: 'Notification not found' });
      }

      res.json({ success: true, notification });
    } catch (error) {
      logger.error('Acknowledge notification error:', error);
      res.status(500).json({ success: false, message: 'Failed to acknowledge notification' });
    }
  }

  async acknowledgeByMedicine(req, res) {
    try {
      const { medicineId, status } = req.body;

      await NotificationModel.updateMany(
        { patientId: req.user._id, 'data.medicineId': medicineId, acknowledged: false },
        { $set: { acknowledged: true, acknowledgedAt: new Date(), status } }
      );

      res.json({ success: true, message: 'Notifications acknowledged' });
    } catch (error) {
      logger.error('Acknowledge by medicine error:', error);
      res.status(500).json({ success: false, message: 'Failed to acknowledge notifications' });
    }
  }

  async saveWebPushSubscription(req, res) {
    try {
      const { webPushEndpoint, webPushSubscription } = req.body;
      if (!webPushEndpoint) {
        return res.status(400).json({ success: false, message: 'webPushEndpoint is required' });
      }

      await Patient.findByIdAndUpdate(req.user._id, {
        fcmToken: null,
        webPushSubscription: webPushSubscription || { endpoint: webPushEndpoint },
      });

      res.json({ success: true, message: 'Web Push subscription saved' });
    } catch (error) {
      logger.error('Save Web Push subscription error:', error);
      res.status(500).json({ success: false, message: 'Failed to save Web Push subscription' });
    }
  }
}

module.exports = new NotificationController();
