require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',

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
    max: 100,
  },

  cors: {
    origin: process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:3000',
    credentials: true,
  },
};
