const crypto = require('crypto');
const config = require('../config');

const PAYMENT_METHODS = ['upi', 'net_banking', 'cash', 'insurance'];

function resolvePaymentMethod(method) {
  return PAYMENT_METHODS.includes(method) ? method : 'cash';
}

function buildPayment(doctor, method) {
  const amount = Math.max(0, Number(doctor?.consultationFee) || 0);
  return {
    amount,
    method: resolvePaymentMethod(method),
    status: 'pending',
  };
}

function buildMeeting(type, doctor) {
  if (type !== 'video') {
    return null;
  }

  const meetingId = crypto.randomUUID();
  const baseUrl = config.meeting?.baseUrl || config.server?.baseUrl || 'http://localhost:5000';
  const doctorName = doctor?.profile
    ? `${doctor.profile.firstName || ''} ${doctor.profile.lastName || ''}`.trim()
    : 'doctor';

  return {
    meetingId,
    meetingLink: `${baseUrl}/meet/${meetingId}`,
    meetingPassword: '',
    meetingLabel: `${doctorName || 'Doctor'} video consultation`,
  };
}

module.exports = { PAYMENT_METHODS, resolvePaymentMethod, buildPayment, buildMeeting };
