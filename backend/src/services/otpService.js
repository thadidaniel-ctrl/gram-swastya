const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { PatientOTPSession } = require('../models');
const config = require('../config');
const logger = require('../utils/logger');

class OTPService {
  constructor() {
    this.generateTempToken = () => crypto.randomBytes(32).toString('hex');
  }

  async generateOTP(phone, email, purpose = 'login', userType = 'patient') {
    try {
      await this.invalidateExistingOTPs(phone, email, purpose);

      const code = this.generateNumericOTP(6);
      const otpHash = await bcrypt.hash(code, 10);
      const tempToken = this.generateTempToken();

      const expirySeconds =
        userType === 'doctor' ? config.otp.doctorExpiry : config.otp.patientExpiry;
      const expiresAt = new Date(Date.now() + expirySeconds * 1000);

      const otpSession = await PatientOTPSession.create({
        phone: phone || '',
        email: email || '',
        otpHash,
        tempToken,
        expiresAt,
        attempts: 0,
        purpose,
      });

      logger.info(`OTP generated for ${phone || email} (${purpose})`);

      const result = { otpId: otpSession._id, tempToken, expiresAt };
      if (config.nodeEnv !== 'production') {
        result.code = code; // Return code in dev for testing
      }
      return result;
    } catch (error) {
      logger.error('OTP generation failed:', error);
      throw new Error('Failed to generate OTP');
    }
  }

  async verifyOTP(tempToken, code) {
    try {
      const otpSession = await PatientOTPSession.findOne({
        tempToken,
        expiresAt: { $gt: new Date() },
      });

      if (!otpSession) {
        return { success: false, message: 'Invalid or expired OTP' };
      }

      if (otpSession.attempts >= 3) {
        return { success: false, message: 'Maximum attempts exceeded' };
      }

      otpSession.attempts += 1;
      await otpSession.save();

      const isValid = await bcrypt.compare(code, otpSession.otpHash);

      if (!isValid) {
        return { success: false, message: 'Invalid OTP', attemptsLeft: 3 - otpSession.attempts };
      }

      otpSession.expiresAt = new Date(); // Mark as used by expiring
      await otpSession.save();

      logger.info(
        `OTP verified for ${otpSession.phone || otpSession.email} (${otpSession.purpose})`
      );
      return {
        success: true,
        otpId: otpSession._id,
        phone: otpSession.phone,
        email: otpSession.email,
        purpose: otpSession.purpose,
      };
    } catch (error) {
      logger.error('OTP verification failed:', error);
      throw new Error('Failed to verify OTP');
    }
  }

  async invalidateExistingOTPs(phone, email, purpose) {
    const query = { purpose, expiresAt: { $gt: new Date() } };
    if (phone) query.phone = phone;
    if (email) query.email = email;

    await PatientOTPSession.updateMany(query, { expiresAt: new Date() });
  }

  generateNumericOTP(length = 6) {
    const min = 10 ** (length - 1);
    const max = 10 ** length;
    return crypto.randomInt(min, max).toString();
  }

  async cleanupExpiredOTPs() {
    const result = await PatientOTPSession.deleteMany({ expiresAt: { $lt: new Date() } });
    logger.info(`Cleaned up ${result.deletedCount} expired OTP sessions`);
  }
}

module.exports = new OTPService();
