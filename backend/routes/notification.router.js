const express = require('express');
const notificationRouter = express.Router();
const { asyncHandler } = require('../utils/errorHandler');
const { validate } = require('../middlewares/validationMiddleware.js');
const { notificationSchemas, reportSchemas } = require('../utils/validationSchemas.js');
const isAuthenticated = require('../middlewares/authMiddleware.js');
const NotificationController = require('../controllers/notificationController');

notificationRouter.use(isAuthenticated);

notificationRouter.get('/', validate(reportSchemas.paginationSchema, 'query'), asyncHandler(NotificationController.getNotifications));
notificationRouter.get('/unread-count', asyncHandler(NotificationController.getUnreadCount));
notificationRouter.patch('/:id/read', validate(reportSchemas.studentIdParam, 'params'), asyncHandler(NotificationController.markAsRead));
notificationRouter.patch('/read-all', asyncHandler(NotificationController.markAllAsRead));
notificationRouter.patch('/:id/archive', validate(reportSchemas.studentIdParam, 'params'), asyncHandler(NotificationController.archiveNotification));
notificationRouter.patch('/:id/restore', validate(reportSchemas.studentIdParam, 'params'), asyncHandler(NotificationController.restoreNotification));
notificationRouter.delete('/:id/delete', validate(reportSchemas.studentIdParam, 'params'), asyncHandler(NotificationController.deleteNotification));

notificationRouter.get('/preferences', asyncHandler(NotificationController.getPreferences));
notificationRouter.put('/update-preferences', validate(notificationSchemas.updatePreferences, 'body'), asyncHandler(NotificationController.updatePreferences));

module.exports = notificationRouter;
