const express = require('express');
const { body, validationResult } = require('express-validator');
const Quiz = require('../models/Quiz');
const Entry = require('../models/Entry');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

const router = express.Router();

// Get quiz by contest ID
router.get('/contest/:contestId', async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ 
      contestId: req.params.contestId,
      isActive: true 
    }).select('-correctAnswer'); // Don't send correct answer to client

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    res.json(quiz);
  } catch (error) {
    console.error('Error fetching quiz:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create quiz (Admin only)
router.post('/', [auth, admin], [
  body('contestId').isMongoId().withMessage('Valid contest ID is required'),
  body('question').trim().isLength({ min: 1 }).withMessage('Question is required'),
  body('options').isArray({ min: 2 }).withMessage('At least 2 options are required'),
  body('correctAnswer').isInt({ min: 0 }).withMessage('Correct answer index is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { contestId, question, options, correctAnswer, explanation } = req.body;

    // Validate correct answer is within options range
    if (correctAnswer >= options.length) {
      return res.status(400).json({ message: 'Correct answer index must be within options range' });
    }

    const quiz = new Quiz({
      contestId,
      question,
      options,
      correctAnswer,
      explanation,
      createdBy: req.user.userId
    });

    await quiz.save();
    res.status(201).json(quiz);
  } catch (error) {
    console.error('Error creating quiz:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Quiz already exists for this contest' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit quiz answer
router.post('/submit/:contestId', auth, async (req, res) => {
  try {
    const { selectedAnswer } = req.body;
    const contestId = req.params.contestId;
    const userId = req.user.userId;

    // Check if user has paid for this contest
    const entry = await Entry.findOne({
      userId,
      contestId,
      paymentStatus: 'completed'
    });

    if (!entry) {
      return res.status(400).json({ message: 'You must pay to participate in this contest' });
    }

    if (entry.quizAttempted) {
      return res.status(400).json({ message: 'You have already attempted this quiz' });
    }

    // Get the quiz
    const quiz = await Quiz.findOne({ contestId, isActive: true });
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if answer is correct
    const correct = selectedAnswer === quiz.correctAnswer;

    // Update entry with quiz result
    entry.quizAttempted = true;
    entry.quizPassed = correct;
    entry.selectedAnswer = selectedAnswer;
    entry.quizSubmittedAt = new Date();
    entry.isQualified = correct;
    
    await entry.save();

    res.json({
      correct,
      explanation: quiz.explanation,
      correctAnswer: quiz.correctAnswer
    });
  } catch (error) {
    console.error('Error submitting quiz answer:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update quiz (Admin only)
router.put('/:id', [auth, admin], async (req, res) => {
  try {
    const quiz = await Quiz.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    res.json(quiz);
  } catch (error) {
    console.error('Error updating quiz:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete quiz (Admin only)
router.delete('/:id', [auth, admin], async (req, res) => {
  try {
    const quiz = await Quiz.findByIdAndDelete(req.params.id);
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;