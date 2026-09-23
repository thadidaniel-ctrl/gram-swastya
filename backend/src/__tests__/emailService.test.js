jest.mock('../config', () => ({
  email: {
    user: undefined,
    password: undefined,
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    from: undefined,
  },
  nodeEnv: 'test',
}));

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

jest.mock('../utils/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));

const logger = require('../utils/logger');
const { createTransport } = require('nodemailer');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('emailService graceful degradation without SMTP credentials', () => {
  it('does not create a transporter when credentials are missing', () => {
    const emailService = require('../services/emailService');
    expect(createTransport).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('SMTP credentials not configured')
    );
    expect(emailService.transporter).toBeNull();
  });

  it('logs the OTP email instead of throwing when no transporter', async () => {
    const emailService = require('../services/emailService');
    const result = await emailService.sendOTPEmail('patient@example.com', '123456', 'login', 'en');
    expect(result).toBe(true);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('[EMAIL MOCK]'));
    expect(createTransport).not.toHaveBeenCalled();
  });
});
