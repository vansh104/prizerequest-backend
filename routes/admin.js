const express = require('express');
const User = require('../models/User');
const Contest = require('../models/Contest');
const Entry = require('../models/Entry');
const Payment = require('../models/Payment');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

const router = express.Router();

// Get dashboard statistics
router.get('/stats', [auth, admin], async (req, res) => {
  try {
    const [totalContests, totalUsers, totalEntries, totalPayments] = await Promise.all([
      Contest.countDocuments(),
      User.countDocuments({ role: 'user' }),
      Entry.countDocuments(),
      Payment.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    const totalRevenue = totalPayments.length > 0 ? totalPayments[0].total : 0;

    res.json({
      totalContests,
      totalUsers,
      totalEntries,
      totalRevenue
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users
router.get('/users', [auth, admin], async (req, res) => {
  try {
    const users = await User.find({ role: 'user' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all entries
router.get('/entries', [auth, admin], async (req, res) => {
  try {
    const entries = await Entry.find()
      .populate('userId', 'name email phone')
      .populate('contestId', 'title prizeValue category')
      .sort({ createdAt: -1 });

    res.json(entries);
  } catch (error) {
    console.error('Error fetching entries:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Export contest data
router.get('/export/:contestId', [auth, admin], async (req, res) => {
  try {
    const contestId = req.params.contestId;
    
    const entries = await Entry.find({ contestId })
      .populate('userId', 'name email phone')
      .populate('contestId', 'title prizeValue category')
      .sort({ createdAt: -1 });

    // Create CSV content
    const csvHeaders = 'Name,Email,Phone,Payment Status,Quiz Attempted,Quiz Passed,Qualified,Submitted At\n';
    const csvData = entries.map(entry => {
      const user = entry.userId;
      return `${user.name},${user.email},${user.phone || ''},${entry.paymentStatus},${entry.quizAttempted},${entry.quizPassed},${entry.isQualified},${entry.submittedAt}`;
    }).join('\n');

    const csvContent = csvHeaders + csvData;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=contest-${contestId}-entries.csv`);
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting contest data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get contest analytics
router.get('/analytics/:contestId', [auth, admin], async (req, res) => {
  try {
    const contestId = req.params.contestId;
    
    const analytics = await Entry.aggregate([
      { $match: { contestId: mongoose.Types.ObjectId(contestId) } },
      {
        $group: {
          _id: null,
          totalEntries: { $sum: 1 },
          paidEntries: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'completed'] }, 1, 0] } },
          quizAttempted: { $sum: { $cond: ['$quizAttempted', 1, 0] } },
          quizPassed: { $sum: { $cond: ['$quizPassed', 1, 0] } },
          qualified: { $sum: { $cond: ['$isQualified', 1, 0] } }
        }
      }
    ]);

    res.json(analytics[0] || {
      totalEntries: 0,
      paidEntries: 0,
      quizAttempted: 0,
      quizPassed: 0,
      qualified: 0
    });
  } catch (error) {
    console.error('Error fetching contest analytics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;