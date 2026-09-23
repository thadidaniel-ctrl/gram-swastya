class PaymentGatewayError extends Error {
  constructor(message, code, details) {
    super(message);
    this.name = 'PaymentGatewayError';
    this.code = code;
    this.details = details;
  }
}

class PaymentGateway {
  constructor() {
    if (new.target === PaymentGateway) {
      throw new TypeError('PaymentGateway is abstract; use a concrete adapter');
    }
  }

  async initialize(_config) {
    throw new Error('initialize() must be implemented');
  }

  async createPayment(_amount, _currency, _metadata) {
    throw new Error('createPayment() must be implemented');
  }

  async confirmPayment(_paymentId) {
    throw new Error('confirmPayment() must be implemented');
  }

  async refundPayment(_paymentId, _amount) {
    throw new Error('refundPayment() must be implemented');
  }

  async getPaymentStatus(_paymentId) {
    throw new Error('getPaymentStatus() must be implemented');
  }
}

class MockPaymentAdapter extends PaymentGateway {
  constructor() {
    super();
    this.payments = new Map();
    this.initialized = false;
  }

  async initialize() {
    this.initialized = true;
    return { success: true, adapter: 'mock' };
  }

  async createPayment(amount, currency = 'INR', metadata = {}) {
    if (!this.initialized) await this.initialize();
    const paymentId = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const payment = {
      id: paymentId,
      amount,
      currency,
      status: 'pending',
      metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.payments.set(paymentId, payment);
    return payment;
  }

  async confirmPayment(paymentId) {
    const payment = this.payments.get(paymentId);
    if (!payment) throw new PaymentGatewayError('Payment not found', 'NOT_FOUND');
    payment.status = 'completed';
    payment.updatedAt = new Date().toISOString();
    this.payments.set(paymentId, payment);
    return payment;
  }

  async refundPayment(paymentId, amount) {
    const payment = this.payments.get(paymentId);
    if (!payment) throw new PaymentGatewayError('Payment not found', 'NOT_FOUND');
    payment.status = 'refunded';
    payment.refundedAmount = amount;
    payment.updatedAt = new Date().toISOString();
    this.payments.set(paymentId, payment);
    return payment;
  }

  async getPaymentStatus(paymentId) {
    const payment = this.payments.get(paymentId);
    if (!payment) throw new PaymentGatewayError('Payment not found', 'NOT_FOUND');
    return payment;
  }
}

class StripePaymentAdapter extends PaymentGateway {
  constructor() {
    super();
    this.stripe = null;
    this.initialized = false;
  }

  async initialize(_config) {
    if (!_config || !_config.stripeSecretKey) {
      throw new PaymentGatewayError('Stripe secret key required', 'MISSING_CONFIG');
    }
    // In production: this.stripe = new Stripe(config.stripeSecretKey);
    this.initialized = true;
    return { success: true, adapter: 'stripe' };
  }

  async createPayment(_amount, _currency = 'inr', _metadata = {}) {
    if (!this.initialized)
      throw new PaymentGatewayError('Stripe not initialized', 'NOT_INITIALIZED');
    return {
      id: `pi_stripe_${Date.now()}`,
      status: 'requires_confirmation',
    };
  }

  async confirmPayment(_paymentId) {
    if (!this.initialized)
      throw new PaymentGatewayError('Stripe not initialized', 'NOT_INITIALIZED');
    return { status: 'completed' };
  }

  async refundPayment(_paymentId, _amount) {
    if (!this.initialized)
      throw new PaymentGatewayError('Stripe not initialized', 'NOT_INITIALIZED');
    return { status: 'refunded' };
  }

  async getPaymentStatus(_paymentId) {
    if (!this.initialized)
      throw new PaymentGatewayError('Stripe not initialized', 'NOT_INITIALIZED');
    return { status: 'completed' };
  }
}

function createPaymentGateway(type = 'mock', _config) {
  switch (type) {
    case 'stripe':
      return new StripePaymentAdapter();
    case 'mock':
    default:
      return new MockPaymentAdapter();
  }
}

module.exports = {
  PaymentGateway,
  MockPaymentAdapter,
  StripePaymentAdapter,
  createPaymentGateway,
  PaymentGatewayError,
};
