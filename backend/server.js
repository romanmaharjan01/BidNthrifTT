// server.js
import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import admin from 'firebase-admin';

// Initialize Express app
const app = express();
const stripe = new Stripe('your-stripe-secret-key', { apiVersion: '2022-11-15' }); // Replace with your Stripe secret key

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert('./serviceAccountKey.json'), // Update this path
});

// Middleware
app.use(cors());
app.use(express.json());

// Endpoint to create Stripe PaymentIntent
app.post('/create-payment-intent', async (req, res) => {
  const { amount, orderId, userId } = req.body;

  try {
    // Validate request body
    if (!amount || !orderId || !userId) {
      return res.status(400).json({ error: 'Missing required fields: amount, orderId, userId' });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount: must be a positive number' });
    }

    // Verify Firebase ID token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header missing or invalid' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    if (decodedToken.uid !== userId) {
      return res.status(403).json({ error: 'Unauthorized: userId does not match authenticated user' });
    }

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Convert NPR to paisa (Stripe expects amount in smallest currency unit)
      currency: 'npr',
      metadata: { orderId, userId },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Error creating PaymentIntent:', error);
    res.status(500).json({ error: error.message || 'Failed to create payment intent' });
  }
});

// Start the server
app.listen(5000, () => console.log('Server running on port 5000'));