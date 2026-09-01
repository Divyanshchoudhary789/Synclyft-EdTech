const express = require('express');

const userRouter = require('./user.router.js');
const superAdminRouter = require('./superAdmin.router.js');
const collegeAdminRouter = require('./collegeAdmin.router.js');
const studentProfileRouter = require('./studentProfile.router.js');
const interviewRouter = require('./interview.router.js');
const subscriptionRouter = require('./subscription.router.js');
const billingRouter = require('./billing.router.js');
const webhooksRouter = require('./webhooks.router.js');
const analyticsRouter = require('./analytics.router.js');
const notificationRouter = require('./notification.router.js');
const passwordResetRouter = require('./passwordReset.router.js');

const recommendationRouter = require('./recommendation.router.js');
const insightsRouter = require('./insights.router.js');
const resumeRouter = require('./resume.router.js');

const mainRouter = express.Router();

mainRouter.use('/auth', userRouter);
mainRouter.use('/password-reset', passwordResetRouter);
mainRouter.use('/super-admin', superAdminRouter);
mainRouter.use('/college-admin', collegeAdminRouter);
mainRouter.use('/recommendations', recommendationRouter);
mainRouter.use('/insights', insightsRouter);
mainRouter.use('/profile', studentProfileRouter);
mainRouter.use('/interview', interviewRouter);
mainRouter.use('/subscriptions', subscriptionRouter);
mainRouter.use('/billing', billingRouter);
mainRouter.use('/webhooks', webhooksRouter);
mainRouter.use('/notifications', notificationRouter);
mainRouter.use('/analytics', analyticsRouter);
mainRouter.use('/resume', resumeRouter);

mainRouter.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API endpoints available',
    version: '1.0.0'
  });
});

module.exports = mainRouter;