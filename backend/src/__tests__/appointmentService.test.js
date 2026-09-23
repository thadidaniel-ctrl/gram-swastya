const {
  PAYMENT_METHODS,
  resolvePaymentMethod,
  buildPayment,
  buildMeeting,
} = require('../services/appointmentService');

describe('appointmentService', () => {
  describe('resolvePaymentMethod', () => {
    it('accepts known methods', () => {
      PAYMENT_METHODS.forEach(m => expect(resolvePaymentMethod(m)).toBe(m));
    });

    it('defaults unknown methods to cash', () => {
      expect(resolvePaymentMethod('credit_card')).toBe('cash');
      expect(resolvePaymentMethod(undefined)).toBe('cash');
    });
  });

  describe('buildPayment', () => {
    it('uses the doctor consultation fee and requested method', () => {
      const payment = buildPayment({ consultationFee: 250 }, 'upi');
      expect(payment).toEqual({ amount: 250, method: 'upi', status: 'pending' });
    });

    it('drops to 0 and cash when doctor has no fee and method is invalid', () => {
      const payment = buildPayment({}, 'telepathy');
      expect(payment).toEqual({ amount: 0, method: 'cash', status: 'pending' });
    });
  });

  describe('buildMeeting', () => {
    it('generates meeting id + link for video consultations', () => {
      const meeting = buildMeeting('video', {
        profile: { firstName: 'Asha', lastName: 'Sharma' },
      });
      expect(meeting.meetingId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
      expect(meeting.meetingLink).toContain('/meet/');
      expect(meeting.meetingLink).toContain(meeting.meetingId);
      expect(meeting.meetingLabel).toContain('Asha Sharma');
    });

    it('returns null for non-video consultation types', () => {
      expect(buildMeeting('in_person')).toBeNull();
      expect(buildMeeting('audio')).toBeNull();
    });
  });
});
