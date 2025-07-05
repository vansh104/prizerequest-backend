const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  contestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contest',
    required: true,
    unique: true
  },
  question: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  options: [{
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  }],
  correctAnswer: {
    type: Number,
    required: true,
    min: 0
  },
  explanation: {
    type: String,
    trim: true,
    maxlength: 500
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Validate that correct answer is within options range
quizSchema.pre('save', function(next) {
  if (this.correctAnswer >= this.options.length) {
    const error = new Error('Correct answer index must be within options range');
    return next(error);
  }
  next();
});

// Validate that there are at least 2 options
quizSchema.pre('save', function(next) {
  if (this.options.length < 2) {
    const error = new Error('Quiz must have at least 2 options');
    return next(error);
  }
  next();
});

// Index for better performance
quizSchema.index({ contestId: 1 });
quizSchema.index({ isActive: 1 });

module.exports = mongoose.model('Quiz', quizSchema);