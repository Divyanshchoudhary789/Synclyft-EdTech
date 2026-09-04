const Billing = require('../models/BillingModel');
const Subscription = require('../models/SubscriptionModel');
const Organization = require('../models/OrganizationModel');
const User = require('../models/userModel');
const SeatManagement = require('../models/SeatManagementModel');
const PaymentGatewayLog = require('../models/PaymentGatewayLogModel');
const PaymentGatewayService = require('../services/paymentGatewayService');
const logger = require('../services/loggerService');
const { ApiError } = require('../utils/errorHandler');
const { isOwnerOf, resolveOwnerIds } = require('../utils/ownership');
const PDFDocument = require('pdfkit');
const { renderInvoicePdf } = require('../utils/invoicePdf');

class BillingController {
  static async getInvoices(req, res) {
    const { organizationId, subscriptionId, status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const isSuperAdmin = req.user.role === 'super-admin';
    const ownerIds = await resolveOwnerIds(req);

    const query = {};
    if (organizationId) {
      if (!isSuperAdmin && !ownerIds.includes(organizationId)) {
        throw new ApiError(403, 'Unauthorized to view invoices for this organization');
      }
      query.organization = organizationId;
    } else if (!isSuperAdmin) {
      // A user may own invoices under their own user id (individual) or their
      // organization doc id (college-admin).
      query.organization = { $in: ownerIds };
    }
    if (subscriptionId) query.subscription = subscriptionId;
    if (status) query.paymentStatus = status;

    const invoices = await Billing.find(query)
      .populate('subscription', 'planType organization ownerType')
      .populate('organization', 'name email organization role status')
      .sort({ invoiceDate: -1 })
      .limit(limit)
      .skip(skip);

    const missingOrgIds = invoices
      .filter(inv => !inv.organization && inv.subscription?.organization)
      .map(inv => inv.subscription.organization);

    if (missingOrgIds.length > 0) {
      const users = await User.find({ _id: { $in: missingOrgIds } })
        .select('name email organization role status')
        .lean();
      const userMap = new Map(users.map(u => [u._id.toString(), u]));
      invoices.forEach(inv => {
        if (!inv.organization && inv.subscription?.organization) {
          const idStr = inv.subscription.organization.toString();
          if (userMap.has(idStr)) {
            inv.organization = userMap.get(idStr);
          }
        }
      });
    }

    const stillMissingOrgIds = invoices
      .filter(inv => !inv.organization && inv.subscription?.organization)
      .map(inv => inv.subscription.organization);

    if (stillMissingOrgIds.length > 0) {
      const orgs = await Organization.find({ user: { $in: stillMissingOrgIds } })
        .select('organizationName primaryContactPerson billingContactPerson address')
        .lean();
      const orgMap = new Map(orgs.map(o => [o.user.toString(), o]));
      invoices.forEach(inv => {
        if (!inv.organization && inv.subscription?.organization) {
          const idStr = inv.subscription.organization.toString();
          if (orgMap.has(idStr)) {
            const org = orgMap.get(idStr);
            inv.organization = {
              name: org.organizationName || 'N/A',
              email: org.primaryContactPerson?.email || org.billingContactPerson?.email || 'N/A',
              organization: org.organizationName || 'N/A',
              role: 'college-admin',
              status: 'active',
              address: org.address
            };
          }
        }
      });
    }

    const total = await Billing.countDocuments(query);

    return res.status(200).json({
      success: true,
      data: invoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  }

  static async getInvoiceById(req, res) {
    const { invoiceId } = req.params;

    const invoice = await Billing.findById(invoiceId)
      .populate('subscription', 'planType organization ownerType')
      .populate('organization', 'name email organization role status');

    if (!invoice) {
      throw new ApiError(404, 'Invoice not found');
    }

    const isSuperAdmin = req.user.role === 'super-admin';

    let effectiveOrgId = invoice.organization;
    if (!effectiveOrgId && invoice.subscription && invoice.subscription.organization) {
      effectiveOrgId = invoice.subscription.organization;
    }

    const isOwner = await isOwnerOf(req, effectiveOrgId);

    if (!isSuperAdmin && !isOwner) {
      throw new ApiError(403, 'Unauthorized access to this invoice');
    }

    if (!invoice.organization && invoice.subscription && invoice.subscription.organization) {
      const orgUser = await User.findById(invoice.subscription.organization)
        .select('name email organization role status')
        .lean();
      if (orgUser) {
        invoice.organization = orgUser;
      } else {
        const org = await Organization.findOne({ user: invoice.subscription.organization })
          .select('organizationName primaryContactPerson billingContactPerson address')
          .lean();
        if (org) {
          invoice.organization = {
            name: org.organizationName || 'N/A',
            email: org.primaryContactPerson?.email || org.billingContactPerson?.email || 'N/A',
            organization: org.organizationName || 'N/A',
            role: 'college-admin',
            status: 'active',
            address: org.address
          };
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: invoice
    });
  }

  static async createInvoice(req, res) {
    const { subscriptionId, subtotal, tax = 0, discount = 0 } = req.body;

    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      throw new ApiError(404, 'Subscription not found');
    }

    const isSuperAdmin = req.user.role === 'super-admin';
    const isOwner = await isOwnerOf(req, subscription.organization);

    if (!isSuperAdmin && !isOwner) {
      throw new ApiError(403, 'Unauthorized to create invoice for this subscription');
    }

    const totalAmount = subtotal + tax - discount;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 15);

    const invoiceNumber = await Billing.generateInvoiceNumber();

    const billing = new Billing({
      organization: subscription.organization,
      subscription: subscriptionId,
      invoiceNumber,
      invoiceDate: new Date(),
      dueDate,
      billingPeriodStart: subscription.startDate,
      billingPeriodEnd: new Date(),
      subtotal,
      tax,
      discount,
      totalAmount,
      currency: 'INR',
      paymentStatus: 'pending',
      lineItems: [
        {
          description: `${subscription.planType} Plan - Monthly Subscription`,
          quantity: 1,
          unitPrice: subtotal,
          totalPrice: subtotal
        }
      ]
    });

    await billing.save();

    logger.info('Invoice created', {
      invoiceId: billing._id,
      invoiceNumber,
      totalAmount
    });

    return res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: billing
    });
  }

