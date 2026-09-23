const { validationResult } = require('express-validator');
const { bookAppointmentValidation } = require('../validators/appointmentValidator');

async function runValidator(chain, body) {
  const req = { body };
  for (const v of chain) {
    await v.run(req);
  }
  return validationResult(req);
}

describe('appointmentValidator', () => {
  it('accepts a valid booking payload', async () => {
    const result = await runValidator(bookAppointmentValidation, {
      doctor: '507f1f77bcf86cd799439011',
      scheduledAt: '2099-01-01T10:00:00.000Z',
      duration: 15,
      type: 'video',
    });
    expect(result.isEmpty()).toBe(true);
  });

  it('rejects a missing doctor', async () => {
    const result = await runValidator(bookAppointmentValidation, {
      scheduledAt: '2099-01-01T10:00:00.000Z',
    });
    expect(result.isEmpty()).toBe(false);
    expect(result.array().some(e => e.path === 'doctor')).toBe(true);
  });

  it('rejects a malformed doctor id', async () => {
    const result = await runValidator(bookAppointmentValidation, {
      doctor: 'not-an-objectid',
      scheduledAt: '2099-01-01T10:00:00.000Z',
    });
    expect(result.array().some(e => e.path === 'doctor')).toBe(true);
  });

  it('rejects an invalid scheduledAt', async () => {
    const result = await runValidator(bookAppointmentValidation, {
      doctor: '507f1f77bcf86cd799439011',
      scheduledAt: 'tomorrow-tuesday',
    });
    expect(result.array().some(e => e.path === 'scheduledAt')).toBe(true);
  });

  it('rejects an invalid consultation type', async () => {
    const result = await runValidator(bookAppointmentValidation, {
      doctor: '507f1f77bcf86cd799439011',
      scheduledAt: '2099-01-01T10:00:00.000Z',
      type: 'telepathy',
    });
    expect(result.array().some(e => e.path === 'type')).toBe(true);
  });

  it('rejects duration outside the allowed range', async () => {
    const result = await runValidator(bookAppointmentValidation, {
      doctor: '507f1f77bcf86cd799439011',
      scheduledAt: '2099-01-01T10:00:00.000Z',
      duration: 500,
    });
    expect(result.array().some(e => e.path === 'duration')).toBe(true);
  });
});
