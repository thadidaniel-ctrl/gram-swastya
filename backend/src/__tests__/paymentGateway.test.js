const {
  PaymentGateway,
  MockPaymentAdapter,
  StripePaymentAdapter,
  createPaymentGateway,
  PaymentGatewayError,
} = require('../services/paymentGateway');

describe('paymentGateway', () => {
  describe('PaymentGateway (abstract)', () => {
    it('throws when instantiated directly', () => {
      expect(() => new PaymentGateway()).toThrow(TypeError);
    });
  });

  describe('MockPaymentAdapter', () => {
    let gateway;
    beforeEach(() => {
      gateway = new MockPaymentAdapter();
    });

    it('initializes and creates a payment', async () => {
      const payment = await gateway.createPayment(500, 'INR', { patientId: 'p1' });
      expect(payment.amount).toBe(500);
      expect(payment.currency).toBe('INR');
      expect(payment.status).toBe('pending');
      expect(payment.id).toMatch(/^mock_/);
    });

    it('confirms a payment', async () => {
      const created = await gateway.createPayment(300, 'INR');
      const confirmed = await gateway.confirmPayment(created.id);
      expect(confirmed.status).toBe('completed');
    });

    it('refunds a payment', async () => {
      const created = await gateway.createPayment(300, 'INR');
      const refunded = await gateway.refundPayment(created.id, 150);
      expect(refunded.status).toBe('refunded');
      expect(refunded.refundedAmount).toBe(150);
    });

    it('gets payment status', async () => {
      const created = await gateway.createPayment(100, 'INR');
      const status = await gateway.getPaymentStatus(created.id);
      expect(status.status).toBe('pending');
    });

    it('throws PaymentGatewayError for unknown payment', async () => {
      await expect(gateway.getPaymentStatus('nonexistent')).rejects.toThrow(PaymentGatewayError);
    });
  });

  describe('StripePaymentAdapter', () => {
    it('throws if initialized without a secret key', async () => {
      const stripe = new StripePaymentAdapter();
      await expect(stripe.initialize({})).rejects.toThrow(PaymentGatewayError);
    });

    it('throws on createPayment if not initialized', async () => {
      const stripe = new StripePaymentAdapter();
      await expect(stripe.createPayment(100)).rejects.toThrow(PaymentGatewayError);
    });
  });

  describe('createPaymentGateway', () => {
    it('returns a MockPaymentAdapter by default', () => {
      const g = createPaymentGateway();
      expect(g).toBeInstanceOf(MockPaymentAdapter);
    });

    it('returns a StripePaymentAdapter for stripe', () => {
      const g = createPaymentGateway('stripe');
      expect(g).toBeInstanceOf(StripePaymentAdapter);
    });
  });
});
