const mongoose = require('mongoose');
const Counter = require('./CounterModel');

const billingSchema = new mongoose.Schema({
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  subscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    required: true
  },

  invoiceNumber: {
    type: String,
    unique: true,
    required: true
  },

  invoiceDate: {
    type: Date,
    required: true,
    default: Date.now
  },

  dueDate: {
    type: Date,
    required: true
  },

  billingPeriodStart: {
    type: Date,
    required: true
  },

  billingPeriodEnd: {
    type: Date,
    required: true
  },

  subtotal: {
    type: Number,
    required: true,
    min: 0
  },

  tax: {
    type: Number,
    default: 0,
    min: 0
  },

  discount: {
    type: Number,
    default: 0,
    min: 0
  },

  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },

  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR']
  },

  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },

  paymentMethod: {
    type: String,
    enum: ['credit_card', 'debit_card', 'bank_transfer', 'upi', 'net_banking', 'wallet'],
    trim: true
  },

  transactionId: {
    type: String,
    trim: true
  },

  paymentDate: {
    type: Date
  },

  refundAmount: {
    type: Number,
    default: 0,
    min: 0
  },

  refundDate: {
    type: Date
  },

  refundReason: {
    type: String,
    trim: true
  },

  lineItems: [{
    description: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 }
  }],

  billingAddress: {
    name: String,
    email: String,
    phone: String,
    address: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },

  remindersSent: [{ type: Date }],
  lastReminderDate: { type: Date },

  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

billingSchema.index({ organization: 1, invoiceDate: -1 });
billingSchema.index({ subscription: 1 });
billingSchema.index({ paymentStatus: 1 });
billingSchema.index({ dueDate: 1 });

billingSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

billingSchema.methods.markAsPaid = function(transactionId, paymentMethod = null) {
  this.paymentStatus = 'completed';
  this.paymentDate = new Date();
  this.transactionId = transactionId;
  if (paymentMethod) this.paymentMethod = paymentMethod;
  return this.save();
};

billingSchema.methods.markAsFailed = function(reason = null) {
  this.paymentStatus = 'failed';
  if (reason) this.notes = reason;
  return this.save();
};

billingSchema.methods.refund = function(refundAmount, reason) {
  this.paymentStatus = 'refunded';
  this.refundAmount = refundAmount;
  this.refundDate = new Date();
  this.refundReason = reason;
  return this.save();
};

billingSchema.methods.isOverdue = function() {
  return this.paymentStatus === 'pending' && new Date() > this.dueDate;
};

billingSchema.methods.daysUntilDue = function() {
  const days = Math.ceil((this.dueDate - new Date()) / (1000 * 60 * 60 * 24));
  return days;
};

billingSchema.methods.logReminder = function() {
  this.remindersSent.push(new Date());
  this.lastReminderDate = new Date();
  return this.save();
};

billingSchema.statics.generateInvoiceNumber = async function(session) {
  const counter = await this.model('Counter').getNextSequence('invoice', session);
  const count = counter.seq;
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `INV-${year}${month}-${String(count).padStart(5, '0')}`;
};

module.exports = mongoose.model('Billing', billingSchema);
