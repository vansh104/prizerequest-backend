const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contest',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  paypalOrderId: {
    type: String,
    required: true
  },
  paypalPaymentId: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    default: 'paypal'
  },
  transactionDetails: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  failureReason: {
    type: String,
    default: ''
  },
  refundStatus: {
    type: String,
    enum: ['none', 'pending', 'completed', 'failed'],
    default: 'none'
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  refundedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for better performance
paymentSchema.index({ userId: 1 });
paymentSchema.index({ contestId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ paypalOrderId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);