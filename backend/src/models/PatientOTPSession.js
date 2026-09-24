const mongoose = require('mongoose');

const patientOTPSessionSchema = new mongoose.Schema(
  {
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    otpHash: { type: String, required: true },
    tempToken: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    purpose: {
      type: String,
      enum: ['registration', 'login', 'password_reset', 'phone_verification', 'email_verification'],
      default: 'login',
    },
  },
  {
    timestamps: true,
  }
);

patientOTPSessionSchema.index({ phone: 1, email: 1 });
patientOTPSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('PatientOTPSession', patientOTPSessionSchema);
