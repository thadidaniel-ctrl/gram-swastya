const admin = require('firebase-admin');
const logger = require('../utils/logger');

let fcmApp = null;
let fcmInitialized = false;
let initializationError = null;

function initFirebase(config) {
  if (fcmInitialized) return;

  const serviceAccount = config.firebase?.serviceAccount;
  if (!serviceAccount) {
    initializationError = 'Firebase service account not configured. Push notifications disabled.';
    logger.warn(initializationError);
    return;
  }

  try {
    fcmApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    fcmInitialized = true;
    logger.info('Firebase Admin initialized');
  } catch (error) {
    initializationError = error.message;
    logger.error('Firebase initialization failed:', error.message);
  }
}

function isAvailable() {
  return fcmInitialized && !!fcmApp;
}

function getError() {
  return initializationError;
}

// Send a notification to a single FCM token
async function sendToToken(token, payload) {
  if (!isAvailable()) {
    logger.warn('FCM not available, skipping push');
    return { status: 'skipped', reason: 'fcm_not_configured' };
  }

  if (!token) {
    return { status: 'skipped', reason: 'no_token' };
  }

  const message = {
    token,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: {
      type: payload.type || 'medicine_reminder',
      medicineId: payload.medicineId || '',
      notificationId: payload.notificationId || '',
      ...(payload.data || {}),
    },
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        ...(payload.channelId ? { channelId: payload.channelId } : {}),
      },
    },
    webpush: {
      notification: {
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/favicon.svg',
        badge: payload.badge || '/favicon.svg',
        vibrate: [200, 100, 200],
        tag: payload.tag || 'gram-swasthya',
        actions: payload.actions || [
          { action: 'taken', title: '✓ Took it' },
          { action: 'snooze', title: '⏰ Snooze 10 min' },
        ],
      },
    },
  };

  try {
    const response = await fcmApp.messaging().send(message);
    return { status: 'sent', messageId: response };
  } catch (error) {
    if (error.code === 'messaging/registration-token-not-registered') {
      logger.warn('FCM token invalid, should be cleaned up');
      return { status: 'invalid_token', message: error.message };
    }
    if (error.code === 'messaging/invalid-argument') {
      return { status: 'invalid_payload', message: error.message };
    }
    throw error;
  }
}

// Send a multi-cast notification to many tokens
async function sendToTokens(tokens, payload) {
  if (!isAvailable()) {
    logger.warn('FCM not available, skipping push');
    return { status: 'skipped', reason: 'fcm_not_configured' };
  }

  const validTokens = [...new Set(tokens.filter(Boolean))];
  if (validTokens.length === 0) {
    return { status: 'skipped', reason: 'no_tokens' };
  }

  const message = {
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: {
      type: payload.type || 'general',
      ...(payload.data || {}),
    },
  };

  const response = await fcmApp.messaging().sendEachForMulticast({
    tokens: validTokens,
    ...message,
  });

  return {
    status: 'sent',
    successCount: response.successCount,
    failureCount: response.failureCount,
  };
}

// Send push or Web Push fallback based on config
async function sendNotification(patient, payload) {
  const token = patient.fcmToken;

  if (token) {
    const result = await sendToToken(token, payload);
    return result;
  }

  // Fallback: no FCM token, log and return
  logger.info(`No FCM token for patient ${patient.id}, notification saved but not pushed`);
  return { status: 'skipped', reason: 'no_fcm_token' };
}

module.exports = {
  initFirebase,
  isAvailable,
  getError,
  sendToToken,
  sendToTokens,
  sendNotification,
};
