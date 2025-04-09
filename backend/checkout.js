const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const db = require('../firebase');

router.post('/create-checkout-session', async (req, res) => {
  const { items, userId } = req.body;

  const line_items = items.map(item => ({
    price_data: {
      currency: 'usd',
      product_data: {
        name: item.name,
      },
      unit_amount: item.price * 100, // Stripe uses cents
    },
    quantity: item.quantity,
  }));

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items,
    mode: 'payment',
    success_url: 'http://localhost:8080/payment/success',
    cancel_url: 'http://localhost:8080/payment/cancel',
    metadata: {
      userId,
    }
  });

  res.json({ id: session.id });
});
