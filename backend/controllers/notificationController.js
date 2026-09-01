const NotificationService = require('../services/notificationService');
const NotificationPreference = require('../models/NotificationPreferenceModel');
const { ApiError } = require('../utils/errorHandler');
const { asyncHandler } = require('../utils/errorHandler');

class NotificationController {
  static async getNotifications(req, res) {
    const userId = req.user.id;
    const { status, type, page = 1, limit = 20 } = req.query;

    const result = await NotificationService.getUserNotifications(userId, { status, type }, {
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.status(200).json({
      success: true,
      ...result
    });
  }

  static async getUnreadCount(req, res) {
    const userId = req.user.id;
    const count = await NotificationService.getUnreadCount(userId);
    res.status(200).json({ success: true, count });
  }

  static async markAsRead(req, res) {
    const userId = req.user.id;
    const { id } = req.params;
    const notification = await NotificationService.markAsRead(id, userId);
    res.status(200).json({ success: true, data: notification });
  }

  static async markAllAsRead(req, res) {
    const userId = req.user.id;
    const result = await NotificationService.markAllAsRead(userId);
    res.status(200).json({ success: true, modifiedCount: result.modifiedCount });
  }

  static async archiveNotification(req, res) {
    const userId = req.user.id;
    const { id } = req.params;
    const notification = await NotificationService.archiveNotification(id, userId);
    res.status(200).json({ success: true, data: notification });
  }

  static async restoreNotification(req, res) {
    const userId = req.user.id;
    const { id } = req.params;
    const notification = await NotificationService.restoreNotification(id, userId);
    res.status(200).json({ success: true, data: notification });
  }

  static async deleteNotification(req, res) {
    const userId = req.user.id;
    const { id } = req.params;
    const notification = await NotificationService.deleteNotification(id, userId);
    res.status(200).json({ success: true, message: 'Notification deleted' });
  }

  static async getPreferences(req, res) {
    const userId = req.user.id;
    const pref = await NotificationService.getOrCreatePreference(userId);
    res.status(200).json({ success: true, data: pref });
  }

  static async updatePreferences(req, res) {
    const userId = req.user.id;
    const { globalChannels, eventPreferences } = req.body;

    if (typeof globalChannels === 'undefined' && typeof eventPreferences === 'undefined') {
      throw new ApiError(400, 'At least one preference field is required');
    }

    const updates = {};
    if (typeof globalChannels === 'object') {
      updates.globalChannels = { ...globalChannels };
    }
    if (typeof eventPreferences === 'object') {
      updates.eventPreferences = { ...eventPreferences };
    }

    const pref = await NotificationPreference.findOneAndUpdate(
      { user: userId },
      { $set: updates },
      { new: true, upsert: true }
    );

    res.status(200).json({ success: true, data: pref });
  }
}

module.exports = NotificationController;
