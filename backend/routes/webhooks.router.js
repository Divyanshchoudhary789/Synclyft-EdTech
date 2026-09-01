const express = require('express');
const router = express.Router();
const PaymentGatewayService = require('../services/paymentGatewayService');
const PaymentGatewayLog = require('../models/PaymentGatewayLogModel');
const Billing = require('../models/BillingModel');
const Subscription = require('../models/SubscriptionModel.js');
const NotificationService = require('../services/notificationService');
const logger = require('../services/loggerService');
const { ApiError } = require('../utils/errorHandler.js');

router.post('/razorpay-webhook', async (req, res) => {
  try {
    const { event } = req.body;
    const signature = req.headers['x-razorpay-signature'];

    const isValidSignature = PaymentGatewayService.verifyWebhookSignature(
      req.rawBody,
      signature
    );

    if (!isValidSignature) {
      logger.warn('Invalid webhook signature received');
      return res.status(401).json({
        success: false,
        message: 'Invalid signature'
      });
    }

    if (event === 'payment.authorized') {
      const paymentData = req.body.payload.payment.entity;
      const paymentLog = await PaymentGatewayLog.findOne({
        orderId: paymentData.order_id
      });

      if (!paymentLog) {
        logger.warn('Payment log not found for webhook', { orderId: paymentData.order_id, paymentId: paymentData.id });
        return res.status(200).json({
          success: true,
          message: 'Webhook received but no matching payment log found'
        });
      }

      const BillingController = require('../controllers/billingController.js');

      paymentLog.paymentId = paymentData.id;
      paymentLog.paymentMethod = BillingController.normalizePaymentMethod(paymentData.method) || paymentLog.paymentMethod;
      await paymentLog.save();

      logger.info('Payment authorized via webhook', { paymentId: paymentData.id, orderId: paymentData.order_id });
    }

    if (event === 'payment.captured') {
      const paymentData = req.body.payload.payment.entity;
      const paymentLog = await PaymentGatewayLog.findOne({
        orderId: paymentData.order_id
      });

      if (!paymentLog) {
        logger.warn('Payment log not found for webhook', { orderId: paymentData.order_id, paymentId: paymentData.id });
        return res.status(200).json({
          success: true,
          message: 'Webhook received but no matching payment log found'
        });
      }

      if (paymentLog.webhookReceived) {
        logger.info('Webhook already processed, skipping duplicate', { orderId: paymentData.order_id });
        return res.status(200).json({
          success: true,
          message: 'Webhook already processed'
        });
      }

      if (paymentData.amount !== Math.round(paymentLog.amount * 100)) {
        logger.error('Webhook amount mismatch', {
          orderId: paymentData.order_id,
          razorpayAmount: paymentData.amount,
          expected: paymentLog.amount * 100
        });
        return res.status(200).json({
          success: true,
          message: 'Amount mismatch, manual review required'
        });
      }

      const BillingController = require('../controllers/billingController.js');

      paymentLog.status = 'captured';
      paymentLog.paymentId = paymentData.id;
      paymentLog.paymentMethod = BillingController.normalizePaymentMethod(paymentData.method) || paymentLog.paymentMethod;
      paymentLog.webhookReceived = true;
      paymentLog.webhookReceivedAt = new Date();
      paymentLog.rawResponse = paymentData;
      await paymentLog.save();

      if (paymentLog.billing) {
        const billing = await Billing.findById(paymentLog.billing);
        if (billing && billing.paymentStatus !== 'completed') {
          await billing.markAsPaid(paymentData.id, BillingController.normalizePaymentMethod(paymentData.method));

          if (billing.subscription) {
            const SubscriptionController = require('../controllers/subscriptionController.js');
            await SubscriptionController.activateSubscription(
              billing.subscription.toString(),
              billing._id.toString(),
              paymentData.id
            );
          }
        }
      }

      try {
        const billing = await Billing.findById(paymentLog.billing).populate('subscription');
        if (billing) {
          const isIndividual = billing.subscription && billing.subscription.ownerType === 'individual';
          await NotificationService.dispatch({
            recipient: billing.organization,
            recipientRole: isIndividual ? 'student' : 'college-admin',
            type: 'payment_due',
            title: 'Payment Received',
            message: `Payment of INR ${(paymentData.amount / 100).toFixed(2)} received for invoice ${billing.invoiceNumber}.`,
            actionUrl: isIndividual ? '/student/dashboard' : '/billing',
            actionText: 'View Invoice',
            priority: 'normal',
            metadata: { billingId: billing._id, paymentId: paymentData.id }
          });
        }
      } catch (notifErr) {
        logger.warn("Payment success notification failed:", notifErr);
      }

      logger.info('Payment verified via webhook', {
        paymentId: paymentData.id,
        amount: paymentData.amount / 100
      });
    }

    if (event === 'payment.failed') {
      const paymentData = req.body.payload.payment.entity;
      const paymentLog = await PaymentGatewayLog.findOne({
        orderId: paymentData.order_id
      });

      if (paymentLog) {
        paymentLog.paymentId = paymentData.id;
        await paymentLog.markAsFailed(
          paymentData.error_code,
          paymentData.error_description
        );

        if (paymentLog.billing) {
          const billing = await Billing.findById(paymentLog.billing);
          if (billing) {
            await billing.markAsFailed(paymentData.error_description);

            if (billing.subscription) {
              const subscription = await Subscription.findById(billing.subscription);
              if (subscription) {
                if (subscription.status === 'pending') {
                  await subscription.enterGracePeriod();
                }
              }
            }
          }
        }

        try {
          const billing = await Billing.findById(paymentLog.billing);
          if (billing) {
            await NotificationService.dispatch({
              recipient: billing.organization,
              recipientRole: 'college-admin',
              type: 'payment_reminder',
              title: 'Payment Failed',
              message: `Payment of INR ${(paymentData.amount / 100).toFixed(2)} failed for invoice ${billing.invoiceNumber}. Please retry.`,
              actionUrl: '/billing',
              actionText: 'Retry Payment',
              priority: 'urgent',
              metadata: { billingId: billing._id, errorCode: paymentData.error_code }
            });
          }
        } catch (notifErr) {
          logger.warn("Payment failed notification failed:", notifErr);
        }

        logger.warn('Payment failed via webhook', {
          paymentId: paymentData.id,
          errorCode: paymentData.error_code
        });
      }
    }

    if (event === 'refund.created') {
      const refundData = req.body.payload.refund.entity;
      const paymentLog = await PaymentGatewayLog.findOne({
        paymentId: refundData.payment_id
      });

      if (paymentLog && paymentLog.billing) {
        const billing = await Billing.findById(paymentLog.billing);
        if (billing) {
          billing.refundAmount = refundData.amount / 100;
          billing.refundDate = new Date();
          billing.paymentStatus = 'refunded';
          await billing.save();

          if (billing.subscription) {
            const subscription = await Subscription.findById(billing.subscription);
            if (subscription && subscription.status === 'active') {
              subscription.status = 'suspended';
              subscription.autoRenew = false;
              await subscription.save();

              if (subscription.ownerType === 'individual') {
                const SeatManagement = require('../models/SeatManagementModel');
                const seatManagement = await SeatManagement.findOne({ subscription: subscription._id });
                if (seatManagement) {
                  try {
                    await seatManagement.releaseSeatFromStudent(subscription.organization);
                  } catch (seatErr) {
                    logger.warn('Seat release on refund failed', { subscriptionId: subscription._id, error: seatErr.message });
                  }
                }
              }

              logger.info('Subscription suspended after refund', { subscriptionId: subscription._id });
            }
          }

          logger.info('Refund recorded via webhook', {
            refundId: refundData.id,
            amount: refundData.amount / 100
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Webhook processed successfully'
    });
  } catch (error) {
    logger.error('Error processing webhook', {
      error: error.message,
      body: req.body
    });

    return res.status(500).json({
      success: false,
      message: 'Error processing webhook'
    });
  }
});

module.exports = router;
