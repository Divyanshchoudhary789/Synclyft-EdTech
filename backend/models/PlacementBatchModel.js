const mongoose = require('mongoose');

const placementBatchSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  batchName: {
    type: String,
    required: true,
    trim: true
  },

  batchCode: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },

  academicYear: {
    type: String,
    required: true,
    trim: true
  },

  graduationYear: {
    type: Number,
    required: true
  },

  department: {
    type: String,
    required: true,
    trim: true
  },

  section: {
    type: String,
    trim: true,
    default: ''
  },

  description: {
    type: String,
    trim: true,
    default: ''
  },

  status: {
    type: String,
    enum: ['active', 'paused', 'archived'],
    default: 'active'
  },

  students: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['active', 'left', 'moved'],
      default: 'active'
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    }
  }],

  campaignAssignments: [{
    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    assignedAt: {
      type: Date,
      default: Date.now
    },
    notifyStudents: {
      type: Boolean,
      default: true
    },
    studentCount: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['active', 'revoked'],
      default: 'active'
    }
  }],

  placementOfficerNotes: {
    type: String,
    trim: true,
    default: ''
  },

  studentCount: {
    type: Number,
    default: 0
  },

  archivedAt: {
    type: Date
  }
}, { timestamps: true });

placementBatchSchema.index({ organization: 1, batchName: 1, academicYear: 1 }, { unique: true });
placementBatchSchema.index({ organization: 1, status: 1 });
placementBatchSchema.index({ department: 1, graduationYear: 1 });

placementBatchSchema.pre('save', function() {
  this.studentCount = this.students.filter(entry => entry.status === 'active').length;
});

placementBatchSchema.methods.addStudents = function(studentIds, notes = '') {
  const incomingIds = Array.isArray(studentIds) ? studentIds : [studentIds];
  const currentActive = new Set(
    this.students
      .filter(entry => entry.status === 'active')
      .map(entry => entry.student.toString())
  );

  incomingIds.forEach((studentId) => {
    const normalizedId = studentId.toString();
    if (currentActive.has(normalizedId)) {
      return;
    }

    const existingRecord = this.students.find(entry => entry.student.toString() === normalizedId);
    if (existingRecord) {
      existingRecord.status = 'active';
      existingRecord.joinedAt = new Date();
      existingRecord.notes = notes || existingRecord.notes || '';
      return;
    }

    this.students.push({
      student: studentId,
      joinedAt: new Date(),
      status: 'active',
      notes
    });
  });

  this.studentCount = this.students.filter(entry => entry.status === 'active').length;
  return this.save();
};

placementBatchSchema.methods.removeStudents = function(studentIds, notes = '') {
  const incomingIds = Array.isArray(studentIds) ? studentIds : [studentIds];
  const idSet = new Set(incomingIds.map(id => id.toString()));

  this.students.forEach((entry) => {
    if (idSet.has(entry.student.toString()) && entry.status === 'active') {
      entry.status = 'left';
      entry.notes = notes || entry.notes || '';
    }
  });

  this.studentCount = this.students.filter(entry => entry.status === 'active').length;
  return this.save();
};

placementBatchSchema.methods.archiveBatch = function() {
  this.status = 'archived';
  this.archivedAt = new Date();
  return this.save();
};

placementBatchSchema.methods.unarchiveBatch = function() {
  if (this.status === 'archived') {
    this.status = 'active';
    this.archivedAt = undefined;
  }
  return this.save();
};

module.exports = mongoose.model('PlacementBatch', placementBatchSchema);