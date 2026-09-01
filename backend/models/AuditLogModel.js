const mongoose = require('mongoose');
const logger = require('../services/loggerService.js');

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },

  userEmail: {
    type: String,
    required: true,
    trim: true
  },

  userRole: {
    type: String,
    enum: ['student', 'college-admin', 'super-admin', 'system'],
    required: true
  },

  action: {
    type: String,
    required: true,
    enum: [
      'LOGIN', 'LOGOUT', 'REGISTER', 'PASSWORD_CHANGE', 'PASSWORD_RESET',
      'EMAIL_VERIFIED', 'PROFILE_UPDATE', 'SUBSCRIPTION_CREATED',
      'SUBSCRIPTION_UPDATED', 'SUBSCRIPTION_CANCELLED', 'PAYMENT_INITIATED',
      'PAYMENT_COMPLETED', 'PAYMENT_FAILED', 'INTERVIEW_STARTED',
      'INTERVIEW_COMPLETED', 'INTERVIEW_SUBMITTED', 'RESUME_UPLOADED',
      'RESUME_PARSED', 'STUDENT_ENROLLED', 'STUDENT_SUSPENDED',
      'ADMIN_ACTION', 'DATA_EXPORT', 'SYSTEM_ERROR', 'SECURITY_ALERT', 'API_ACCESS',
      'REPORT_GENERATION'
    ]
  },

  resourceType: {
    type: String,
    enum: [
      'user', 'subscription', 'billing', 'interview', 'resume',
      'student', 'organization', 'system', 'security'
    ]
  },

  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },

  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed
  },

  ipAddress: {
    type: String,
    required: true
  },

  userAgent: {
    type: String,
    trim: true
  },

  location: {
    country: String,
    city: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },

  endpoint: {
    type: String,
    trim: true
  },

  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  },

  statusCode: Number,

  status: {
    type: String,
    enum: ['success', 'failure', 'partial', 'warning'],
    default: 'success'
  },

  errorMessage: {
    type: String,
    trim: true
  },

  errorStackTrace: String,

  details: mongoose.Schema.Types.Mixed,

  duration: {
    type: Number
  },

  hasSensitiveData: {
    type: Boolean,
    default: false
  },

  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },

  expiresAt: {
    type: Date,
    index: true
  }
}, { indexes: true });

auditLogSchema.pre('save', function () {
  if (!this.expiresAt) {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 90);
    this.expiresAt = expirationDate;
  }
});

auditLogSchema.index({ user: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1 });
auditLogSchema.index({ ipAddress: 1 });
auditLogSchema.index({ userEmail: 1, timestamp: -1 });
auditLogSchema.index({ status: 1, timestamp: -1 });
auditLogSchema.index({ expireAfterSeconds: 0 });

auditLogSchema.statics.logAction = async function (auditData) {
  try {
    const log = new this({
      user: auditData.user,
      userEmail: auditData.userEmail || 'system',
      userRole: auditData.userRole || 'system',
      action: auditData.action,
      resourceType: auditData.resourceType,
      resourceId: auditData.resourceId,
      changes: auditData.changes,
      ipAddress: auditData.ipAddress || '0.0.0.0',
      userAgent: auditData.userAgent,
      location: auditData.location,
      endpoint: auditData.endpoint,
      method: auditData.method,
      statusCode: auditData.statusCode,
      status: auditData.status || 'success',
      errorMessage: auditData.errorMessage,
      details: auditData.details,
      duration: auditData.duration,
      hasSensitiveData: auditData.hasSensitiveData || false
    });

    return await log.save();
  } catch (error) {
    logger.error('Error saving audit log:', error);
  }
};

auditLogSchema.statics.getAuditTrail = async function (resourceType, resourceId, limit = 50) {
  return await this.find({ resourceType, resourceId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('user', 'name email');
};

auditLogSchema.statics.getUserActivity = async function (userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return await this.find({
    user: userId,
    timestamp: { $gte: startDate }
  })
    .sort({ timestamp: -1 })
    .limit(100);
};

auditLogSchema.statics.detectSuspiciousActivity = async function (userId, hourWindow = 1) {
  const startTime = new Date();
  startTime.setHours(startTime.getHours() - hourWindow);

  const failedLogins = await this.countDocuments({
    user: userId,
    action: 'LOGIN',
    status: 'failure',
    timestamp: { $gte: startTime }
  });

  const successfulLogins = await this.countDocuments({
    user: userId,
    action: 'LOGIN',
    status: 'success',
    timestamp: { $gte: startTime }
  });

  const uniqueIPs = await this.distinct('ipAddress', {
    user: userId,
    timestamp: { $gte: startTime }
  });

  return {
    failedLogins,
    successfulLogins,
    uniqueIPCount: uniqueIPs.length,
    isSuspicious: failedLogins > 5 || uniqueIPs.length > 3
  };
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
