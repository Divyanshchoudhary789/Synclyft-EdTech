const mongoose = require('mongoose');

const seatUtilizationSchema = new mongoose.Schema({
  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    required: true
  },

  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  date: {
    type: Date,
    required: true,
    index: true
  },

  totalSeatsAllocated: {
    type: Number,
    required: true
  },

  usedSeats: {
    type: Number,
    default: 0
  },

  activeUsers: {
    type: Number,
    default: 0
  },

  peakUsage: {
    type: Number,
    default: 0
  },

  usagePercentage: {
    type: Number,
    default: 0
  },

  dailyNewEnrollments: {
    type: Number,
    default: 0
  },

  dailySeatReleases: {
    type: Number,
    default: 0
  },

  avgSessionDuration: {
    type: Number,
    default: 0
  },

  interviewsCompleted: {
    type: Number,
    default: 0
  },

  resomesUploaded: {
    type: Number,
    default: 0
  },

  timestamp: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

seatUtilizationSchema.index({ subscription: 1, date: -1 });
seatUtilizationSchema.index({ organization: 1, date: -1 });

seatUtilizationSchema.statics.recordDailyMetrics = async function(subscription, seatManagement, metrics) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return await this.findOneAndUpdate(
    {
      subscription: subscription._id,
      date: today
    },
    {
      subscription: subscription._id,
      organization: subscription.organization,
      totalSeatsAllocated: seatManagement.totalSeatsAllocated,
      usedSeats: seatManagement.usedSeats,
      activeUsers: seatManagement.enrolledStudents.filter(e => e.status === 'active').length,
      peakUsage: Math.max(seatManagement.usedSeats, metrics.peakUsage || 0),
      usagePercentage: Math.round((seatManagement.usedSeats / seatManagement.totalSeatsAllocated) * 100),
      dailyNewEnrollments: metrics.newEnrollments || 0,
      dailySeatReleases: metrics.seatReleases || 0,
      avgSessionDuration: metrics.avgSessionDuration || 0,
      interviewsCompleted: metrics.interviewsCompleted || 0,
      resomesUploaded: metrics.resumesUploaded || 0
    },
    { upsert: true, new: true }
  );
};

seatUtilizationSchema.statics.getUtilizationTrend = async function(subscriptionId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  return await this.find({
    subscription: subscriptionId,
    date: { $gte: startDate }
  })
    .sort({ date: 1 })
    .lean();
};

seatUtilizationSchema.statics.getAverageUtilization = async function(subscriptionId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const result = await this.aggregate([
    {
      $match: {
        subscription: new mongoose.Types.ObjectId(subscriptionId),
        date: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        avgUsagePercentage: { $avg: '$usagePercentage' },
        maxUsagePercentage: { $max: '$usagePercentage' },
        minUsagePercentage: { $min: '$usagePercentage' },
        totalInterviews: { $sum: '$interviewsCompleted' },
        totalResumes: { $sum: '$resomesUploaded' }
      }
    }
  ]);

  return result[0] || null;
};

module.exports = mongoose.model('SeatUtilization', seatUtilizationSchema);
