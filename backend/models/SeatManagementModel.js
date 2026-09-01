const mongoose = require('mongoose');

const seatManagementSchema = new mongoose.Schema({
  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    required: true,
    unique: true
  },

  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  totalSeatsAllocated: {
    type: Number,
    required: true,
    min: 1
  },

  usedSeats: {
    type: Number,
    default: 0,
    min: 0
  },

  availableSeats: {
    type: Number,
    required: true
  },

  enrolledStudents: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    enrolledAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'completed'],
      default: 'active'
    },
    seatAllocationDate: Date,
    seatReleaseDate: Date,
    notes: String
  }],

  seatHistory: [{
    action: {
      type: String,
      enum: ['allocated', 'released', 'transferred', 'suspended']
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    actionDate: {
      type: Date,
      default: Date.now
    },
    reason: String
  }],

  waitlistStudents: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    requestedAt: {
      type: Date,
      default: Date.now
    },
    priority: {
      type: Number,
      default: 0
    }
  }],

  peakUsagePercentage: {
    type: Number,
    default: 0
  },

  maxUsedSeatsInMonth: {
    type: Number,
    default: 0
  },

  allowSeatRollover: {
    type: Boolean,
    default: true
  },

  rolloverPercentage: {
    type: Number,
    default: 10,
    min: 0,
    max: 100
  },

  alertThreshold: {
    type: Number,
    default: 80,
    min: 0,
    max: 100
  },

  lastAlertSentAt: Date,

  currentMonthMetrics: {
    activeStudents: { type: Number, default: 0 },
    newEnrollments: { type: Number, default: 0 },
    seatReleases: { type: Number, default: 0 },
    peakUsage: { type: Number, default: 0 }
  },

  previousMonthMetrics: {
    activeStudents: { type: Number, default: 0 },
    newEnrollments: { type: Number, default: 0 },
    seatReleases: { type: Number, default: 0 },
    peakUsage: { type: Number, default: 0 }
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

seatManagementSchema.index({ organization: 1 });
seatManagementSchema.index({ 'enrolledStudents.student': 1 });

seatManagementSchema.pre('save', function() {
  this.updatedAt = Date.now();
  this.availableSeats = this.totalSeatsAllocated - this.usedSeats;
});

seatManagementSchema.methods.allocateSeatToStudent = function(studentId) {
  if (this.availableSeats <= 0) {
    throw new Error('No available seats');
  }

  const existingStudent = this.enrolledStudents.find(e => e.student.toString() === studentId.toString());
  if (existingStudent && existingStudent.status === 'active') {
    throw new Error('Student already allocated a seat');
  }

  if (existingStudent && (existingStudent.status === 'completed' || existingStudent.status === 'suspended')) {
    existingStudent.status = 'active';
    existingStudent.seatAllocationDate = new Date();
    existingStudent.seatReleaseDate = undefined;
    existingStudent.notes = undefined;
  } else {
    this.enrolledStudents.push({
      student: studentId,
      status: 'active',
      seatAllocationDate: new Date()
    });
  }

  this.usedSeats++;
  this.currentMonthMetrics.newEnrollments++;
  this.currentMonthMetrics.activeStudents = this.enrolledStudents.filter(e => e.status === 'active').length;

  this.seatHistory.push({
    action: 'allocated',
    student: studentId,
    actionDate: new Date()
  });

  return this.save();
};

seatManagementSchema.methods.releaseSeatFromStudent = function(studentId, reason = null) {
  const student = this.enrolledStudents.find(e => e.student.toString() === studentId.toString());
  if (!student) {
    throw new Error('Student not found in allocation');
  }

  if (student.status !== 'active') {
    throw new Error('Student does not have an active seat to release');
  }

  student.status = 'completed';
  student.seatReleaseDate = new Date();

  this.usedSeats--;
  this.currentMonthMetrics.seatReleases++;
  this.currentMonthMetrics.activeStudents = this.enrolledStudents.filter(e => e.status === 'active').length;

  this.seatHistory.push({
    action: 'released',
    student: studentId,
    reason,
    actionDate: new Date()
  });

  if (this.waitlistStudents.length > 0) {
    const nextStudent = this.waitlistStudents.shift();
    this.allocateSeatToStudent(nextStudent.student);
  }

  return this.save();
};

seatManagementSchema.methods.hasAvailableSeats = function() {
  return this.availableSeats > 0;
};

seatManagementSchema.methods.getUsagePercentage = function() {
  return Math.round((this.usedSeats / this.totalSeatsAllocated) * 100);
};

seatManagementSchema.methods.addToWaitlist = function(studentId) {
  const alreadyWaiting = this.waitlistStudents.some(w => w.student.toString() === studentId.toString());
  if (alreadyWaiting) {
    throw new Error('Student already in waitlist');
  }

  this.waitlistStudents.push({
    student: studentId,
    priority: this.waitlistStudents.length + 1
  });

  return this.save();
};

module.exports = mongoose.model('SeatManagement', seatManagementSchema);
