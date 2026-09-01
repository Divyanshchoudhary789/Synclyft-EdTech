const Razorpay = require('razorpay');
const crypto = require('crypto');
const logger = require('./loggerService');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

class PaymentGatewayService {
  static async createOrder(amount, currency = 'INR', description = '', metadata = {}) {
    try {
      const options = {
        amount: Math.round(amount * 100),
        currency,
        description,
        notes: metadata
      };

      const order = await razorpay.orders.create(options);
      logger.info('Razorpay order created', { orderId: order.id, amount });
      return order;
    } catch (error) {
      logger.error('Failed to create Razorpay order', { error: error.message });
      throw error;
    }
  }

  static async verifyPaymentSignature(orderId, paymentId, signature) {
    try {
      const sign = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(orderId + '|' + paymentId)
        .digest('hex');

      if (sign !== signature) {
        logger.warn('Invalid payment signature', { orderId, paymentId });
        return false;
      }

      logger.info('Payment signature verified', { orderId, paymentId });
      return true;
    } catch (error) {
      logger.error('Error verifying payment signature', { error: error.message });
      throw error;
    }
  }

  static async capturePayment(paymentId, amount, currency = 'INR') {
    try {
      const payment = await razorpay.payments.capture(paymentId, amount * 100, currency);
      logger.info('Payment captured', { paymentId, amount });
      return payment;
    } catch (error) {
      logger.error('Failed to capture payment', { paymentId, error: error.message });
      throw error;
    }
  }

  static async refundPayment(paymentId, amount = null) {
    try {
      const refundOptions = {
        payment_id: paymentId
      };

      if (amount) {
        refundOptions.amount = amount * 100;
      }

      const refund = await razorpay.payments.refund(paymentId, refundOptions);
      logger.info('Payment refunded', { paymentId, refundId: refund.id, amount });
      return refund;
    } catch (error) {
      logger.error('Failed to refund payment', { paymentId, error: error.message });
      throw error;
    }
  }

  static async getPaymentDetails(paymentId) {
    try {
      const payment = await razorpay.payments.fetch(paymentId);
      return payment;
    } catch (error) {
      logger.error('Failed to fetch payment details', { paymentId, error: error.message });
      throw error;
    }
  }

  static async getOrderDetails(orderId) {
    try {
      const order = await razorpay.orders.fetch(orderId);
      return order;
    } catch (error) {
      logger.error('Failed to fetch order details', { orderId, error: error.message });
      throw error;
    }
  }

  static verifyWebhookSignature(rawBody, signature) {
    try {
      if (!rawBody) {
        logger.warn('Missing raw body for webhook signature verification');
        return false;
      }

      const hash = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');

      if (hash !== signature) {
        logger.warn('Invalid webhook signature');
        return false;
      }

      logger.info('Webhook signature verified');
      return true;
    } catch (error) {
      logger.error('Error verifying webhook signature', { error: error.message });
      throw error;
    }
  }

  static generatePaymentLink(orderId, amount, customerEmail, customerPhone, description = '') {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const paymentLink = {
      key: process.env.RAZORPAY_KEY_ID,
      order_id: orderId,
      name: 'EdTech Platform',
      description,
      amount: Math.round(amount * 100),
      currency: 'INR',
      customer_email: customerEmail,
      customer_phone: customerPhone,
      callback_url: `${baseUrl}/payment/success`,
      cancel_url: `${baseUrl}/payment/cancel`,
      theme: {
        color: '#007bff'
      }
    };

    return paymentLink;
  }
}

module.exports = PaymentGatewayService;
