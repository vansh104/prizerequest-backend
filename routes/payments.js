const express = require('express');
const paypal = require('paypal-rest-sdk');
const Payment = require('../models/Payment');
const Contest = require('../models/Contest');
const auth = require('../middleware/auth');

const router = express.Router();

// Configure PayPal
paypal.configure({
  mode: process.env.PAYPAL_MODE || 'sandbox',
  client_id: process.env.PAYPAL_CLIENT_ID,
  client_secret: process.env.PAYPAL_CLIENT_SECRET
});

// Create PayPal order
router.post('/create-order', auth, async (req, res) => {
  try {
    const { contestId, amount } = req.body;
    const userId = req.user.userId;

    // Verify contest exists
    const contest = await Contest.findById(contestId);
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }

    // Create PayPal payment
    const create_payment_json = {
      intent: 'sale',
      payer: {
        payment_method: 'paypal'
      },
      redirect_urls: {
        return_url: `${process.env.FRONTEND_URL}/payment/success`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`
      },
      transactions: [{
        item_list: {
          items: [{
            name: contest.title,
            sku: contest._id,
            price: (amount / 75).toFixed(2), // Convert INR to USD (approximate)
            currency: 'USD',
            quantity: 1
          }]
        },
        amount: {
          currency: 'USD',
          total: (amount / 75).toFixed(2)
        },
        description: `Entry fee for ${contest.title}`
      }]
    };

    paypal.payment.create(create_payment_json, async (error, payment) => {
      if (error) {
        console.error('PayPal error:', error);
        return res.status(500).json({ message: 'Payment creation failed' });
      }

      // Save payment record
      const paymentRecord = new Payment({
        userId,
        contestId,
        amount,
        paypalOrderId: payment.id,
        status: 'pending',
        transactionDetails: payment
      });

      await paymentRecord.save();

      res.json({ orderId: payment.id });
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Capture PayPal payment
router.post('/capture', auth, async (req, res) => {
  try {
    const { orderId, paymentId } = req.body;
    const userId = req.user.userId;

    // Find payment record
    const payment = await Payment.findOne({ 
      paypalOrderId: orderId,
      userId 
    });

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    const execute_payment_json = {
      payer_id: paymentId
    };

    paypal.payment.execute(orderId, execute_payment_json, async (error, paypalPayment) => {
      if (error) {
        console.error('PayPal execute error:', error);
        payment.status = 'failed';
        payment.failureReason = error.message;
        await payment.save();
        return res.status(500).json({ message: 'Payment capture failed' });
      }

      // Update payment status
      payment.status = 'completed';
      payment.paypalPaymentId = paypalPayment.id;
      payment.transactionDetails = paypalPayment;
      await payment.save();

      res.json({ success: true });
    });
  } catch (error) {
    console.error('Error capturing payment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's payments
router.get('/user', auth, async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user.userId })
      .populate('contestId', 'title prizeValue entryFee')
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;