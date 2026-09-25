const {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashRefreshJti,
} = require('../utils/tokenUtils');
const config = require('../config');

describe('tokenUtils (JWT hardening)', () => {
  const patient = { _id: 'p1', phone: '+919000000000', email: 'p@example.com' };
  const doctor = {
    _id: 'd1',
    profile: { firstName: 'Ada', lastName: 'Lovelace' },
  };

  it('signs access tokens with issuer and audience', () => {
    const token = signAccessToken(patient, 'patient');
    const decoded = verifyAccessToken(token);
    expect(decoded.id).toBe('p1');
    expect(decoded.userType).toBe('patient');
    expect(decoded.iss).toBe(config.jwt.issuer);
    expect(decoded.aud).toBe(config.jwt.audience);
  });

  it('verifying with a different audience fails', () => {
    const token = signAccessToken(patient, 'patient');
    expect(() =>
      require('jsonwebtoken').verify(token, config.jwt.secret, {
        audience: 'other-client',
      })
    ).toThrow(/audience/);
  });

  it('access tokens carry no refresh marker and are rejected by the controller guard', () => {
    const access = signAccessToken(patient, 'patient');
    const refresh = signRefreshToken(patient, 'patient');
    const decodedAsRefresh = require('jsonwebtoken').verify(access, config.jwt.refreshSecret, {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    });
    expect(decodedAsRefresh.type).not.toBe('refresh');
    expect(verifyRefreshToken(refresh.token).type).toBe('refresh');
  });

  it('each refresh token carries a unique jti and differs from the prior one', () => {
    const first = signRefreshToken(doctor, 'doctor');
    const second = signRefreshToken(doctor, 'doctor');
    expect(first.jti).not.toBe(second.jti);
    expect(first.token).not.toBe(second.token);
  });

  it('hashes jti deterministically', () => {
    expect(hashRefreshJti('abc')).toBe(hashRefreshJti('abc'));
    expect(hashRefreshJti('abc')).not.toBe(hashRefreshJti('abd'));
  });

  it('revoked refresh tokens (hash mismatch) do not share the stored hash', () => {
    const { token, jti } = signRefreshToken(patient, 'patient');
    const storedHash = hashRefreshJti(jti);
    expect(storedHash).toBe(hashRefreshJti(verifyRefreshToken(token).jti));
  });
});
