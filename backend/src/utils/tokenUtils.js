const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config');

function accessClaims(user, userType) {
  const claims = { id: user._id, userType };
  if (userType === 'patient') {
    return { ...claims, phone: user.phone, email: user.email };
  }
  if (userType === 'doctor') {
    const name = `${user.profile?.firstName} ${user.profile?.lastName}`.trim();
    return { ...claims, name };
  }
  return claims;
}

function signAccessToken(user, userType) {
  return jwt.sign(accessClaims(user, userType), config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
  });
}

function signRefreshToken(user, userType) {
  const jti = crypto.randomUUID();
  const token = jwt.sign({ id: user._id, userType, type: 'refresh' }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
    jwtid: jti,
  });
  return { token, jti };
}

function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.secret, {
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
  });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwt.refreshSecret, {
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
  });
}

function hashRefreshJti(jti) {
  return crypto.createHash('sha256').update(jti).digest('hex');
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashRefreshJti,
};
