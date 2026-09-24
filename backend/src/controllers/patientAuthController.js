const jwt = require('jsonwebtoken');
const config = require('../config');
const { Patient } = require('../models');
const otpService = require('../services/otpService');
const smsService = require('../services/smsService');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');

const sanitizePatient = patient => {
  return {
    id: patient._id,
    phone: patient.phone,
    email: patient.email,
    name: patient.name,
    age: patient.age,
    gender: patient.gender,
    address: patient.address,
    bloodType: patient.bloodType,
    emergencyContact: patient.emergencyContact,
    allergies: patient.allergies,
    currentMedications: patient.currentMedications,
    medicalHistory: patient.medicalHistory,
    preferredLanguage: patient.preferredLanguage,
    isActive: patient.isActive,
    createdAt: patient.createdAt,
    updatedAt: patient.updatedAt,
  };
};

class PatientAuthController {
  async sendOTP(req, res) {
    try {
      const { phone, email, purpose = 'login' } = req.body;

      if (!phone && !email) {
        return res.status(400).json({
          success: false,
          message: 'Phone or email is required',
        });
      }

      const otpResult = await otpService.generateOTP(phone, email, purpose, 'patient');

      const { code } = otpResult;

      if (phone) {
        await smsService.sendOTPSMS(phone, code, purpose, req.body.language || 'en');
      }
      if (email) {
        await emailService.sendOTPEmail(email, code, purpose, req.body.language || 'en');
      }

      logger.info(`OTP sent to ${phone || email} for ${purpose}`);

      const response = {
        success: true,
        message: `OTP sent via ${phone ? 'SMS' : 'Email'}`,
        ...otpResult,
      };
      if (config.nodeEnv !== 'production' && otpResult.code) {
        response.code = otpResult.code;
      }
      res.json(response);
    } catch (error) {
      logger.error('Send OTP error:', error);
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

      const { phone, email, purpose } = result;
      let user = null;

      if (phone) {
        user = await Patient.findOne({ phone });
      } else if (email) {
        user = await Patient.findOne({ email });
      }

      if (!user) {
        if (purpose !== 'registration') {
          return res.status(404).json({
            success: false,
            message: 'User not found. Please register first.',
          });
        }
        return res.json({
          success: true,
          message: 'OTP verified successfully',
          accessToken: null,
          refreshToken: null,
          patient: null,
          requiresRegistration: true,
          phone,
          email,
        });
      }

      if (user) {
        user.lastLogin = new Date();
        if (phone && !user.isPhoneVerified) {
          user.isPhoneVerified = true;
        }
        if (email && !user.isEmailVerified) {
          user.isEmailVerified = true;
        }
        await user.save();
      }

      const accessToken = jwt.sign(
        { id: user._id, userType: 'patient', phone: user.phone, email: user.email },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      const refreshToken = jwt.sign(
        { id: user._id, userType: 'patient', type: 'refresh' },
        config.jwt.secret,
        { expiresIn: config.jwt.refreshExpiresIn }
      );

      logger.info(`OTP verified for ${phone || email}, patient`);

      res.json({
        success: true,
        message: 'OTP verified successfully',
        accessToken,
        refreshToken,
        patient: sanitizePatient(user),
        requiresRegistration: false,
      });
    } catch (error) {
      logger.error('Verify OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify OTP',
      });
    }
  }

  async register(req, res) {
    try {
      const {
        phone,
        email,
        name,
        age,
        gender,
        address,
        bloodType,
        emergencyContact,
        preferredLanguage,
      } = req.body;

      if (!phone && !email) {
        return res.status(400).json({
          success: false,
          message: 'Phone or email is required',
        });
      }

      const orConditions = [];
      if (phone) orConditions.push({ phone });
      if (email) orConditions.push({ email: email.toLowerCase() });
      if (orConditions.length) {
        const existingPatient = await Patient.findOne({ $or: orConditions });
        if (existingPatient) {
          return res.status(409).json({
            success: false,
            message: 'Phone or email already registered',
          });
        }
      }

      const patient = await Patient.create({
        phone: phone || `NO_PHONE_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        email: email?.toLowerCase() || undefined,
        name,
        age,
        gender,
        address: address || {},
        bloodType: bloodType || '',
        emergencyContact: emergencyContact || {},
        preferredLanguage: preferredLanguage || 'en',
      });

      const accessToken = jwt.sign(
        { id: patient._id, userType: 'patient', phone: patient.phone, email: patient.email },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      const refreshToken = jwt.sign(
        { id: patient._id, userType: 'patient', type: 'refresh' },
        config.jwt.secret,
        { expiresIn: config.jwt.refreshExpiresIn }
      );

      logger.info(`New patient registered: ${patient.phone || patient.email}`);

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        accessToken,
        refreshToken,
        patient: sanitizePatient(patient),
      });
    } catch (error) {
      logger.error('Patient registration error:', error);
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'Phone or email already registered',
        });
      }
      res.status(500).json({
        success: false,
        message: 'Registration failed',
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

      const patient = await Patient.findById(decoded.id).select('-passwordHash');

      if (!patient || !patient.isActive) {
        return res.status(401).json({
          success: false,
          message: 'User not found or inactive',
        });
      }

      const newAccessToken = jwt.sign(
        { id: patient._id, userType: 'patient', phone: patient.phone, email: patient.email },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      const newRefreshToken = jwt.sign(
        { id: patient._id, userType: 'patient', type: 'refresh' },
        config.jwt.secret,
        { expiresIn: config.jwt.refreshExpiresIn }
      );

      res.json({
        success: true,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    } catch (error) {
      logger.error('Token refresh error:', error);
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

  sanitizePatient(patient) {
    return {
      id: patient._id,
      phone: patient.phone,
      email: patient.email,
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      address: patient.address,
      bloodType: patient.bloodType,
      emergencyContact: patient.emergencyContact,
      allergies: patient.allergies,
      currentMedications: patient.currentMedications,
      medicalHistory: patient.medicalHistory,
      preferredLanguage: patient.preferredLanguage,
      isActive: patient.isActive,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
    };
  }
}

module.exports = new PatientAuthController();
