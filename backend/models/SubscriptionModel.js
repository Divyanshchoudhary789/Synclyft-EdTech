const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // 'organization' -> owned by a college-admin (seats shared across students)
  // 'individual'   -> owned by a single student who subscribed for themselves
  ownerType: {
    type: String,
    enum: ['organization', 'individual'],
    default: 'organization'
  },

  planType: {
    type: String,
    enum: ['basic', 'pro', 'enterprise', 'student_basic', 'student_pro', 'student_premium'],
    required: true,
    default: 'basic'
  },

  status: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'grace_period', 'suspended', 'cancelled'],
    default: 'pending'
  },

  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },

  endDate: {
    type: Date,
    required: true
  },

  renewalDate: {
    type: Date
  },

  autoRenew: {
    type: Boolean,
    default: true
  },

  totalSeats: {
    type: Number,
    required: true,
    min: 1,
    max: 5000
  },

  usedSeats: {
    type: Number,
    default: 0
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

  billingCycle: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly'],
    default: 'monthly'
  },

  paymentHistory: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Billing'
  }],

  features: {
    mockInterviews: { type: Boolean, default: false },
    proctoring: { type: Boolean, default: false },
    aiEvaluation: { type: Boolean, default: false },
    placementIntelligence: { type: Boolean, default: false },
    studentReports: { type: Boolean, default: false },
    batchManagement: { type: Boolean, default: false },
    advancedAnalytics: { type: Boolean, default: false },
    apiAccess: { type: Boolean, default: false },
    customBranding: { type: Boolean, default: false }
  },

  limits: {
    mockInterviewsPerMonth: { type: Number, default: 5 },
    studentReportsPerMonth: { type: Number, default: 10 },
    apiCallsPerDay: { type: Number, default: 1000 },
    storageGB: { type: Number, default: 10 }
  },

  currentMonthUsage: {
    mockInterviews: { type: Number, default: 0 },
    studentReports: { type: Number, default: 0 },
    apiCalls: { type: Number, default: 0 },
    storageUsedGB: { type: Number, default: 0 }
  },

  contactEmail: {
    type: String,
    required: true,
    trim: true
  },

  billingEmail: {
    type: String,
    trim: true
  },

  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

subscriptionSchema.index({ organization: 1 });
subscriptionSchema.index({ status: 1, endDate: 1 });
subscriptionSchema.index({ planType: 1 });

subscriptionSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

subscriptionSchema.methods.isExpired = function () {
  return new Date() > this.endDate;
};

subscriptionSchema.methods.isActive = function () {
  return this.status === 'active' && !this.isExpired();
};

subscriptionSchema.methods.isPending = function () {
  return this.status === 'pending';
};

subscriptionSchema.methods.isInGracePeriod = function () {
  return this.status === 'grace_period';
};

subscriptionSchema.methods.enterGracePeriod = function () {
  this.status = 'grace_period';
  const graceDays = 7;
  this.endDate = new Date(Date.now() + graceDays * 24 * 60 * 60 * 1000);
  return this.save();
};

subscriptionSchema.methods.suspend = function () {
  this.status = 'suspended';
  return this.save();
};

subscriptionSchema.methods.activate = function () {
  this.status = 'active';
  return this.save();
};

subscriptionSchema.methods.getRemainingDays = function () {
  const remaining = Math.ceil((this.endDate - new Date()) / (1000 * 60 * 60 * 24));
  return remaining > 0 ? remaining : 0;
};

subscriptionSchema.methods.hasFeature = function (featureName) {
  return this.features[featureName] === true && (this.isActive() || this.isInGracePeriod());
};

subscriptionSchema.methods.isLimitExceeded = function (limitName) {
  const limitMapping = {
    mockInterviews: { usage: 'mockInterviews', limit: 'mockInterviewsPerMonth' },
    studentReports: { usage: 'studentReports', limit: 'studentReportsPerMonth' },
    apiCalls: { usage: 'apiCalls', limit: 'apiCallsPerDay' },
    storage: { usage: 'storageUsedGB', limit: 'storageGB' }
  };

  const key = Object.keys(limitMapping).find(k => limitName.toLowerCase().includes(k.toLowerCase()));

  if (key) {
    const target = limitMapping[key];
    const maxLimit = this.limits[target.limit];
    const currentUsage = this.currentMonthUsage[target.usage];

    if (maxLimit === -1) return false;

    return currentUsage >= maxLimit;
  }

  return false;
};

subscriptionSchema.methods.incrementUsage = function (usageType) {
  if (this.currentMonthUsage[usageType] !== undefined) {
    this.currentMonthUsage[usageType]++;
  }
};

module.exports = mongoose.model('Subscription', subscriptionSchema);
