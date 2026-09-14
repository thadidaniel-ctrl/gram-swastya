const webpush = require('web-push');
const logger = require('../utils/logger');

let configured = false;
let configError = null;

function initWebPush(config) {
  const publicKey = config.webPush?.vapidPublicKey || process.env.VAPID_PUBLIC_KEY;
  const privateKey = config.webPush?.vapidPrivateKey || process.env.VAPID_PRIVATE_KEY;
  const subject = config.webPush?.subject || process.env.VAPID_SUBJECT;
  const contact = config.webPush?.contactEmail || process.env.VAPID_CONTACT_EMAIL;

  if (!publicKey || !privateKey) {
    configError = 'VAPID keys not configured. Web Push disabled.';
    logger.warn(configError);
    return;
  }

  webpush.setVapidDetails(
    contact || subject || 'mailto:admin@gramswasthya.local',
    publicKey,
    privateKey
  );
  configured = true;
  logger.info('Web Push (VAPID) initialized');
}

function isAvailable() {
  return configured;
}

function getError() {
  return configError;
}

// Send to a web push subscription object
async function sendToSubscription(subscription, payload) {
  if (!configured) {
    logger.warn('Web Push not configured, skipping');
    return { status: 'skipped', reason: 'vapid_not_configured' };
  }
  if (!subscription?.endpoint) {
    return { status: 'skipped', reason: 'no_subscription' };
  }

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/favicon.svg',
        badge: payload.badge || '/favicon.svg',
        vibrate: [200, 100, 200],
        tag: payload.tag || 'gram-swasthya',
        type: payload.type || 'general',
        actions: payload.actions || [
          { action: 'taken', title: '✓ Took it' },
          { action: 'snooze', title: '⏰ Snooze 10 min' },
        ],
        data: {
          notificationId: payload.notificationId || '',
          medicineId: payload.medicineId || '',
          ...(payload.data || {}),
        },
      })
    );
    return { status: 'sent' };
  } catch (error) {
    if (error.statusCode === 404 || error.statusCode === 410) {
      return { status: 'expired_subscription', message: error.body };
    }
    throw error;
  }
}

// Send granular fallback: try FCM token then web push subscription
async function sendToPatient(patient, payload) {
  if (patient.fcmToken) {
    const { sendToToken } = require('./pushNotificationService');
    const fcmResult = await sendToToken(patient.fcmToken, payload);
    if (fcmResult.status === 'sent') {
      return { via: 'fcm', ...fcmResult };
    }
    // If FCM token is invalid, try web push fallback
  }

  if (patient.webPushSubscription?.endpoint) {
    const result = await sendToSubscription(patient.webPushSubscription, payload);
    return { via: 'webpush', ...result };
  }

  return { status: 'skipped', reason: 'no_delivery_channel' };
}

module.exports = {
  initWebPush,
  isAvailable,
  getError,
  sendToSubscription,
  sendToPatient,
};
