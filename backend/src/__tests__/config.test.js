const { assertSecureConfig } = require('../config');

describe('assertSecureConfig (JWT boot guard)', () => {
  const originalSecret = process.env.JWT_SECRET;
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalSecret;
    }
    process.env.NODE_ENV = originalEnv;
  });

  it('throws in production when JWT_SECRET is missing', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    expect(() => assertSecureConfig()).toThrow(/JWT_SECRET is not set/);
  });

  it('throws in production when JWT_SECRET is a placeholder', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'your_super_secret_jwt_key_min_32_chars_here';
    expect(() => assertSecureConfig()).toThrow(/placeholder/);
  });

  it('throws in production when JWT_SECRET is too short', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'short';
    expect(() => assertSecureConfig()).toThrow(/min 32/);
  });

  it('does not throw in production for a strong secret', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'a'.repeat(64);
    expect(() => assertSecureConfig()).not.toThrow();
  });

  it('warns (does not throw) in development for a weak secret', () => {
    process.env.NODE_ENV = 'development';
    process.env.JWT_SECRET = 'short';
    expect(() => assertSecureConfig()).not.toThrow();
  });
});
