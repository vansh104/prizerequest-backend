const mongoose = require('mongoose');

const entrySchema = new mongoose.Schema({
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
  paymentId: {
    type: String,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  quizAttempted: {
    type: Boolean,
    default: false
  },
  quizPassed: {
    type: Boolean,
    default: false
  },
  selectedAnswer: {
    type: Number,
    default: null
  },
  quizSubmittedAt: {
    type: Date
  },
  isQualified: {
    type: Boolean,
    default: false
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  ipAddress: {
    type: String,
    default: ''
  },
  userAgent: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Compound index to ensure one entry per user per contest
entrySchema.index({ userId: 1, contestId: 1 }, { unique: true });

// Index for better performance
entrySchema.index({ contestId: 1 });
entrySchema.index({ userId: 1 });
entrySchema.index({ paymentStatus: 1 });
entrySchema.index({ isQualified: 1 });

// Update qualification status based on quiz result
entrySchema.pre('save', function(next) {
  if (this.quizAttempted && this.quizPassed) {
    this.isQualified = true;
  } else if (this.quizAttempted && !this.quizPassed) {
    this.isQualified = false;
  }
  next();
});

module.exports = mongoose.model('Entry', entrySchema);