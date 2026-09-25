const { Patient, Doctor, CHW } = require('../models');
const logger = require('../utils/logger');
const { verifyAccessToken } = require('../utils/tokenUtils');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = verifyAccessToken(token);

    let user;
    if (decoded.userType === 'patient') {
      user = await Patient.findById(decoded.id).select('-passwordHash');
    } else if (decoded.userType === 'doctor') {
      user = await Doctor.findById(decoded.id).select('-passwordHash');
    } else if (decoded.userType === 'chw') {
      user = await CHW.findById(decoded.id).select('-passwordHash');
    }

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive',
      });
    }

    req.user = user;
    req.userType = decoded.userType;
    req.token = token;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        code: 'TOKEN_EXPIRED',
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }
    logger.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};

const authorize = (...allowedTypes) => {
  return (req, res, next) => {
    if (!req.userType || !allowedTypes.includes(req.userType)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
    }
    next();
  };
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    let user;
    if (decoded.userType === 'patient') {
      user = await Patient.findById(decoded.id).select('-passwordHash');
    } else if (decoded.userType === 'doctor') {
      user = await Doctor.findById(decoded.id).select('-passwordHash');
    } else if (decoded.userType === 'chw') {
      user = await CHW.findById(decoded.id).select('-passwordHash');
    }

    if (user && user.isActive) {
      req.user = user;
      req.userType = decoded.userType;
    }
    next();
  } catch (error) {
    next();
  }
};

module.exports = { authenticate, authorize, optionalAuth };
