import express from 'express';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';

dotenv.config();

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2022-11-15',
});

// Create payment intent
router.post('/create-payment-intent', async (req, res) => {
  console.log('Creating payment intent:', req.body);
  const { amount, orderId } = req.body;

  try {
    // Validate request body
    if (!amount || !orderId) {
      console.log('Missing fields:', { amount, orderId });
      return res.status(400).json({ error: 'Missing required fields: amount, orderId' });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      console.log('Invalid amount:', amount);
      return res.status(400).json({ error: 'Invalid amount: must be a positive number' });
    }

    // Verify order exists
    const order = await Order.findById(orderId);
    if (!order) {
      console.log('Order not found:', orderId);
      return res.status(404).json({ error: 'Order not found' });
    }

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to smallest currency unit
      currency: 'npr',
      metadata: { orderId },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Create payment record
    const payment = new Payment({
      orderId,
      paymentIntentId: paymentIntent.id,
      amount: amount,
      status: paymentIntent.status,
    });
    await payment.save();

    console.log('Payment intent created:', paymentIntent.id);
    
    // Send the client secret to the client
    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Error creating PaymentIntent:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create payment intent',
      details: error.raw || {}
    });
  }
});

// Verify payment
router.get('/verify-payment/:paymentIntentId', async (req, res) => {
  const { paymentIntentId } = req.params;
  console.log('Verifying payment:', paymentIntentId);

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    console.log('Payment intent retrieved:', paymentIntent.status);

    // Find and update payment record
    const payment = await Payment.findOne({ paymentIntentId });
    if (payment) {
      payment.status = paymentIntent.status;
      await payment.save();
    }

    // Update order status if payment was successful
    if (paymentIntent.status === 'succeeded') {
      const orderId = paymentIntent.metadata.orderId;
      const order = await Order.findById(orderId);
      if (order) {
        order.status = 'Paid';
        order.paymentIntentId = paymentIntentId;
        await order.save();
        console.log('Order updated:', order);
      }
    }

    // Return the payment status
    res.json({
      status: paymentIntent.status,
      orderId: paymentIntent.metadata.orderId
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to verify payment',
      details: error.raw || {}
    });
  }
});

export default router; 