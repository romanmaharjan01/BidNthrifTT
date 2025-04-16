// server.js (or similar)
require('dotenv').config();
const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');
const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY); // Your secret key

app.use(cors());
app.use(express.json());

// Endpoint to create a Payment Intent
app.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency = 'usd', bidId } = req.body; // Amount in cents, e.g., 1000 = $10
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata: { bidId }, // Track bid in Stripe
      automatic_payment_methods: { enabled: true },
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(4242, () => console.log('Server running on port 4242'));