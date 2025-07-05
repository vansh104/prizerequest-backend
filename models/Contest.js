const mongoose = require('mongoose');

const contestSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  prizeValue: {
    type: Number,
    required: true,
    min: 0
  },
  entryFee: {
    type: Number,
    required: true,
    min: 0
  },
  maxEntries: {
    type: Number,
    required: true,
    min: 1,
    default: 4000
  },
  currentEntries: {
    type: Number,
    default: 0,
    min: 0
  },
  imageUrl: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Property', 'Vehicle', 'Electronics', 'Jewelry', 'Furniture', 'Other']
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  drawDate: {
    type: Date
  },
  livestreamUrl: {
    type: String,
    default: ''
  },
  rules: {
    type: String,
    default: ''
  },
  termsAndConditions: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for better performance
contestSchema.index({ category: 1 });
contestSchema.index({ isActive: 1 });
contestSchema.index({ endDate: 1 });
contestSchema.index({ startDate: 1 });

// Validate that end date is after start date
contestSchema.pre('save', function(next) {
  if (this.endDate <= this.startDate) {
    const error = new Error('End date must be after start date');
    return next(error);
  }
  next();
});

// Calculate entry fee based on prize value and max entries
contestSchema.methods.calculateEntryFee = function() {
  return Math.ceil(this.prizeValue / this.maxEntries);
};

module.exports = mongoose.model('Contest', contestSchema);