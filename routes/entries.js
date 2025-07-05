const express = require('express');
const Entry = require('../models/Entry');
const Contest = require('../models/Contest');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

const router = express.Router();

// Create entry
router.post('/', auth, async (req, res) => {
  try {
    const { contestId, paymentId, paymentStatus } = req.body;
    const userId = req.user.userId;

    // Check if user already has an entry for this contest
    const existingEntry = await Entry.findOne({ userId, contestId });
    if (existingEntry) {
      return res.status(400).json({ message: 'You have already entered this contest' });
    }

    // Check if contest exists and is active
    const contest = await Contest.findById(contestId);
    if (!contest || !contest.isActive) {
      return res.status(400).json({ message: 'Contest not found or inactive' });
    }

    // Check if contest has available spots
    if (contest.currentEntries >= contest.maxEntries) {
      return res.status(400).json({ message: 'Contest is full' });
    }

    const entry = new Entry({
      userId,
      contestId,
      paymentId,
      paymentStatus,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || ''
    });

    await entry.save();

    // Update contest entry count
    if (paymentStatus === 'completed') {
      contest.currentEntries += 1;
      await contest.save();
    }

    res.status(201).json(entry);
  } catch (error) {
    console.error('Error creating entry:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's entries
router.get('/user', auth, async (req, res) => {
  try {
    const entries = await Entry.find({ userId: req.user.userId })
      .populate('contestId', 'title prizeValue entryFee imageUrl category')
      .sort({ createdAt: -1 });

    res.json(entries);
  } catch (error) {
    console.error('Error fetching user entries:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get entries for a specific contest (Admin only)
router.get('/contest/:contestId', [auth, admin], async (req, res) => {
  try {
    const entries = await Entry.find({ contestId: req.params.contestId })
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 });

    res.json(entries);
  } catch (error) {
    console.error('Error fetching contest entries:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update quiz result
router.put('/:id/quiz', auth, async (req, res) => {
  try {
    const { quizPassed, selectedAnswer } = req.body;
    const entryId = req.params.id;
    const userId = req.user.userId;

    const entry = await Entry.findOne({ _id: entryId, userId });
    if (!entry) {
      return res.status(404).json({ message: 'Entry not found' });
    }

    entry.quizAttempted = true;
    entry.quizPassed = quizPassed;
    entry.selectedAnswer = selectedAnswer;
    entry.quizSubmittedAt = new Date();
    entry.isQualified = quizPassed;

    await entry.save();

    res.json(entry);
  } catch (error) {
    console.error('Error updating quiz result:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get qualified entries for a contest
router.get('/contest/:contestId/qualified', [auth, admin], async (req, res) => {
  try {
    const qualifiedEntries = await Entry.find({ 
      contestId: req.params.contestId,
      isQualified: true 
    })
    .populate('userId', 'name email phone')
    .sort({ quizSubmittedAt: 1 });

    res.json(qualifiedEntries);
  } catch (error) {
    console.error('Error fetching qualified entries:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;