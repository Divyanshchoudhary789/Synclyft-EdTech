const mongoose = require('mongoose');

const paymentGatewayLogSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription'
  },

  billing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Billing'
  },

  gateway: {
    type: String,
    enum: ['razorpay', 'stripe'],
    required: true
  },

  orderId: {
    type: String,
    trim: true
  },

  paymentId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },

  amount: {
    type: Number,
    required: true,
    min: 0
  },

  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR']
  },

  status: {
    type: String,
    enum: ['initiated', 'pending', 'captured', 'failed', 'refunded'],
    default: 'initiated'
  },

  paymentMethod: {
    type: String,
    trim: true
  },

  customerEmail: {
    type: String,
    lowercase: true,
    trim: true
  },

  customerPhone: {
    type: String,
    trim: true
  },

  description: {
    type: String,
    trim: true
  },

  rawResponse: mongoose.Schema.Types.Mixed,

  errorMessage: {
    type: String,
    trim: true
  },

  errorCode: {
    type: String,
    trim: true
  },

  retryCount: {
    type: Number,
    default: 0
  },

  nextRetryAt: Date,

  webhookReceived: {
    type: Boolean,
    default: false
  },

  webhookReceivedAt: Date,

  ipAddress: {
    type: String,
    trim: true
  },

  userAgent: String,

  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

paymentGatewayLogSchema.index({ organization: 1, createdAt: -1 });
paymentGatewayLogSchema.index({ subscription: 1 });
paymentGatewayLogSchema.index({ billing: 1 });
paymentGatewayLogSchema.index({ status: 1, createdAt: -1 });
paymentGatewayLogSchema.index({ gateway: 1 });

paymentGatewayLogSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

paymentGatewayLogSchema.methods.markAsSuccessful = function(paymentId, response) {
  this.status = 'captured';
  this.paymentId = paymentId;
  this.rawResponse = response;
  this.webhookReceived = true;
  this.webhookReceivedAt = new Date();
  return this.save();
};

paymentGatewayLogSchema.methods.markAsFailed = function(errorCode, errorMessage) {
  this.status = 'failed';
  this.errorCode = errorCode;
  this.errorMessage = errorMessage;
  return this.save();
};

paymentGatewayLogSchema.methods.scheduleRetry = function(delayMinutes = 5) {
  this.retryCount++;
  this.status = 'pending';
  const nextRetry = new Date();
  nextRetry.setMinutes(nextRetry.getMinutes() + delayMinutes);
  this.nextRetryAt = nextRetry;
  return this.save();
};

paymentGatewayLogSchema.statics.canRetry = function(paymentLogId) {
  return this.findById(paymentLogId).then(log => {
    if (!log) return false;
    return log.retryCount < 3 && new Date() >= log.nextRetryAt;
  });
};

module.exports = mongoose.model('PaymentGatewayLog', paymentGatewayLogSchema);
