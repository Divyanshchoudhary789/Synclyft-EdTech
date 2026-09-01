const cron = require('node-cron');
const User = require("../models/userModel.js");
const Subscription = require('../models/SubscriptionModel');
const Billing = require('../models/BillingModel');
const SeatManagement = require('../models/SeatManagementModel');
const PaymentGatewayLog = require('../models/PaymentGatewayLogModel');
const Organization = require('../models/OrganizationModel');
const SeatUtilization = require('../models/SeatUtilizationModel');
const Notification = require('../models/NotificationModel');
const RoundDetail = require('../models/RoundDetailModel');
const githubProvider = require("../utils/providers/githubProvider.js")
const codeforcesProvider = require("../utils/providers/codeforcesProvider.js");
const hackerrankProvider = require("../utils/providers/hackerrankProvider.js");
const leetcodeProvider = require("../utils/providers/leetcodeProvider.js");
const logger = require('./loggerService');
const NotificationService = require('./notificationService');
const { SUBSCRIPTION_PLANS, getPlan } = require('../utils/constants');

const providersMap = {
    github: githubProvider.fetchGitHubData,
    codeforces: codeforcesProvider.fetchCodeforcesData,
    hackerrank: hackerrankProvider.fetchHackerRankData,
    leetcode: leetcodeProvider.fetchLeetCodeData,
};

const platforms = ['github', 'codeforces', 'hackerrank', 'leetcode'];

