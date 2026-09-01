const NotificationService = require('../services/notificationService');
const logger = require('../services/loggerService.js');

const createNotification = async (recipientId, senderId, title, message, notificationType, actionUrl = "") => {
  try {
    return await NotificationService.dispatch({
      recipient: recipientId,
      recipientRole: 'student',
      type: notificationType,
      title,
      message,
      actionUrl,
      actionText: 'View Details',
      priority: 'normal',
      channels: { inApp: true, email: false }
    });
  } catch (error) {
        logger.error("Soft fail caught inside notification dispatch engine:", error);
    return false;
  }
};

module.exports = createNotification;
