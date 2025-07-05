const express = require('express');
const { body, validationResult } = require('express-validator');
const Contest = require('../models/Contest');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

const router = express.Router();

// Get all contests
router.get('/', async (req, res) => {
  try {
    const { category, active } = req.query;
    let query = {};
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (active !== undefined) {
      query.isActive = active === 'true';
    }

    const contests = await Contest.find(query)
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email');

    res.json(contests);
  } catch (error) {
    console.error('Error fetching contests:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get contest by ID
router.get('/:id', async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.id)
      .populate('createdBy', 'name email');
    
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }

    res.json(contest);
  } catch (error) {
    console.error('Error fetching contest:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create contest (Admin only)
router.post('/', [auth, admin], [
  body('title').trim().isLength({ min: 1 }).withMessage('Title is required'),
  body('description').trim().isLength({ min: 1 }).withMessage('Description is required'),
  body('prizeValue').isNumeric().withMessage('Prize value must be a number'),
  body('entryFee').isNumeric().withMessage('Entry fee must be a number'),
  body('maxEntries').isInt({ min: 1 }).withMessage('Max entries must be at least 1'),
  body('category').isIn(['Property', 'Vehicle', 'Electronics', 'Jewelry', 'Furniture', 'Other']).withMessage('Invalid category'),
  body('startDate').isISO8601().withMessage('Invalid start date'),
  body('endDate').isISO8601().withMessage('Invalid end date'),
  body('imageUrl').isURL().withMessage('Invalid image URL'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const contest = new Contest({
      ...req.body,
      createdBy: req.user.userId
    });

    await contest.save();
    res.status(201).json(contest);
  } catch (error) {
    console.error('Error creating contest:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update contest (Admin only)
router.put('/:id', [auth, admin], async (req, res) => {
  try {
    const contest = await Contest.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );

    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }

    res.json(contest);
  } catch (error) {
    console.error('Error updating contest:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete contest (Admin only)
router.delete('/:id', [auth, admin], async (req, res) => {
  try {
    const contest = await Contest.findByIdAndDelete(req.params.id);
    
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }

    res.json({ message: 'Contest deleted successfully' });
  } catch (error) {
    console.error('Error deleting contest:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get contests by category
router.get('/category/:category', async (req, res) => {
  try {
    const contests = await Contest.find({ 
      category: req.params.category,
      isActive: true 
    }).sort({ createdAt: -1 });

    res.json(contests);
  } catch (error) {
    console.error('Error fetching contests by category:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;