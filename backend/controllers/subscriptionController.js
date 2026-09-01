const Subscription = require('../models/SubscriptionModel');
const Billing = require('../models/BillingModel');
const Organization = require('../models/OrganizationModel');
const SeatManagement = require('../models/SeatManagementModel');
const User = require('../models/userModel');
const PaymentGatewayLog = require('../models/PaymentGatewayLogModel');
const PaymentGatewayService = require('../services/paymentGatewayService');
const logger = require('../services/loggerService.js');
const NotificationService = require('../services/notificationService');
const { ApiError } = require('../utils/errorHandler');
const { SUBSCRIPTION_PLANS, STUDENT_PLANS, getPlan, TAX_RATE } = require('../utils/constants');
const { resolveOwnerIds: resolveOwnerId } = require('../utils/ownership');
const mongoose = require('mongoose');

function computeInvoiceTotals(subtotal) {
  const tax = Math.round(subtotal * TAX_RATE);
  const totalAmount = subtotal + tax;
  return { tax, totalAmount };
}


class SubscriptionController {
  static async createSubscription(req, res) {
    const { planId, seats, billingCycle, autoRenew = true } = req.body;

    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    const organization = await Organization.findOne({ user: userId });
    if (!organization) {
      return res.status(404).json({ message: "Organization not found!" });
    }

    const organizationId = organization?._id;

    // Block if there's a live (paid-for or renewing) subscription.
    const existingLive = await Subscription.findOne({
      organization: organizationId,
      status: { $in: ['active', 'grace_period'] }
    });
    if (existingLive) {
      return res.status(409).json({
        message: "Organization already has an active subscription"
      });
    }

    // Allow re-creating after a cancellation, but reuse an existing PENDING
    // (abandoned/unpaid) subscription instead of spawning duplicates. This
    // also prevents orphaning a previous pending billing record.
    const existingPending = await Subscription.findOne({
      organization: organizationId,
      status: 'pending'
    });

    if (existingPending) {
      const pendingBilling = await Billing.findOne({
        subscription: existingPending._id,
        paymentStatus: 'pending'
      });

      if (pendingBilling) {
        const paymentOrder = await PaymentGatewayService.createOrder(
          pendingBilling.totalAmount,
          'INR',
          `Invoice ${pendingBilling.invoiceNumber}`,
          {
            billingId: pendingBilling._id.toString(),
            organizationId: organizationId.toString(),
            subscriptionId: existingPending._id.toString()
          }
        );

        const paymentLog = new PaymentGatewayLog({
          organization: organizationId,
          subscription: existingPending._id,
          billing: pendingBilling._id,
          gateway: 'razorpay',
          orderId: paymentOrder.id,
          amount: pendingBilling.totalAmount,
          currency: 'INR',
          status: 'initiated',
          customerEmail: user.email,
          customerPhone: organization.phone || '',
          description: `Invoice ${pendingBilling.invoiceNumber}`,
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        });

        await paymentLog.save();

        const paymentLink = PaymentGatewayService.generatePaymentLink(
          paymentOrder.id,
          pendingBilling.totalAmount,
          user.email,
          organization.phone || '',
          `Invoice ${pendingBilling.invoiceNumber}`
        );

        logger.info('Reused pending subscription for existing unpaid order', {
          subscriptionId: existingPending._id,
          billingId: pendingBilling._id,
          orderId: paymentOrder.id
        });

        return res.status(200).json({
          success: true,
          message: 'Complete payment to activate your pending subscription.',
          data: {
            subscription: existingPending,
            billing: pendingBilling,
            paymentLink,
            orderId: paymentOrder.id
          }
        });
      }

      // Pending subscription exists but its billing was already paid/cleaned up.
      // Remove the stale empty subscription so a fresh one can be created.
      await Subscription.findByIdAndDelete(existingPending._id);
      await SeatManagement.findOneAndDelete({ subscription: existingPending._id });
      await Organization.findByIdAndUpdate(organizationId, {
        $unset: { currentSubscription: 1 },
        $pull: { subscriptionHistory: existingPending._id }
      });
    }

    const plan = getPlan(planId, 'organization');
    if (!plan) {
      return res.status(400).json({ message: "Invalid plan selected" });
    }

    const subscriptionDoc = new Subscription({
      organization: organizationId,
      planType: planId,
      totalSeats: seats,
      usedSeats: 0,
      amount: billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice,
      billingCycle,
      status: 'pending',
      autoRenew,
      features: plan.features,
      limits: plan.limits,
      contactEmail: user.email,
      startDate: new Date()
    });

    const endDate = new Date();
    if (billingCycle === 'monthly') endDate.setMonth(endDate.getMonth() + 1);
    else if (billingCycle === 'quarterly') endDate.setMonth(endDate.getMonth() + 3);
    else if (billingCycle === 'yearly') endDate.setFullYear(endDate.getFullYear() + 1);

    subscriptionDoc.endDate = endDate;
    subscriptionDoc.nextBillingDate = endDate;

    const seatManagement = new SeatManagement({
      subscription: subscriptionDoc._id,
      organization: organizationId,
      totalSeatsAllocated: seats,
      availableSeats: seats
    });

    const session = await mongoose.startSession();
    let subscription, billing;
    try {
      await session.withTransaction(async () => {
        const invoiceNumber = await Billing.generateInvoiceNumber(session);
        const billingDoc = new Billing({
          organization: organizationId,
          subscription: subscriptionDoc._id,
          invoiceNumber,
          invoiceDate: new Date(),
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          billingPeriodStart: new Date(),
          billingPeriodEnd: endDate,
          subtotal: subscriptionDoc.amount,
          ...computeInvoiceTotals(subscriptionDoc.amount),
          discount: 0,
          currency: 'INR',
          paymentStatus: 'pending',
          lineItems: [
            {
              description: `${plan.name} Plan - ${billingCycle} Subscription`,
              quantity: 1,
              unitPrice: subscriptionDoc.amount,
              totalPrice: subscriptionDoc.amount
            }
          ]
        });

        await subscriptionDoc.save({ session });
        await seatManagement.save({ session });
        await billingDoc.save({ session });

        await Organization.findByIdAndUpdate(organizationId, {
          currentSubscription: subscriptionDoc._id,
          $push: { subscriptionHistory: subscriptionDoc._id }
        }, { session });

        subscription = subscriptionDoc;
        billing = billingDoc;
      });

      const paymentOrder = await PaymentGatewayService.createOrder(
        billing.totalAmount,
        'INR',
        `Invoice ${billing.invoiceNumber}`,
        {
          billingId: billing._id.toString(),
          organizationId: organizationId.toString(),
          subscriptionId: subscription._id.toString()
        }
      );

      const paymentLog = new PaymentGatewayLog({
        organization: organizationId,
        subscription: subscription._id,
        billing: billing._id,
        gateway: 'razorpay',
        orderId: paymentOrder.id,
        amount: billing.totalAmount,
        currency: 'INR',
        status: 'initiated',
        customerEmail: user.email,
        customerPhone: organization.phone || '',
        description: `Invoice ${billing.invoiceNumber}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      await paymentLog.save();

      const paymentLink = PaymentGatewayService.generatePaymentLink(
        paymentOrder.id,
        billing.totalAmount,
        user.email,
        organization.phone || '',
        `Invoice ${billing.invoiceNumber}`
      );

      logger.info('Subscription created with pending payment', {
        subscriptionId: subscription._id,
        billingId: billing._id,
        orderId: paymentOrder.id
      });

      return res.status(201).json({
        success: true,
        message: 'Subscription created successfully. Complete payment to activate.',
        data: {
          subscription,
          billing,
          paymentLink,
          orderId: paymentOrder.id
        }
      });
    } catch (error) {
      await Subscription.findByIdAndDelete(subscriptionDoc._id);
      await SeatManagement.findOneAndDelete({ subscription: subscriptionDoc._id });
      await Billing.findByIdAndDelete(billing?._id);
      await PaymentGatewayLog.findOneAndDelete({ billing: billing?._id });
      await Organization.findByIdAndUpdate(organizationId, {
        $unset: { currentSubscription: 1 },
        $pull: { subscriptionHistory: subscriptionDoc._id }
      });

      logger.error('Subscription creation failed', {
        error: error.message,
        subscriptionId: subscriptionDoc._id
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to create subscription. Please try again.',
        error: error.message
      });
    } finally {
      await session.endSession();
    }
  }

  static async activateSubscription(subscriptionId, billingId, paymentId) {
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      throw new ApiError(404, 'Subscription not found');
    }

    if (subscription.isActive()) {
      return subscription;
    }

    subscription.status = 'active';
    subscription.paymentHistory = subscription.paymentHistory || [];
    subscription.paymentHistory.push(billingId);
    await subscription.save();

    if (billingId) {
      await Billing.findByIdAndUpdate(billingId, {
        paymentStatus: 'completed',
        paymentDate: new Date(),
        transactionId: paymentId
      });
    }

    const organization = await Organization.findById(subscription.organization);
    if (organization) {
      try {
        await NotificationService.dispatch({
          recipient: organization.user,
          recipientRole: 'college-admin',
          type: 'subscription_expiring',
          title: 'Subscription Activated',
          message: `Your ${subscription.planType} plan subscription is now active.`,
          actionUrl: `/subscriptions/details/${subscription._id}`,
          actionText: 'View Subscription',
          priority: 'normal',
          metadata: { subscriptionId: subscription._id, paymentId }
        });
      } catch (notifErr) {
        logger.warn("Subscription activation notification failed:", notifErr);
      }
    }

    // Self-serve (individual) subscription: the owner student gets their own
    // single seat allocated automatically once payment succeeds.
    if (subscription.ownerType === 'individual') {
      const seatManagement = await SeatManagement.findOne({ subscription: subscription._id });
      if (seatManagement) {
        try {
          await seatManagement.allocateSeatToStudent(subscription.organization);
        } catch (seatErr) {
          logger.warn('Individual seat allocation skipped', { subscriptionId: subscription._id, error: seatErr.message });
        }
      }

      try {
        await NotificationService.dispatch({
          recipient: subscription.organization,
          recipientRole: 'student',
          type: 'subscription_expiring',
          title: 'Subscription Activated',
          message: `Your ${subscription.planType} plan subscription is now active. You now have full access to all included features.`,
          actionUrl: '/student/dashboard',
          actionText: 'Start Practicing',
          priority: 'normal',
          metadata: { subscriptionId: subscription._id, paymentId }
        });
      } catch (notifErr) {
        logger.warn("Individual subscription activation notification failed:", notifErr);
      }
    }

    logger.info('Subscription activated', {
      subscriptionId: subscription._id,
      billingId,
      paymentId
    });

    return subscription;
  }

  static async getCurrentSubscription(req, res) {
    const { organizationId } = req.params;

    const isSuperAdmin = req.user.role === 'super-admin';
    const ownerIds = await resolveOwnerId(req);
    const isOwner = ownerIds.includes(organizationId);

    if (!isSuperAdmin && !isOwner) {
      throw new ApiError(403, 'Unauthorized access to this subscription');
    }

    const subscription = await Subscription.findOne({
      organization: organizationId,
      status: { $in: ['active', 'inactive', 'pending', 'grace_period'] }
    });

    if (!subscription) {
      throw new ApiError(404, 'No active subscription found');
    }

    const seatManagement = await SeatManagement.findOne({
      subscription: subscription._id
    });

    return res.status(200).json({
      success: true,
      data: {
        subscription,
        seatManagement
      }
    });
  }

  static async getSubscriptionDetails(req, res) {
    const { subscriptionId } = req.params;

    const subscription = await Subscription.findById(subscriptionId);

    if (!subscription) {
      throw new ApiError(404, 'Subscription not found');
    }

    // `subscription.organization` stores either the Organization doc _id
    // (college-admin) or the student's User _id (individual). The schema ref
    // is 'User', so a plain populate would null out college-admin records and
    // break ownership checks. Resolve the raw id first, then authorize.
    const subOrgId = subscription.organization ? subscription.organization.toString() : null;
    const isSuperAdmin = req.user.role === 'super-admin';
    const ownerIds = await resolveOwnerId(req);
    const isOwner = !!subOrgId && ownerIds.includes(subOrgId);

    if (!isSuperAdmin && !isOwner) {
      throw new ApiError(403, 'Unauthorized access to this subscription');
    }

    // Populate for response only (after auth). For individual subs this is a
    // User; for org subs it points at an Org id via the 'User' ref, so guard
    // the projection to avoid overwriting the stored id used above.
    await subscription.populate('organization', 'name email organizationName');

    const seatManagement = await SeatManagement.findOne({
      subscription: subscription._id
    });

    const usage = await Billing.find({
      subscription: subscription._id,
      paymentStatus: 'completed'
    })
      .sort({ invoiceDate: -1 })
      .limit(12);

    return res.status(200).json({
      success: true,
      data: {
        subscription,
        seatManagement,
        billingHistory: usage
      }
    });
  }

  static async upgradeSubscription(req, res) {
    const { subscriptionId, newPlanId, newSeats } = req.body;

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      throw new ApiError(404, 'Subscription not found');
    }

    const isSuperAdmin = req.user.role === 'super-admin';
    const subOrgId = subscription.organization ? subscription.organization.toString() : null;
    const ownerIds = await resolveOwnerId(req);
    const isOwner = !!subOrgId && ownerIds.includes(subOrgId);

    if (!isSuperAdmin && !isOwner) {
      throw new ApiError(403, 'Unauthorized to upgrade this subscription');
    }

    if (!subscription.isActive() && !subscription.isPending() && !subscription.isInGracePeriod()) {
      throw new ApiError(400, 'Subscription is not active or in grace period');
    }

    const oldPlanType = subscription.planType;
    const oldPlanPrice = subscription.amount;
    const newPlanPrice = getPlan(newPlanId, subscription.ownerType).monthlyPrice;
    const newSeatsCount = subscription.ownerType === 'individual' ? 1 : (newSeats || getPlan(newPlanId, subscription.ownerType).seats);

    const daysRemaining = Math.ceil((subscription.endDate - new Date()) / (1000 * 60 * 60 * 24));
    const prorateFactor = daysRemaining > 0 ? daysRemaining / 30 : 0;
    const upgradeCost = (newPlanPrice - oldPlanPrice) * prorateFactor;

    subscription.planType = newPlanId;
    subscription.amount = newPlanPrice;
    subscription.totalSeats = newSeatsCount;
    subscription.features = getPlan(newPlanId, subscription.ownerType).features;
    subscription.limits = getPlan(newPlanId, subscription.ownerType).limits;

    const session = await mongoose.startSession();
    let billing, payment = null;
    try {
      await session.withTransaction(async () => {
        await subscription.save({ session });

        const seatManagement = await SeatManagement.findOne({
          subscription: subscription._id
        });

        seatManagement.totalSeatsAllocated = newSeatsCount;
        seatManagement.availableSeats = newSeatsCount - seatManagement.usedSeats;
        await seatManagement.save({ session });

        if (upgradeCost > 0) {
          const invoiceNumber = await Billing.generateInvoiceNumber(session);
          const billingDoc = new Billing({
            organization: subscription.organization,
            subscription: subscription._id,
            invoiceNumber,
            invoiceDate: new Date(),
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            billingPeriodStart: new Date(),
            billingPeriodEnd: endDate,
            subtotal: upgradeCost,
            ...computeInvoiceTotals(upgradeCost),
            discount: 0,
            currency: 'INR',
            paymentStatus: 'pending',
            lineItems: [
              {
                description: `Plan Upgrade: ${oldPlanType} → ${newPlanId} (Prorated)`,
                quantity: 1,
                unitPrice: upgradeCost,
                totalPrice: upgradeCost
              }
            ]
          });

          await billingDoc.save({ session });
          billing = billingDoc;
        }
      });

      if (upgradeCost > 0 && billing) {
        const paymentOrder = await PaymentGatewayService.createOrder(
          billing.totalAmount,
          'INR',
          `Upgrade ${billing.invoiceNumber}`,
          {
            billingId: billing._id.toString(),
            subscriptionId: subscription._id.toString(),
            type: 'upgrade'
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
          customerPhone: '',
          description: `Upgrade ${billing.invoiceNumber}`,
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        });

        await paymentLog.save();

        const paymentLink = PaymentGatewayService.generatePaymentLink(
          paymentOrder.id,
          billing.totalAmount,
          subscription.contactEmail,
          '',
          `Upgrade ${billing.invoiceNumber}`
        );

        payment = {
          billing,
          paymentLink,
          orderId: paymentOrder.id
        };

        logger.info('Upgrade proration payment initiated', {
          subscriptionId: subscription._id,
          billingId: billing._id,
          orderId: paymentOrder.id
        });
      }

      logger.info('Subscription upgraded', {
        subscriptionId: subscription._id,
        oldPlan: oldPlanType,
        newPlan: newPlanId,
        upgradeCost
      });

      return res.status(200).json({
        success: true,
        message: upgradeCost > 0
          ? 'Subscription upgraded. Complete the prorated payment to finalize.'
          : 'Subscription upgraded successfully',
        data: {
          subscription,
          upgradeCost,
          daysRemaining,
          payment
        }
      });
    } catch (error) {
      logger.error('Subscription upgrade failed', {
        error: error.message,
        subscriptionId: subscription._id
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to upgrade subscription. Please try again.',
        error: error.message
      });
    } finally {
      await session.endSession();
    }
  }

  static async downgradeSubscription(req, res) {
    const { subscriptionId, newPlanId, newSeats } = req.body;

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      throw new ApiError(404, 'Subscription not found');
    }

    const isSuperAdmin = req.user.role === 'super-admin';
    const subOrgId = subscription.organization ? subscription.organization.toString() : null;
    const ownerIds = await resolveOwnerId(req);
    const isOwner = !!subOrgId && ownerIds.includes(subOrgId);

    if (!isSuperAdmin && !isOwner) {
      throw new ApiError(403, 'Unauthorized to downgrade this subscription');
    }

    if (!subscription.isActive()) {
      throw new ApiError(400, 'Subscription is not active');
    }

    const newSeatsCount = subscription.ownerType === 'individual' ? 1 : (newSeats || getPlan(newPlanId, subscription.ownerType).seats);
    const seatManagement = await SeatManagement.findOne({
      subscription: subscription._id
    });

    if (seatManagement.usedSeats > newSeatsCount) {
      throw new ApiError(400, 'Cannot downgrade: used seats exceed new plan capacity');
    }

    subscription.planType = newPlanId;
    subscription.amount = getPlan(newPlanId, subscription.ownerType).monthlyPrice;
    subscription.totalSeats = newSeatsCount;
    subscription.features = getPlan(newPlanId, subscription.ownerType).features;
    subscription.limits = getPlan(newPlanId, subscription.ownerType).limits;

    await subscription.save();

    seatManagement.totalSeatsAllocated = newSeatsCount;
    seatManagement.availableSeats = newSeatsCount - seatManagement.usedSeats;
    await seatManagement.save();

    logger.info('Subscription downgraded', {
      subscriptionId: subscription._id,
      newPlan: newPlanId,
      newSeats: newSeatsCount
    });

    return res.status(200).json({
      success: true,
      message: 'Subscription downgraded successfully',
      data: { subscription }
    });
  }

  static async cancelSubscription(req, res) {
    const { subscriptionId, reason } = req.body;

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      throw new ApiError(404, 'Subscription not found');
    }

    const isSuperAdmin = req.user.role === 'super-admin';
    const subOrgId = subscription.organization ? subscription.organization.toString() : null;

    // If the subscription has no linked organization we cannot verify
    // ownership — reject instead of crashing on undefined.toString().
    if (!subOrgId) {
      logger.warn('Cancel attempted on subscription with missing organization', {
        subscriptionId
      });
      throw new ApiError(400, 'Subscription is missing organization linkage');
    }

    // College-admin subs link to the Organization doc _id; individual (student)
    // subs link to the user _id. Resolve both candidate ids and match.
    const ownerIds = await resolveOwnerId(req);
    const isOwner = ownerIds.includes(subOrgId);

    if (!isSuperAdmin && !isOwner) {
      throw new ApiError(403, 'Unauthorized to cancel this subscription');
    }

    if (subscription.status === 'cancelled') {
      throw new ApiError(400, 'Subscription is already cancelled');
    }

    subscription.status = 'cancelled';
    subscription.cancelledDate = new Date();
    subscription.cancellationReason = reason;
    subscription.autoRenew = false;
    await subscription.save();

    try {
      await NotificationService.dispatch({
        recipient: req.user.id,
        recipientRole: req.user.role || 'college-admin',
        type: 'subscription_expired',
        title: 'Subscription Cancelled',
        message: `Your subscription has been cancelled.${reason ? ' Reason: ' + reason : ''}`,
        actionUrl: '/subscriptions',
        actionText: 'View Subscriptions',
        priority: 'high',
        metadata: { subscriptionId: subscription._id, reason }
      });
    } catch (notifErr) {
      logger.warn("Subscription cancellation notification failed:", notifErr);
    }

    logger.info('Subscription cancelled', { subscriptionId, reason });

    return res.status(200).json({
      success: true,
      message: 'Subscription cancelled successfully'
    });
  }

  static async getSubscriptionUsage(req, res) {
    const { subscriptionId } = req.params;

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      throw new ApiError(404, 'Subscription not found');
    }

    const isSuperAdmin = req.user.role === 'super-admin';
    const subOrgId = subscription.organization ? subscription.organization.toString() : null;
    const ownerIds = await resolveOwnerId(req);
    const isOwner = !!subOrgId && ownerIds.includes(subOrgId);

    if (!isSuperAdmin && !isOwner) {
      throw new ApiError(403, 'Unauthorized access to this subscription');
    }

    const currentUsage = subscription.currentMonthUsage || {};

    return res.status(200).json({
      success: true,
      data: {
        subscription: {
          planType: subscription.planType,
          totalSeats: subscription.totalSeats,
          usedSeats: subscription.usedSeats
        },
        usage: currentUsage,
        limits: subscription.limits,
        features: subscription.features
      }
    });
  }

  static async getAvailableFeatures(req, res) {
    const { subscriptionId } = req.params;

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      throw new ApiError(404, 'Subscription not found');
    }

    const isSuperAdmin = req.user.role === 'super-admin';
    const subOrgId = subscription.organization ? subscription.organization.toString() : null;
    const ownerIds = await resolveOwnerId(req);
    const isOwner = !!subOrgId && ownerIds.includes(subOrgId);

    if (!isSuperAdmin && !isOwner) {
      throw new ApiError(403, 'Unauthorized access to this subscription');
    }

    if (!subscription.isActive() && !subscription.isInGracePeriod()) {
      throw new ApiError(400, 'Subscription is not active or in grace period');
    }

    const enabledFeatures = Object.keys(subscription.features).filter(
      key => subscription.features[key] === true
    );

    return res.status(200).json({
      success: true,
      data: {
        enabledFeatures,
        allFeatures: subscription.features,
        limits: subscription.limits
      }
    });
  }

  static async renewSubscription(req, res) {
    const { subscriptionId } = req.body;

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      throw new ApiError(404, 'Subscription not found');
    }

    const isSuperAdmin = req.user.role === 'super-admin';
    const subOrgId = subscription.organization ? subscription.organization.toString() : null;
    const ownerIds = await resolveOwnerId(req);
    const isOwner = !!subOrgId && ownerIds.includes(subOrgId);

    if (!isSuperAdmin && !isOwner) {
      throw new ApiError(403, 'Unauthorized to renew this subscription');
    }

    if (!subscription.isActive() && !subscription.isInGracePeriod()) {
      throw new ApiError(400, 'Subscription is not active or in grace period');
    }

    const plan = getPlan(subscription.planType, subscription.ownerType);
    if (!plan) {
      throw new ApiError(400, 'Invalid plan');
    }

    const session = await mongoose.startSession();
    let billing;
    try {
      await session.withTransaction(async () => {
        const invoiceNumber = await Billing.generateInvoiceNumber(session);
        const billingAmount = subscription.billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
        const billingDoc = new Billing({
          organization: subscription.organization,
          subscription: subscriptionId,
          invoiceNumber,
          invoiceDate: new Date(),
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          billingPeriodStart: new Date(),
          billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          subtotal: billingAmount,
          ...computeInvoiceTotals(billingAmount),
          discount: 0,
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
        await billingDoc.save({ session });
        billing = billingDoc;
      });

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
        customerPhone: '',
        description: `Renewal Invoice ${billing.invoiceNumber}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      await paymentLog.save();

      logger.info('Renewal payment initiated', {
        subscriptionId: subscription._id,
        billingId: billing._id,
        orderId: paymentOrder.id
      });

      const paymentLink = PaymentGatewayService.generatePaymentLink(
        paymentOrder.id,
        billing.totalAmount,
        subscription.contactEmail,
        '',
        `Renewal Invoice ${billing.invoiceNumber}`
      );

      return res.status(200).json({
        success: true,
        message: 'Renewal payment initiated successfully',
        data: {
          billing,
          paymentLink,
          orderId: paymentOrder.id
        }
      });
    } catch (paymentError) {
      await Billing.findByIdAndDelete(billing?._id);
      await PaymentGatewayLog.findOneAndDelete({ billing: billing?._id });

      logger.error('Renewal payment initiation failed', {
        subscriptionId: subscription._id,
        error: paymentError.message
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to initiate renewal payment. Please try again.',
        error: paymentError.message
      });
    } finally {
      await session.endSession();
    }
  }

  static async getAllSubscriptions(req, res) {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (status) query.status = status;

    const subscriptions = await Subscription.find(query)
      .populate('organization', 'organizationName email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Subscription.countDocuments(query);

    return res.status(200).json({
      success: true,
      data: subscriptions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  }

  static async getSubscriptionStats(req, res) {
    const stats = await Subscription.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$amount' }
        }
      }
    ]);

    const totalActive = await Subscription.countDocuments({ status: 'active' });
    const totalPending = await Subscription.countDocuments({ status: 'pending' });
    const totalGracePeriod = await Subscription.countDocuments({ status: 'grace_period' });
    const totalSuspended = await Subscription.countDocuments({ status: 'suspended' });
    const totalExpired = await Subscription.countDocuments({
      status: { $in: ['grace_period', 'suspended'] },
      endDate: { $lt: new Date() }
    });

    return res.status(200).json({
      success: true,
      data: {
        stats,
        totalActive,
        totalPending,
        totalGracePeriod,
        totalSuspended,
        totalExpired,
        expiringIn30Days: await Subscription.countDocuments({
          status: 'active',
          endDate: {
            $gte: new Date(),
            $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
        })
      }
    });
  }

  static async createStudentSubscription(req, res) {
    const { planId, billingCycle = 'monthly', autoRenew = true } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }
    if (user.role !== 'student') {
      return res.status(403).json({ message: "Only students can purchase an individual subscription." });
    }

    // Block if there's a live (paid-for or renewing) individual subscription.
    const existingLive = await Subscription.findOne({
      organization: userId,
      ownerType: 'individual',
      status: { $in: ['active', 'grace_period'] }
    });
    if (existingLive) {
      return res.status(409).json({ message: "You already have an active subscription." });
    }

    // Reuse an existing PENDING (abandoned/unpaid) individual subscription
    // instead of spawning duplicates / orphaning a pending billing record.
    const existingPending = await Subscription.findOne({
      organization: userId,
      ownerType: 'individual',
      status: 'pending'
    });

    if (existingPending) {
      const pendingBilling = await Billing.findOne({
        subscription: existingPending._id,
        paymentStatus: 'pending'
      });

      if (pendingBilling) {
        const paymentOrder = await PaymentGatewayService.createOrder(
          pendingBilling.totalAmount,
          'INR',
          `Invoice ${pendingBilling.invoiceNumber}`,
          {
            billingId: pendingBilling._id.toString(),
            organizationId: userId.toString(),
            subscriptionId: existingPending._id.toString(),
            type: 'individual'
          }
        );

        const paymentLog = new PaymentGatewayLog({
          organization: userId,
          subscription: existingPending._id,
          billing: pendingBilling._id,
          gateway: 'razorpay',
          orderId: paymentOrder.id,
          amount: pendingBilling.totalAmount,
          currency: 'INR',
          status: 'initiated',
          customerEmail: user.email,
          customerPhone: '',
          description: `Invoice ${pendingBilling.invoiceNumber}`,
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        });

        await paymentLog.save();

        const paymentLink = PaymentGatewayService.generatePaymentLink(
          paymentOrder.id,
          pendingBilling.totalAmount,
          user.email,
          '',
          `Invoice ${pendingBilling.invoiceNumber}`
        );

        logger.info('Reused pending individual subscription for existing unpaid order', {
          subscriptionId: existingPending._id,
          billingId: pendingBilling._id,
          orderId: paymentOrder.id
        });

        return res.status(200).json({
          success: true,
          message: 'Complete payment to activate your pending subscription.',
          data: {
            subscription: existingPending,
            billing: pendingBilling,
            paymentLink,
            orderId: paymentOrder.id
          }
        });
      }

      // Stale pending subscription without billing — remove so a fresh one can be created.
      await Subscription.findByIdAndDelete(existingPending._id);
      await SeatManagement.findOneAndDelete({ subscription: existingPending._id });
    }

    const plan = getPlan(planId, 'individual');
    if (!plan) {
      return res.status(400).json({ message: "Invalid plan selected" });
    }

    const subscriptionDoc = new Subscription({
      organization: userId,
      ownerType: 'individual',
      planType: planId,
      totalSeats: 1,
      usedSeats: 0,
      amount: billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice,
      billingCycle,
      status: 'pending',
      autoRenew,
      features: plan.features,
      limits: plan.limits,
      contactEmail: user.email,
      startDate: new Date()
    });

    const endDate = new Date();
    if (billingCycle === 'monthly') endDate.setMonth(endDate.getMonth() + 1);
    else if (billingCycle === 'quarterly') endDate.setMonth(endDate.getMonth() + 3);
    else if (billingCycle === 'yearly') endDate.setFullYear(endDate.getFullYear() + 1);

    subscriptionDoc.endDate = endDate;
    subscriptionDoc.nextBillingDate = endDate;

    const seatManagement = new SeatManagement({
      subscription: subscriptionDoc._id,
      organization: userId,
      totalSeatsAllocated: 1,
      availableSeats: 1
    });

    const session = await mongoose.startSession();
    let subscription, billing;
    try {
      await session.withTransaction(async () => {
        const invoiceNumber = await Billing.generateInvoiceNumber(session);
        const billingDoc = new Billing({
          organization: userId,
          subscription: subscriptionDoc._id,
          invoiceNumber,
          invoiceDate: new Date(),
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          billingPeriodStart: new Date(),
          billingPeriodEnd: endDate,
          subtotal: subscriptionDoc.amount,
          ...computeInvoiceTotals(subscriptionDoc.amount),
          discount: 0,
          currency: 'INR',
          paymentStatus: 'pending',
          lineItems: [
            {
              description: `${plan.name} Plan - ${billingCycle} Subscription (Self)`,
              quantity: 1,
              unitPrice: subscriptionDoc.amount,
              totalPrice: subscriptionDoc.amount
            }
          ]
        });

        await subscriptionDoc.save({ session });
        await seatManagement.save({ session });
        await billingDoc.save({ session });

        subscription = subscriptionDoc;
        billing = billingDoc;
      });

      const paymentOrder = await PaymentGatewayService.createOrder(
        billing.totalAmount,
        'INR',
        `Invoice ${billing.invoiceNumber}`,
        {
          billingId: billing._id.toString(),
          organizationId: userId.toString(),
          subscriptionId: subscription._id.toString(),
          type: 'individual'
        }
      );

      const paymentLog = new PaymentGatewayLog({
        organization: userId,
        subscription: subscription._id,
        billing: billing._id,
        gateway: 'razorpay',
        orderId: paymentOrder.id,
        amount: billing.totalAmount,
        currency: 'INR',
        status: 'initiated',
        customerEmail: user.email,
        customerPhone: '',
        description: `Invoice ${billing.invoiceNumber}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      await paymentLog.save();

      const paymentLink = PaymentGatewayService.generatePaymentLink(
        paymentOrder.id,
        billing.totalAmount,
        user.email,
        '',
        `Invoice ${billing.invoiceNumber}`
      );

      logger.info('Individual subscription created (pending payment)', {
        subscriptionId: subscription._id,
        billingId: billing._id
      });

      return res.status(201).json({
        success: true,
        message: 'Subscription created. Complete payment to activate.',
        data: {
          subscription,
          billing,
          paymentLink,
          orderId: paymentOrder.id
        }
      });
    } catch (error) {
      await Subscription.findByIdAndDelete(subscriptionDoc._id);
      await SeatManagement.findOneAndDelete({ subscription: subscriptionDoc._id });
      await Billing.findByIdAndDelete(billing?._id);
      await PaymentGatewayLog.findOneAndDelete({ billing: billing?._id });

      logger.error('Individual subscription creation failed', { error: error.message });

      return res.status(500).json({
        success: false,
        message: 'Failed to create subscription. Please try again.',
        error: error.message
      });
    } finally {
      await session.endSession();
    }
  }

  static async getStudentPlans(req, res) {
    return res.status(200).json({
      success: true,
      data: {
        plans: STUDENT_PLANS
      }
    });
  }

  static async getCurrentStudentSubscription(req, res) {
    const userId = req.user.id;

    const subscription = await Subscription.findOne({
      organization: userId,
      ownerType: 'individual',
      status: { $in: ['active', 'inactive', 'pending', 'grace_period'] }
    });

    const seatManagement = subscription
      ? await SeatManagement.findOne({ subscription: subscription._id })
      : null;

    const user = await User.findById(userId).select('trials');

    return res.status(200).json({
      success: true,
      data: {
        subscription: subscription || null,
        seatManagement,
        trials: user ? user.trials : null
      }
    });
  }
}

module.exports = SubscriptionController;
