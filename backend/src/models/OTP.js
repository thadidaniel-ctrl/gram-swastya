const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
  {
    identifier: { type: String, required: true, index: true },
    type: { type: String, enum: ['phone', 'email'], required: true },
    userType: { type: String, enum: ['patient', 'doctor', 'chw'], required: true },

    code: { type: String, required: true },
    hashedCode: { type: String, required: true },

    purpose: {
      type: String,
      enum: ['registration', 'login', 'password_reset', 'phone_verification', 'email_verification'],
      required: true,
    },

    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },

    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    isUsed: { type: Boolean, default: false },
    usedAt: Date,

    metadata: {
      ip: String,
      userAgent: String,
      deviceInfo: String,
    },
  },
  {
    timestamps: true,
  }
);

otpSchema.index({ identifier: 1, type: 1, purpose: 1 });

otpSchema.pre('save', function (next) {
  if (!this.hashedCode && this.code) {
    // Hash will be set by service
  }
  next();
});

module.exports = mongoose.model('OTP', otpSchema);
