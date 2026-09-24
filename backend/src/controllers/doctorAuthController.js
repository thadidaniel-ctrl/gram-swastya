const jwt = require('jsonwebtoken');
const config = require('../config');
const { Doctor } = require('../models');
const otpService = require('../services/otpService');
const smsService = require('../services/smsService');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');

class DoctorAuthController {
  async sendOTP(req, res) {
    try {
      const { phone, email, purpose = 'login' } = req.body;

      if (!phone && !email) {
        return res.status(400).json({
          success: false,
          message: 'Phone or email is required',
        });
      }

      const { code, tempToken } = await otpService.generateOTP(phone, email, purpose, 'doctor');

      if (phone) {
        await smsService.sendOTPSMS(phone, code, purpose, req.body.language || 'en');
      }
      if (email) {
        await emailService.sendOTPEmail(email, code, purpose, req.body.language || 'en');
      }

      logger.info(`Doctor OTP sent to ${phone || email} for ${purpose}`);

      res.json({
        success: true,
        message: `OTP sent via ${phone ? 'SMS' : 'Email'}`,
        tempToken,
        expiresIn: config.otp.doctorExpiry,
      });
    } catch (error) {
      logger.error('Doctor send OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send OTP',
      });
    }
  }

  async verifyOTP(req, res) {
    try {
      const { tempToken, otp } = req.body;

      if (!tempToken || !otp) {
        return res.status(400).json({
          success: false,
          message: 'tempToken and otp are required',
        });
      }

      const result = await otpService.verifyOTP(tempToken, otp);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message,
          attemptsLeft: result.attemptsLeft,
        });
      }

      const { phone, email } = result;
      let doctor = null;

      if (phone) {
        doctor = await Doctor.findOne({ phone });
      } else if (email) {
        const escaped = String(email).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        doctor = await Doctor.findOne({ email: { $regex: `^${escaped}$`, $options: 'i' } });
      }

      if (!doctor) {
        return res.status(404).json({
          success: false,
          message: 'Doctor not found. Please contact support.',
        });
      }

      if (!doctor.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Doctor account is inactive.',
        });
      }

      doctor.lastLogin = new Date();
      if (phone && !doctor.isPhoneVerified) {
        doctor.isPhoneVerified = true;
      }
      await doctor.save();

      const accessToken = jwt.sign(
        { id: doctor._id, userType: 'doctor', phone: doctor.phone, email: doctor.email },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      const refreshToken = jwt.sign(
        { id: doctor._id, userType: 'doctor', type: 'refresh' },
        config.jwt.secret,
        { expiresIn: config.jwt.refreshExpiresIn }
      );

      logger.info(`OTP verified for ${phone || email}, doctor`);

      res.json({
        success: true,
        message: 'OTP verified successfully',
        accessToken,
        refreshToken,
        doctor: this.sanitizeDoctor(doctor),
        requiresRegistration: false,
      });
    } catch (error) {
      logger.error('Doctor verify OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify OTP',
      });
    }
  }

  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token required',
        });
      }

      let decoded;
      try {
        decoded = jwt.verify(refreshToken, config.jwt.secret);
      } catch (error) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired refresh token',
        });
      }

      if (decoded.type !== 'refresh') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token type',
        });
      }

      const doctor = await Doctor.findById(decoded.id).select('-passwordHash');

      if (!doctor || !doctor.isActive) {
        return res.status(401).json({
          success: false,
          message: 'User not found or inactive',
        });
      }

      const newAccessToken = jwt.sign(
        { id: doctor._id, userType: 'doctor', phone: doctor.phone, email: doctor.email },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      const newRefreshToken = jwt.sign(
        { id: doctor._id, userType: 'doctor', type: 'refresh' },
        config.jwt.secret,
        { expiresIn: config.jwt.refreshExpiresIn }
      );

      res.json({
        success: true,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    } catch (error) {
      logger.error('Doctor token refresh error:', error);
      res.status(500).json({
        success: false,
        message: 'Token refresh failed',
      });
    }
  }

  async logout(req, res) {
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  }

  sanitizeDoctor(doctor) {
    return {
      id: doctor._id,
      phone: doctor.phone,
      email: doctor.email,
      profile: {
        firstName: doctor.profile?.firstName,
        lastName: doctor.profile?.lastName,
        qualification: doctor.profile?.qualification,
        specialization: doctor.profile?.specialization,
        subSpecialization: doctor.profile?.subSpecialization,
        experience: doctor.profile?.experience,
        registrationNumber: doctor.profile?.registrationNumber,
        photo: doctor.profile?.photo,
        bio: doctor.profile?.bio,
        languages: doctor.profile?.languages || [],
      },
      clinic: doctor.clinic,
      consultationFee: doctor.consultationFee,
      videoConsultationEnabled: doctor.videoConsultationEnabled,
      acceptsOnlinePayment: doctor.acceptsOnlinePayment,
      isPhoneVerified: doctor.isPhoneVerified,
      isVerified: doctor.isVerified,
      isActive: doctor.isActive,
      createdAt: doctor.createdAt,
      updatedAt: doctor.updatedAt,
    };
  }
}

module.exports = new DoctorAuthController();