  static async initiatePayment(req, res) {
    const { billingId, subscriptionId, amount, customerEmail, customerPhone } = req.body;

    let billing = null;
    if (billingId) {
      billing = await Billing.findById(billingId);
      if (!billing) {
        throw new ApiError(404, 'Billing record not found');
      }

      if (billing.paymentStatus === 'completed') {
        return res.status(400).json({
          success: false,
          message: 'Payment already completed for this invoice'
        });
      }
    } else if (subscriptionId) {
      const subscription = await Subscription.findById(subscriptionId);
      if (!subscription) {
        throw new ApiError(404, 'Subscription not found');
      }

      const existingPendingBilling = await Billing.findOne({
        subscription: subscriptionId,
        paymentStatus: 'pending'
      });

      if (existingPendingBilling) {
        billing = existingPendingBilling;
      } else {
        const invoiceNumber = await Billing.generateInvoiceNumber();
        billing = new Billing({
          organization: subscription.organization,
          subscription: subscriptionId,
          invoiceNumber,
          invoiceDate: new Date(),
          dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          billingPeriodStart: new Date(),
          billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          subtotal: amount || subscription.amount,
          tax: 0,
          discount: 0,
          totalAmount: amount || subscription.amount,
          currency: 'INR',
          paymentStatus: 'pending'
        });
        await billing.save();
      }
    } else {
      throw new ApiError(400, 'Either billingId or subscriptionId is required');
    }

    const isSuperAdmin = req.user.role === 'super-admin';
    const isOwner = await isOwnerOf(req, billing.organization);

    if (!isSuperAdmin && !isOwner) {
      throw new ApiError(403, 'Unauthorized to initiate payment for this billing');
    }

    const existingPaymentLog = await PaymentGatewayLog.findOne({
      billing: billing._id,
      status: { $in: ['initiated', 'pending'] }
    });

    if (existingPaymentLog) {
      const paymentLink = PaymentGatewayService.generatePaymentLink(
        existingPaymentLog.orderId,
        billing.totalAmount,
        customerEmail || existingPaymentLog.customerEmail,
        customerPhone || existingPaymentLog.customerPhone,
        `Invoice ${billing.invoiceNumber}`
      );

      return res.status(200).json({
        success: true,
        message: 'Payment already initiated. Use existing payment link.',
        data: {
          orderId: existingPaymentLog.orderId,
          paymentLink,
          amount: billing.totalAmount,
          currency: 'INR'
        }
      });
    }

    const order = await PaymentGatewayService.createOrder(
      billing.totalAmount,
      'INR',
      `Invoice ${billing.invoiceNumber}`,
      {
        billingId: billing._id.toString(),
        organizationId: billing.organization.toString()
      }
    );

    const paymentLog = new PaymentGatewayLog({
      organization: billing.organization,
      subscription: billing.subscription,
      billing: billing._id,
      gateway: 'razorpay',
      orderId: order.id,
      amount: billing.totalAmount,
      currency: 'INR',
      status: 'initiated',
      customerEmail: customerEmail || '',
      customerPhone: customerPhone || '',
      description: `Invoice ${billing.invoiceNumber}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    await paymentLog.save();

    const paymentLink = PaymentGatewayService.generatePaymentLink(
      order.id,
      billing.totalAmount,
      customerEmail || '',
      customerPhone || '',
      `Invoice ${billing.invoiceNumber}`
    );

    logger.info('Payment initiated', {
      orderId: order.id,
      billingId: billing._id,
      amount: billing.totalAmount
    });

    return res.status(200).json({
      success: true,
      message: 'Payment initiated successfully',
      data: {
        orderId: order.id,
        paymentLink,
        amount: billing.totalAmount,
        currency: 'INR'
      }
    });
  }

  static normalizePaymentMethod(method) {
    if (!method) return 'razorpay';
    const map = {
      card: 'credit_card',
      credit_card: 'credit_card',
      debit_card: 'debit_card',
      upi: 'upi',
      netbanking: 'net_banking',
      net_banking: 'net_banking',
      bank_transfer: 'bank_transfer',
      wallet: 'wallet',
      razorpay: 'razorpay'
    };
    return map[String(method).toLowerCase()] || 'razorpay';
  }

  static async verifyPayment(req, res) {
    const { orderId, paymentId, signature } = req.body;

    const isValidSignature = await PaymentGatewayService.verifyPaymentSignature(
      orderId,
      paymentId,
      signature
    );

    if (!isValidSignature) {
      throw new ApiError(400, 'Invalid payment signature');
    }

    const paymentLog = await PaymentGatewayLog.findOne({ orderId });
    if (!paymentLog) {
      throw new ApiError(404, 'Payment log not found');
    }

    const billing = await Billing.findById(paymentLog.billing);

    // Idempotent completion: even if the log is already 'captured' (e.g. a
    // prior verify failed midway after marking the log but before finishing
    // the billing/subscription), finish the downstream activation here.
    const alreadyCompleted = billing && billing.paymentStatus === 'completed';

    if (!alreadyCompleted) {
      const paymentDetails = await PaymentGatewayService.getPaymentDetails(paymentId);

      if (paymentDetails.amount !== Math.round(paymentLog.amount * 100)) {
        throw new ApiError(400, 'Payment amount mismatch');
      }

      await paymentLog.markAsSuccessful(paymentId, paymentDetails);

      if (billing) {
        await billing.markAsPaid(paymentId, BillingController.normalizePaymentMethod(paymentDetails.method));

        if (billing.subscription) {
          const SubscriptionController = require('../controllers/subscriptionController.js');
          await SubscriptionController.activateSubscription(
            billing.subscription.toString(),
            billing._id.toString(),
            paymentId
          );
        }
      }

      logger.info('Payment verified and processed', { orderId, paymentId });
    } else {
      // Ensure the log reflects success even if it only got partially updated.
      if (paymentLog.status !== 'captured') {
        await paymentLog.markAsSuccessful(paymentId, { id: paymentId, method: billing.paymentMethod });
      }
      logger.info('Payment already verified, no action needed', { orderId, paymentId });
    }

    return res.status(200).json({
      success: true,
      message: alreadyCompleted ? 'Payment already verified' : 'Payment verified successfully',
      data: {
        paymentId,
        status: 'completed',
        amount: paymentLog.amount
      }
    });
  }

  static async retryPayment(req, res) {
    const { paymentLogId, billingId } = req.body;

    let paymentLog;
    if (paymentLogId) {
      paymentLog = await PaymentGatewayLog.findById(paymentLogId);
    } else if (billingId) {
      paymentLog = await PaymentGatewayLog.findOne({
        billing: billingId,
        status: { $in: ['failed', 'pending', 'initiated'] }
      }).sort({ createdAt: -1 });
    }

    if (!paymentLog) {
      throw new ApiError(404, 'Payment log not found');
    }

    if (paymentLog.retryCount >= 3) {
      throw new ApiError(400, 'Maximum retry attempts exceeded');
    }

    const billing = await Billing.findById(paymentLog.billing);
    if (!billing) {
      throw new ApiError(404, 'Billing record not found');
    }

    const isSuperAdmin = req.user.role === 'super-admin';
    const isOwner = await isOwnerOf(req, billing.organization);

    if (!isSuperAdmin && !isOwner) {
      throw new ApiError(403, 'Unauthorized to retry this payment');
    }

    const order = await PaymentGatewayService.createOrder(
      billing.totalAmount,
      'INR',
      `Invoice ${billing.invoiceNumber} - Retry`,
      {
        billingId: billing._id.toString(),
        retryAttempt: paymentLog.retryCount + 1
      }
    );

    // Point the log at the NEW order so verify-payment / webhook can find it.
    paymentLog.orderId = order.id;
    paymentLog.paymentId = undefined;
    await paymentLog.scheduleRetry();

    const paymentLink = PaymentGatewayService.generatePaymentLink(
      order.id,
      billing.totalAmount,
      paymentLog.customerEmail,
      paymentLog.customerPhone,
      `Invoice ${billing.invoiceNumber} - Retry`
    );

    logger.info('Payment retry scheduled', { paymentLogId: paymentLog._id, retryCount: paymentLog.retryCount });

    return res.status(200).json({
      success: true,
      message: 'Payment retry initiated',
      data: {
        orderId: order.id,
        paymentLink,
        retryAttempt: paymentLog.retryCount + 1
      }
    });
  }

  static async refundPayment(req, res) {
    const { paymentId, billingId, amount, reason } = req.body;

    const billing = await Billing.findById(billingId);
    if (!billing) {
      throw new ApiError(404, 'Billing record not found');
    }

    const isSuperAdmin = req.user.role === 'super-admin';
    const isOwner = await isOwnerOf(req, billing.organization);

    if (!isSuperAdmin && !isOwner) {
      throw new ApiError(403, 'Unauthorized to refund this payment');
    }

    if (billing.paymentStatus === 'refunded') {
      throw new ApiError(400, 'Payment already refunded');
    }

    const refundAmount = amount || billing.totalAmount;

    if (refundAmount > billing.totalAmount) {
      throw new ApiError(400, 'Refund amount cannot exceed total amount');
    }

    const refund = await PaymentGatewayService.refundPayment(paymentId, refundAmount);

    await billing.refund(refundAmount, reason);

    if (billing.subscription) {
      const subscription = await Subscription.findById(billing.subscription);
      if (subscription && subscription.status === 'active') {
        subscription.status = 'suspended';
        subscription.autoRenew = false;
        await subscription.save();

        if (subscription.ownerType === 'individual') {
          const seatManagement = await SeatManagement.findOne({ subscription: subscription._id });
          if (seatManagement) {
            try {
              await seatManagement.releaseSeatFromStudent(subscription.organization);
            } catch (seatErr) {
              logger.warn('Seat release on refund failed', { subscriptionId: subscription._id, error: seatErr.message });
            }
          }
        }

        logger.info('Subscription suspended after manual refund', { subscriptionId: subscription._id });
      }
    }

    logger.info('Refund processed', {
      billingId: billing._id,
      paymentId,
      refundAmount,
      reason
    });

    return res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      data: {
        refundId: refund.id,
        amount: refundAmount,
        status: refund.status
      }
    });
  }

  static async downloadInvoicePDF(req, res) {
    const { invoiceId } = req.params;

    const invoice = await Billing.findById(invoiceId)
      .populate('subscription', 'planType organization ownerType')
      .populate('organization', 'name email organization role status');

    if (!invoice) {
      throw new ApiError(404, 'Invoice not found');
    }

    const isSuperAdmin = req.user.role === 'super-admin';

    let effectiveOrgId = invoice.organization;
    if (!effectiveOrgId && invoice.subscription && invoice.subscription.organization) {
      effectiveOrgId = invoice.subscription.organization;
    }

    const isOwner = await isOwnerOf(req, effectiveOrgId);

    if (!isSuperAdmin && !isOwner) {
      throw new ApiError(403, 'Unauthorized access to this invoice');
    }

    // ── Resolve the buying party. `effectiveOrgId` can be an Organization _id
    // OR a User _id (the field is polymorphic across older + newer records),
    // so try both shapes plus the owner user's linked organization.
    const ORG_FIELDS = 'organizationName primaryContactPerson billingContactPerson address taxInformation phone user';
    let orgDoc = null;
    let ownerUser = null;
    if (effectiveOrgId) {
      orgDoc = await Organization.findById(effectiveOrgId).select(ORG_FIELDS).lean().catch(() => null);
      if (!orgDoc) {
        orgDoc = await Organization.findOne({ user: effectiveOrgId }).select(ORG_FIELDS).lean().catch(() => null);
      }
      ownerUser = await User.findById(orgDoc?.user || effectiveOrgId)
        .select('name email organization role').lean().catch(() => null);
      if (!orgDoc && ownerUser?.organization) {
        orgDoc = await Organization.findById(ownerUser.organization).select(ORG_FIELDS).lean().catch(() => null);
      }
    }

    // ── assemble the "Billed to" block: prefer the invoice's own billingAddress,
    // fall back to the org's registered contact + address.
    const ba = invoice.billingAddress || {};
    const oa = orgDoc?.address || {};
    const contact = orgDoc?.billingContactPerson?.email
      ? orgDoc.billingContactPerson
      : (orgDoc?.primaryContactPerson || {});

    const clean = (v) => (v && String(v).trim() && String(v).trim() !== 'N/A' ? String(v).trim() : '');
    const streetLine = clean(ba.address) || clean(oa.street);
    const cityLine = [
      clean(ba.city) || clean(oa.city),
      clean(ba.state) || clean(oa.state),
      clean(ba.zipCode) || clean(oa.zipCode),
    ].filter(Boolean).join(', ');
    const countryLine = clean(ba.country) || clean(oa.country);

    const buyer = {
      name: clean(ba.name) || orgDoc?.organizationName || clean(ownerUser?.name) || 'Customer',
      email: clean(ba.email) || clean(contact.email) || clean(ownerUser?.email),
      phone: clean(ba.phone) || clean(contact.phone) || clean(orgDoc?.phone),
      addressLines: [streetLine, cityLine, countryLine].filter(Boolean),
      gstin: orgDoc?.taxInformation?.gstin || orgDoc?.taxInformation?.gstNumber || clean(ba.gstin),
      stateCode: orgDoc?.taxInformation?.stateCode || '',
    };

    const filename = `invoice-${invoice.invoiceNumber || invoice._id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    doc.pipe(res);
    try {
      renderInvoicePdf(doc, invoice.toObject ? invoice.toObject() : invoice, buyer);
    } catch (err) {
      logger.error('Invoice PDF render failed', { invoiceId, error: err.message });
    }
    doc.end();
  }

  static async sendPaymentReminder(req, res) {
    const { billingId } = req.body;

    const billing = await Billing.findById(billingId);
    if (!billing) {
      throw new ApiError(404, 'Billing record not found');
    }

    const isSuperAdmin = req.user.role === 'super-admin';
    const isOwner = await isOwnerOf(req, billing.organization);

    if (!isSuperAdmin && !isOwner) {
      throw new ApiError(403, 'Unauthorized to send reminder for this invoice');
    }

    if (billing.paymentStatus !== 'pending') {
      throw new ApiError(400, 'Reminder can only be sent for pending payments');
    }

    await billing.logReminder();

    logger.info('Payment reminder sent', { billingId });

    return res.status(200).json({
      success: true,
      message: 'Payment reminder sent successfully'
    });
  }

  static async getBillingStats(req, res) {
    const { organizationId } = req.query;

    const isSuperAdmin = req.user.role === 'super-admin';
    const userOrgId = req.user.organization?.toString() || req.user.id;

    let query = {};
    if (organizationId) {
      if (!isSuperAdmin && organizationId !== userOrgId) {
        throw new ApiError(403, 'Unauthorized to view stats for this organization');
      }
      query.organization = organizationId;
    } else if (!isSuperAdmin) {
      query.organization = userOrgId;
    }

    const stats = await Billing.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    const totalRevenue = await Billing.aggregate([
      { $match: { ...query, paymentStatus: 'completed' } },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' }
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      data: {
        stats,
        totalRevenue: totalRevenue[0]?.total || 0,
        overdueInvoices: await Billing.countDocuments({
          ...query,
          paymentStatus: 'pending',
          dueDate: { $lt: new Date() }
        })
      }
    });
  }
}

module.exports = BillingController;
