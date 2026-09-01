const express = require('express');
const billingRouter = express.Router();
const { asyncHandler } = require('../utils/errorHandler.js');
const { validate } = require('../middlewares/validationMiddleware.js');
const { billingSchemas, paymentSchemas } = require('../utils/validationSchemas.js');
const billingController = require('../controllers/billingController.js');
const isAuthenticated = require('../middlewares/authMiddleware.js');
const authorizeRoles = require('../middlewares/authorizeRoles.js');

billingRouter.use(isAuthenticated);


billingRouter.get(
    '/invoices',
    validate(billingSchemas.getInvoices, 'query'),
    asyncHandler(billingController.getInvoices)
);

billingRouter.get(
    '/invoices/:invoiceId',
    validate(billingSchemas.getInvoiceById, 'params'),
    asyncHandler(billingController.getInvoiceById)
);

billingRouter.post(
    '/create-invoice',
    authorizeRoles('college-admin', 'super-admin'),
    validate(billingSchemas.createInvoice, 'body'),
    asyncHandler(billingController.createInvoice)
);

billingRouter.post(
    '/initiate-payment',
    validate(paymentSchemas.initiatePayment, 'body'),
    asyncHandler(billingController.initiatePayment)
);

billingRouter.post(
    '/verify-payment',
    validate(paymentSchemas.verifyPayment, 'body'),
    asyncHandler(billingController.verifyPayment)
);

billingRouter.post(
    '/retry-payment',
    validate(paymentSchemas.retryPayment, 'body'),
    asyncHandler(billingController.retryPayment)
);

billingRouter.post(
    '/refund',
    authorizeRoles('college-admin', 'super-admin'),
    validate(paymentSchemas.refundPayment, 'body'),
    asyncHandler(billingController.refundPayment)
);

billingRouter.get(
    '/invoices/:invoiceId/download-pdf',
    validate(billingSchemas.downloadInvoice, 'params'),
    asyncHandler(billingController.downloadInvoicePDF)
);

billingRouter.post(
    '/send-reminder',
    authorizeRoles('college-admin', 'super-admin'),
    validate(billingSchemas.sendReminder, 'body'),
    asyncHandler(billingController.sendPaymentReminder)
);

billingRouter.get(
    '/stats',
    authorizeRoles('college-admin', 'super-admin'),
    validate(billingSchemas.getStats, 'query'),
    asyncHandler(billingController.getBillingStats)
);

module.exports = billingRouter;
