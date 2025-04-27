const express = require('express');
const cors = require('cors');
const stripe = require('stripe')('sk_test_51RGXzVPewya4IHYy8tknSe74FP2SfD7sUVAVeHJKTAavN2vpjdAHZSNDH5pf2lw9jqKvLU9XxL7HJVRMgLqQCBcG00Yk2GgCXJ');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5002;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Create a payment intent
app.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount, orderId, auctionId } = req.body;
    
    console.log(`Creating payment intent for amount: ${amount}, order: ${orderId || auctionId}`);
    
    if (!amount) {
      return res.status(400).json({ error: 'Amount is required' });
    }

    // Amount should be in smallest currency unit (cents)
    let amountInCents = amount;
    
    // If amount seems to be in dollars/rupees, convert to cents
    if (amount < 100) {
      amountInCents = Math.round(amount * 100);
    }
    
    // Ensure minimum amount required by Stripe (50 cents or equivalent)
    const MINIMUM_AMOUNT = 50;
    if (amountInCents < MINIMUM_AMOUNT) {
      console.log(`Amount ${amountInCents} is below Stripe minimum of ${MINIMUM_AMOUNT} cents, increasing to minimum`);
      amountInCents = MINIMUM_AMOUNT;
    }
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'npr',
      automatic_payment_methods: { enabled: true },
      metadata: {
        orderId: orderId || '',
        auctionId: auctionId || ''
      }
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify payment intent
app.get('/verify-payment/:paymentIntentId', async (req, res) => {
  try {
    const { paymentIntentId } = req.params;
    console.log(`Verifying payment intent: ${paymentIntentId}`);
    
    if (!paymentIntentId) {
      return res.status(400).json({ 
        status: 'failed',
        error: 'Payment intent ID is required' 
      });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    console.log(`Payment intent status: ${paymentIntent.status}`);
    
    // Extract order ID from metadata
    const orderId = paymentIntent.metadata?.orderId || '';
    const auctionId = paymentIntent.metadata?.auctionId || '';
    
    res.status(200).json({
      status: paymentIntent.status,
      orderId: orderId,
      auctionId: auctionId,
      amount: paymentIntent.amount,
      paymentMethod: paymentIntent.payment_method_types,
      created: new Date(paymentIntent.created * 1000).toISOString()
    });
  } catch (error) {
    console.error('Error verifying payment intent:', error);
    res.status(500).json({ 
      status: 'failed',
      error: error.message 
    });
  }
});

// Webhook for Stripe events
app.post('/webhook', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = 'whsec_your_webhook_secret'; // Replace with your webhook secret

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);
      // Then define and call a function to handle the successful payment intent
      break;
    case 'payment_intent.payment_failed':
      const failedPaymentIntent = event.data.object;
      console.log(`Payment failed: ${failedPaymentIntent.last_payment_error?.message}`);
      // Then define and call a function to handle failed payment intents
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.send();
});

// Get order by ID
app.get('/orders/:id', async (req, res) => {
  // This would typically query your database
  // For demo purposes, we're returning mock data
  const { id } = req.params;
  
  res.json({
    id,
    userId: 'user123',
    total: 10000,
    status: 'pending',
    createdAt: new Date().toISOString(),
    cartItems: [
      {
        id: 'product1',
        title: 'Sample Product',
        price: 10000,
        quantity: 1,
        imageUrl: 'https://via.placeholder.com/150'
      }
    ]
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Payment endpoint: http://localhost:${PORT}/create-payment-intent`);
}); 