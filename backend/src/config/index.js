require('dotenv').config();
const path = require('path');
const pkg = require('../../package.json');

const PLACEHOLDER_SECRETS = [
  'your_super_secret_jwt_key_min_32_chars_here',
  'your_secret_access_key',
  'changeme',
  'change_me',
  'replace_me',
  'example',
];

function assertSecureConfig() {
  const secret = process.env.JWT_SECRET || '';
  const isMissing = !secret;
  const isPlaceholder = PLACEHOLDER_SECRETS.some(p => secret.toLowerCase().includes(p));
  const isTooShort = secret.length < 32;

  if (isMissing || isPlaceholder || isTooShort) {
    const reason = isMissing
      ? 'JWT_SECRET is not set'
      : isPlaceholder
        ? 'JWT_SECRET is still a placeholder value'
        : `JWT_SECRET is only ${secret.length} characters (min 32)`;
    const message = `${reason}. Set a strong, unique JWT_SECRET before starting the server.`;

    if (process.env.NODE_ENV === 'production') {
      throw new Error(`[config] Fatal: ${message}`);
    }
    console.warn(`[config] WARNING: ${message}`);
  }
}

assertSecureConfig();

module.exports = {
  assertSecureConfig,
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  version: pkg.version || '2.0.0',
  buildDate: process.env.BUILD_DATE || new Date().toISOString(),
  gitCommit: process.env.GIT_COMMIT || 'unknown',

  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/gram_swasthya',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: '7d',
    refreshExpiresIn: '30d',
  },

  otp: {
    patientExpiry: parseInt(process.env.PATIENT_OTP_EXPIRY) || 300,
    doctorExpiry: parseInt(process.env.DOCTOR_OTP_EXPIRY) || 300,
    length: 6,
  },

  email: {
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_USER,
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
  },

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: 'gemini-1.5-flash',
  },

  googleCloud: {
    apiKey: process.env.GOOGLE_CLOUD_API_KEY,
  },

  firebase: {
    serviceAccount: process.env.FIREBASE_SERVICE_ACCOUNT
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      : null,
    projectId: process.env.FIREBASE_PROJECT_ID,
  },

  webPush: {
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
    contactEmail: process.env.VAPID_CONTACT_EMAIL || 'mailto:admin@gramswasthya.local',
  },

  rateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 300,
  },

  cors: {
    origin: process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:3000',
    credentials: true,
  },

  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024,
    allowedMimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/tiff',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/zip',
    ],
    allowedExtensions: [
      'pdf',
      'jpg',
      'jpeg',
      'png',
      'webp',
      'tiff',
      'tif',
      'doc',
      'docx',
      'txt',
      'zip',
    ],
    localPath: process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'),
  },

  server: {
    baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`,
  },

  meeting: {
    baseUrl: process.env.MEETING_BASE_URL,
  },
};
