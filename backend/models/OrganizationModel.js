const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },

  organizationName: {
    type: String,
    required: true,
    trim: true
  },

  organizationType: {
    type: String,
    enum: ['college', 'university', 'institute', 'training_center'],
    required: true
  },

  registrationNumber: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },

  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'India' }
  },

  phone: {
    type: String,
    trim: true
  },

  website: {
    type: String,
    trim: true
  },

  primaryContactPerson: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    designation: String
  },

  secondaryContactPerson: {
    name: String,
    email: String,
    phone: String,
    designation: String
  },

  billingContactPerson: {
    name: String,
    email: String,
    phone: String,
    designation: String
  },

  totalStudents: {
    type: Number,
    default: 0
  },

  totalFaculty: {
    type: Number,
    default: 0
  },

  establishedYear: {
    type: Number
  },

  accreditation: {
    type: String,
    trim: true
  },

  logoUrl: {
    type: String,
    trim: true
  },

  bannerUrl: {
    type: String,
    trim: true
  },

  brandColor: {
    type: String,
    default: '#007bff'
  },

  isVerified: {
    type: Boolean,
    default: false
  },

  verificationDate: {
    type: Date
  },

  verificationDocuments: [{
    documentType: {
      type: String,
      enum: ['registration_certificate', 'udyam_aadhar', 'gst_certificate', 'pan_certificate']
    },
    documentUrl: String,
    uploadedAt: { type: Date, default: Date.now }
  }],

  currentSubscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription'
  },

  subscriptionHistory: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription'
  }],

  preferences: {
    timezone: { type: String, default: 'IST' },
    language: { type: String, default: 'en' },
    emailNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: false },
    interviewLanguage: [{ type: String, default: ['en'] }]
  },

  taxInformation: {
    panNumber: String,
    gstNumber: String,
    taxFilingStatus: {
      type: String,
      enum: ['not_registered', 'registered', 'exempt']
    }
  },

  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending_verification'],
    default: 'active'
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

organizationSchema.index({ organizationName: 'text' });
organizationSchema.index({ status: 1 });
organizationSchema.index({ isVerified: 1 });

organizationSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('Organization', organizationSchema);