// Everyday at 2:00 AM
cron.schedule('0 2 * * *', async () => {
    logger.info('Starting Global Coding Profiles Background Sync...');

    for (const platform of platforms) {
        try {
            const query = {};
            query[`codingProfiles.${platform}.isVerified`] = true;
            const users = await User.find(query);

            for (let user of users) {
                const profile = user.codingProfiles[platform];
                if (!profile || !profile.username) continue;

                const username = profile.username;
                const fetcher = providersMap[platform];

                if (fetcher) {
                    const freshData = await fetcher(username);
                    if (freshData) {
                        const updateData = {};
                        updateData[`codingProfiles.${platform}.stats`] = freshData.stats;
                        updateData[`codingProfiles.${platform}.lastSyncedAt`] = new Date();

                        await User.findByIdAndUpdate(user._id, { $set: updateData });
                        logger.info(`Auto-synced [${platform}] for ${username}`);
                    }
                }
                // 2 seconds sleep delay to avoid IP blocking from competitive websites
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        } catch (err) {
            logger.error(` Error in cron processing platform ${platform}:`, err.message);
        }
    }
    logger.info('Global Background Sync Finished.');
});

// SUBSCRIPTION & BILLING CRON JOBS

// Everyday at 2:00 AM - Check expiring subscriptions
cron.schedule('0 2 * * *', async () => {
  try {
    logger.info('Starting subscription expiry check');

    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringSubscriptions = await Subscription.find({
      status: 'active',
      endDate: {
        $gte: now,
        $lte: thirtyDaysFromNow
      }
    });

    for (const subscription of expiringSubscriptions) {
      const daysRemaining = Math.ceil((subscription.endDate - now) / (1000 * 60 * 60 * 24));

      await NotificationService.dispatch({
        recipient: subscription.organization.toString(),
        recipientRole: 'college-admin',
        type: 'subscription_expiring',
        title: 'Subscription Expiring Soon',
        message: `Your subscription will expire in ${daysRemaining} days`,
        priority: daysRemaining <= 7 ? 'high' : 'normal',
        relatedEntity: {
          type: 'subscription',
          entityId: subscription._id
        }
      });

      logger.info('Expiry notification created', {
        subscriptionId: subscription._id,
        daysRemaining
      });
    }

    const expiredActiveSubscriptions = await Subscription.find({
      status: 'active',
      endDate: { $lt: now },
      autoRenew: { $ne: true }
    });

    for (const subscription of expiredActiveSubscriptions) {
      await subscription.enterGracePeriod();

      await NotificationService.dispatch({
        recipient: subscription.organization._id,
        recipientRole: 'college-admin',
        type: 'subscription_expiring',
        title: 'Subscription Expired',
        message: `Your subscription has expired. You have 7 days grace period to renew.`,
        priority: 'high',
        relatedEntity: {
          type: 'subscription',
          entityId: subscription._id
        }
      });

      logger.info('Subscription moved to grace period', { subscriptionId: subscription._id });
    }

    logger.info('Subscription expiry check completed', {
      expiringCount: expiringSubscriptions.length,
      expiredCount: expiredActiveSubscriptions.length
    });
  } catch (error) {
    logger.error('Error in subscription expiry check', { error: error.message });
  }
});

// Everyday at 9:00 AM - Send payment reminders for overdue invoices
cron.schedule('0 9 * * *', async () => {
  try {
    logger.info('Starting payment reminder job');

    const overdueInvoices = await Billing.find({
      paymentStatus: 'pending',
      dueDate: { $lt: new Date() }
    });

    for (const invoice of overdueInvoices) {
      const daysOverdue = Math.floor((new Date() - invoice.dueDate) / (1000 * 60 * 60 * 24));

      await NotificationService.dispatch({
        recipient: invoice.organization.toString(),
        recipientRole: 'college-admin',
        type: 'payment_reminder',
        title: 'Payment Overdue',
        message: `Invoice ${invoice.invoiceNumber} is ${daysOverdue} days overdue`,
        priority: 'urgent',
        relatedEntity: {
          type: 'billing',
          entityId: invoice._id
        }
      });

      await invoice.logReminder();

      logger.info('Payment reminder sent', {
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        daysOverdue
      });
    }

    logger.info('Payment reminder job completed', {
      processedCount: overdueInvoices.length
    });
  } catch (error) {
    logger.error('Error in payment reminder job', { error: error.message });
  }
});

// Everyday at 3:00 AM - Auto-renewal for yearly subscriptions
cron.schedule('0 3 * * *', async () => {
  try {
    logger.info('Starting auto-renewal process');

    const now = new Date();

    const expiredSubscriptions = await Subscription.find({
      status: 'active',
      autoRenew: true,
      endDate: { $lt: now }
    });

    const gracePeriodSubscriptions = await Subscription.find({
      status: 'grace_period',
      autoRenew: true,
      endDate: { $lt: now }
    });

    for (const subscription of [...expiredSubscriptions, ...gracePeriodSubscriptions]) {
      const plan = getPlan(subscription.planType, subscription.ownerType);
      if (!plan) continue;

      // `subscription.organization` stores the Organization doc _id for org
      // subs (and the student's User _id for individual subs). Fetch the org
      // doc only when we need org-specific fields like `phone`.
      const orgDoc = subscription.ownerType === 'individual'
        ? null
        : await Organization.findById(subscription.organization).lean();
      const orgPhone = orgDoc ? (orgDoc.phone || '') : '';

      const billingAmount = subscription.billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;

      const invoiceNumber = await Billing.generateInvoiceNumber();
      const billing = new Billing({
        organization: subscription.organization,
        subscription: subscription._id,
        invoiceNumber,
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        billingPeriodStart: subscription.endDate,
        billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        subtotal: billingAmount,
        tax: 0,
        discount: 0,
        totalAmount: billingAmount,
        currency: 'INR',
        paymentStatus: 'pending',
        lineItems: [
          {
            description: `${plan.name} Plan - ${subscription.billingCycle} Renewal`,
            quantity: 1,
            unitPrice: billingAmount,
            totalPrice: billingAmount
          }
        ]
      });

      await billing.save();

      try {
        const paymentOrder = await PaymentGatewayService.createOrder(
          billing.totalAmount,
          'INR',
          `Renewal Invoice ${billing.invoiceNumber}`,
          {
            billingId: billing._id.toString(),
            organizationId: subscription.organization.toString(),
            subscriptionId: subscription._id.toString(),
            type: 'renewal'
          }
        );

        const paymentLog = new PaymentGatewayLog({
          organization: subscription.organization,
          subscription: subscription._id,
          billing: billing._id,
          gateway: 'razorpay',
          orderId: paymentOrder.id,
          amount: billing.totalAmount,
          currency: 'INR',
          status: 'initiated',
          customerEmail: subscription.contactEmail,
          customerPhone: orgPhone,
          description: `Renewal Invoice ${billing.invoiceNumber}`,
          ipAddress: '127.0.0.1',
          userAgent: 'cron-job'
        });

        await paymentLog.save();

        if (subscription.status === 'active' && subscription.endDate < now) {
          subscription.status = 'grace_period';
          const graceEndDate = new Date();
          graceEndDate.setDate(graceEndDate.getDate() + 7);
          subscription.endDate = graceEndDate;
          await subscription.save();
        }

        const paymentLink = PaymentGatewayService.generatePaymentLink(
          paymentOrder.id,
          billing.totalAmount,
          subscription.contactEmail,
          orgPhone,
          `Renewal Invoice ${billing.invoiceNumber}`
        );

      await NotificationService.dispatch({
        recipient: subscription.organization.toString(),
        recipientRole: 'college-admin',
          type: 'payment_due',
          title: 'Subscription Renewal Payment Due',
          message: `Your ${plan.name} plan subscription renewal payment of INR ${billingAmount} is due. Please complete payment to continue service.`,
          actionUrl: '/billing',
          actionText: 'Pay Now',
          priority: 'high',
          metadata: {
            subscriptionId: subscription._id,
            billingId: billing._id,
            paymentLink: paymentLink,
            orderId: paymentOrder.id
          }
        });

        logger.info('Renewal payment initiated', {
          subscriptionId: subscription._id,
          billingId: billing._id,
          orderId: paymentOrder.id
        });
      } catch (paymentError) {
        logger.error('Failed to initiate renewal payment', {
          subscriptionId: subscription._id,
          error: paymentError.message
        });

        if (subscription.status === 'active') {
          await subscription.enterGracePeriod();
        }
      }
    }

    const suspendedSubscriptions = await Subscription.find({
      status: 'grace_period',
      autoRenew: true,
      endDate: { $lt: now }
    });

    for (const subscription of suspendedSubscriptions) {
      await subscription.suspend();

      await NotificationService.dispatch({
        recipient: subscription.organization.toString(),
        recipientRole: 'college-admin',
        type: 'subscription_expired',
        title: 'Subscription Suspended',
        message: `Your subscription has been suspended due to non-payment. Please complete payment to reactivate.`,
        actionUrl: '/billing',
        actionText: 'Retry Payment',
        priority: 'urgent',
        metadata: { subscriptionId: subscription._id }
      });

      logger.info('Subscription suspended', { subscriptionId: subscription._id });
    }

    logger.info('Auto-renewal process completed', {
      processedCount: expiredSubscriptions.length + gracePeriodSubscriptions.length,
      suspendedCount: suspendedSubscriptions.length
    });
  } catch (error) {
    logger.error('Error in auto-renewal process', { error: error.message });
  }
});

// Weekly on Sunday at 4:00 AM - Generate usage reports
cron.schedule('0 4 * * 0', async () => {
  try {
    logger.info('Starting usage report generation');

    const subscriptions = await Subscription.find({ status: 'active' });

    for (const subscription of subscriptions) {
      const seatManagement = await SeatManagement.findOne({
        subscription: subscription._id
      });

      if (seatManagement) {
        await SeatUtilization.recordDailyMetrics(
          subscription,
          seatManagement,
          {
            peakUsage: seatManagement.maxUsedSeatsInMonth,
            newEnrollments: seatManagement.currentMonthMetrics.newEnrollments,
            seatReleases: seatManagement.currentMonthMetrics.seatReleases,
            avgSessionDuration: 0,
            interviewsCompleted: 0,
            resumesUploaded: 0
          }
        );
      }
    }

    logger.info('Usage report generation completed', {
      processedCount: subscriptions.length
    });
  } catch (error) {
    logger.error('Error in usage report generation', { error: error.message });
  }
});

// Daily at 5:00 AM - Cleanup expired notifications (older than 30 days)
cron.schedule('0 5 * * *', async () => {
  try {
    logger.info('Starting notification cleanup');

    const result = await Notification.deleteMany({
      expiresAt: { $lt: new Date() }
    });

    logger.info('Notification cleanup completed', {
      deletedCount: result.deletedCount
    });
  } catch (error) {
    logger.error('Error in notification cleanup', { error: error.message });
  }
});

// Monthly on the 1st at 3:00 AM - Reset per-month usage counters so the
// subscription quota limits (mockInterviews, studentReports, apiCalls, storage)
// are enforced per billing month instead of accumulating forever.
cron.schedule('0 3 1 * *', async () => {
  try {
    const result = await Subscription.updateMany(
      { status: { $in: ['active', 'grace_period'] } },
      {
        $set: {
          currentMonthUsage: {
            mockInterviews: 0,
            studentReports: 0,
            apiCalls: 0,
            storageUsedGB: 0
          }
        }
      }
    );

    logger.info('Monthly subscription usage reset completed', {
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    logger.error('Error in monthly usage reset', { error: error.message });
  }
});

// Daily at 4:00 AM - Cleanup abandoned (never-paid) subscriptions and their
// orphaned billing/payment records. When a user hits /create but never pays,
// the Subscription (pending) + Billing (pending) + PaymentGatewayLog (initiated)
// are left dangling in the DB. This reaps them after a grace window so they
// don't pile up and don't block the user from creating a fresh subscription.
const ABANDONED_SUBSCRIPTION_GRACE_HOURS = 24;
cron.schedule('0 4 * * *', async () => {
  try {
    logger.info('Starting abandoned subscription cleanup');

    const cutoff = new Date(Date.now() - ABANDONED_SUBSCRIPTION_GRACE_HOURS * 60 * 60 * 1000);

    const abandonedSubscriptions = await Subscription.find({
      status: 'pending',
      createdAt: { $lt: cutoff }
    });

    let cleanedSubscriptions = 0;
    let cleanedBillings = 0;
    let cleanedPaymentLogs = 0;
    let cleanedSeatManagements = 0;

    for (const subscription of abandonedSubscriptions) {
      const billings = await Billing.find({
        subscription: subscription._id,
        paymentStatus: 'pending'
      });

      // Only reap if NONE of the invoices were ever paid. If any payment
      // completed, the subscription is mid-flight and must be left alone.
      const anyPaid = billings.some(b => b.paymentStatus === 'completed');
      if (anyPaid) continue;

      const billingIds = billings.map(b => b._id);

      const [delBillings, delPaymentLogs, delSeatMgmt] = await Promise.all([
        Billing.deleteMany({ _id: { $in: billingIds } }),
        PaymentGatewayLog.deleteMany({ subscription: subscription._id }),
        SeatManagement.deleteMany({ subscription: subscription._id })
      ]);

      await Subscription.findByIdAndDelete(subscription._id);

      // Detach from the organization's history so it doesn't resurface.
      await Organization.findByIdAndUpdate(subscription.organization, {
        $unset: { currentSubscription: 1 },
        $pull: { subscriptionHistory: subscription._id }
      });

      cleanedSubscriptions += 1;
      cleanedBillings += delBillings.deletedCount;
      cleanedPaymentLogs += delPaymentLogs.deletedCount;
      cleanedSeatManagements += delSeatMgmt.deletedCount;

      logger.info('Abandoned subscription reaped', {
        subscriptionId: subscription._id,
        ageHours: Math.round((Date.now() - subscription.createdAt.getTime()) / 3600000)
      });
    }

    logger.info('Abandoned subscription cleanup completed', {
      cleanedSubscriptions,
      cleanedBillings,
      cleanedPaymentLogs,
      cleanedSeatManagements,
      graceHours: ABANDONED_SUBSCRIPTION_GRACE_HOURS
    });
  } catch (error) {
    logger.error('Error in abandoned subscription cleanup', { error: error.message });
  }
});

// Every 2 minutes - Safety-net finalizer for round timers.
// If Redis is lost/unavailable, the in-memory sweeper can't fire. This cron
// closes any round whose server-side deadline has passed and is still active,
// using MongoDB (the source of truth) directly.
cron.schedule('*/2 * * * *', async () => {
  try {
    const cutoff = new Date(Date.now() - 2000); // 2s grace
    const result = await RoundDetail.updateMany(
      {
        status: { $ne: 'completed' },
        endsAt: { $exists: true, $lt: cutoff }
      },
      {
        $set: {
          status: 'completed',
          forceEnded: true,
          endedAt: new Date()
        }
      }
    );

    if (result.modifiedCount > 0) {
      logger.info('Timer fallback finalized overdue rounds', {
        modifiedCount: result.modifiedCount
      });
    }
  } catch (error) {
    logger.error('Error in timer fallback finalizer', { error: error.message });
  }
});