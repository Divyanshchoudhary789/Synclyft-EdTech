const express = require('express');
const Joi = require('joi');
const subscriptionRouter = express.Router();

const { asyncHandler } = require('../utils/errorHandler.js');
const { validate } = require('../middlewares/validationMiddleware.js');
const { subscriptionSchemas, reportSchemas } = require("../utils/validationSchemas.js");
const subscriptionController = require("../controllers/subscriptionController.js");
const isAuthenticated = require("../middlewares/authMiddleware.js");
const authorizeRoles = require("../middlewares/authorizeRoles.js");

// Public — plan catalogue is marketing information, shown on the pricing page
// before sign-in. Static data, no user context.
subscriptionRouter.get(
    '/plans/public',
    asyncHandler(subscriptionController.getStudentPlans)
);

subscriptionRouter.get(
    '/plans/org',
    asyncHandler(subscriptionController.getOrgPlans)
);

subscriptionRouter.use(isAuthenticated);



// Self-serve student subscription (independent students who practice on their own)
subscriptionRouter.post(
    '/self/create',
    authorizeRoles('student'),
    validate(subscriptionSchemas.studentCreateSubscription, 'body'),
    asyncHandler(subscriptionController.createStudentSubscription)
);

subscriptionRouter.get(
    '/self/plans',
    authorizeRoles('student'),
    asyncHandler(subscriptionController.getStudentPlans)
);

subscriptionRouter.get(
    '/self/current',
    authorizeRoles('student'),
    asyncHandler(subscriptionController.getCurrentStudentSubscription)
);

subscriptionRouter.post(
    '/create',
    authorizeRoles('college-admin'),
    validate(subscriptionSchemas.createSubscription, 'body'),
    asyncHandler(subscriptionController.createSubscription)
);

subscriptionRouter.get(
    '/current/:organizationId',
    validate(Joi.object({ organizationId: Joi.string().required() }), 'params'),
    asyncHandler(subscriptionController.getCurrentSubscription)
);

subscriptionRouter.get(
    '/details/:subscriptionId',
    validate(Joi.object({ subscriptionId: Joi.string().required() }), 'params'),
    asyncHandler(subscriptionController.getSubscriptionDetails)
);

subscriptionRouter.get(
    '/usage/:subscriptionId',
    validate(Joi.object({ subscriptionId: Joi.string().required() }), 'params'),
    asyncHandler(subscriptionController.getSubscriptionUsage)
);

subscriptionRouter.get(
    '/features/:subscriptionId',
    validate(Joi.object({ subscriptionId: Joi.string().required() }), 'params'),
    asyncHandler(subscriptionController.getAvailableFeatures)
);


subscriptionRouter.put(
    '/upgrade',
    validate(subscriptionSchemas.upgradeSubscription, 'body'),
    asyncHandler(subscriptionController.upgradeSubscription)
);

subscriptionRouter.put(
    '/downgrade',
    validate(subscriptionSchemas.downgradeSubscription, 'body'),
    asyncHandler(subscriptionController.downgradeSubscription)
);

subscriptionRouter.put(
    '/cancel',
    validate(subscriptionSchemas.cancelSubscription, 'body'),
    asyncHandler(subscriptionController.cancelSubscription)
);


subscriptionRouter.post(
    '/renew',
    validate(subscriptionSchemas.renewSubscription, 'body'),
    asyncHandler(subscriptionController.renewSubscription)
);



// Super Admin Routes

subscriptionRouter.get(
    '/all',
    authorizeRoles('super-admin'),
    validate(reportSchemas.paginationSchema, 'query'),
    asyncHandler(subscriptionController.getAllSubscriptions)
);

subscriptionRouter.get(
    '/stats',
    authorizeRoles('super-admin'),
    asyncHandler(subscriptionController.getSubscriptionStats)
);


module.exports = subscriptionRouter;
