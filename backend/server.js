import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import dotenv from 'dotenv';
import { db } from './firebase-admin.js';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Initialize Stripe with proper error handling
let stripe;
try {
  // Use the correct secret key that matches the publishable key
  stripe = new Stripe('sk_test_51RGXzVPewya4IHYyDdxMjdUDb2BtoSVLfrqksJXyvEkDS3hDRCWkKCe6L7LMImFxcIsRP2tZ4dwSK7vh95Sbgavw00odyAWUQZ', {
    apiVersion: '2022-11-15',
  });
  console.log('Stripe initialized successfully with key starting with: sk_test_51RGXzV...');
} catch (error) {
  console.error('Error initializing Stripe:', error);
}

// Middleware
app.use(cors());
app.use(express.json());

// Debug middleware to log requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});

// Log all available routes at startup
const listRoutes = () => {
  console.log("Available Routes:");
  console.log("- GET /test");
  console.log("- GET /orders/:id");
  console.log("- POST /create-order");
  console.log("- POST /create-payment-intent");
  console.log("- GET /verify-payment/:paymentIntentId");
};

// Simple test endpoint
app.get('/test', (req, res) => {
  console.log("Test endpoint called");
  res.json({ message: 'Backend server is running!' });
});

// Endpoint to get order details from Firestore
app.get('/orders/:id', async (req, res) => {
  const { id } = req.params;
  console.log('Fetching order:', id);

  try {
    // Fetch real order data from Firestore
    const orderDoc = await db.collection('orders').doc(id).get();
    
    if (!orderDoc.exists) {
      console.log('Order not found:', id);
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const orderData = orderDoc.data();
    
    // Format order data for frontend consistency
    const formattedOrder = {
      id: orderDoc.id,
      userId: orderData.buyerId || orderData.userId,
      sellerId: orderData.sellerId,
      total: orderData.totalPrice || orderData.total,
      status: orderData.status || 'Pending',
      createdAt: orderData.createdAt ? new Date(orderData.createdAt).toISOString() : new Date().toISOString(),
      cartItems: orderData.items?.map(item => ({
        id: item.productId,
        title: item.title,
        price: item.price,
        quantity: item.quantity,
        imageUrl: item.imageUrl || 'https://via.placeholder.com/150'
      })) || []
    };

    console.log('Order data retrieved:', formattedOrder);
    res.json(formattedOrder);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch order' });
  }
});

// Endpoint to create an order and save to Firestore
app.post('/create-order', async (req, res) => {
  console.log('Creating order:', req.body);
  const { userId, cartItems, total, sellerId = null } = req.body;

  try {
    // Validate request body
    if (!userId || !cartItems || !total) {
      console.log('Missing fields:', { userId, cartItems, total });
      return res.status(400).json({ error: 'Missing required fields: userId, cartItems, total' });
    }

    // Format order for Firestore
    const orderData = {
      buyerId: userId,
      sellerId: sellerId,
      items: cartItems.map(item => ({
        productId: item.id,
        title: item.title,
        price: item.price,
        quantity: item.quantity,
        imageUrl: item.imageUrl
      })),
      totalPrice: total,
      status: 'Pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save order to Firestore
    const orderRef = await db.collection('orders').add(orderData);
    const orderId = orderRef.id;
    console.log('Order created with ID:', orderId);
    
    // Return the order ID
    res.status(201).json({ orderId });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: error.message || 'Failed to create order' });
  }
});

// Endpoint to create Stripe PaymentIntent
app.post('/create-payment-intent', async (req, res) => {
  console.log('Creating payment intent:', req.body);
  const { amount, orderId } = req.body;

  try {
    // Validate request body
    if (!amount || !orderId) {
      console.log('Missing fields:', { amount, orderId });
      return res.status(400).json({ error: 'Missing required fields: amount, orderId' });
    }

    if (typeof amount !== 'number' && typeof parseInt(amount) !== 'number') {
      console.log('Invalid amount:', amount);
      return res.status(400).json({ error: 'Invalid amount: must be a number' });
    }

    // Convert string to number if needed
    const numericAmount = typeof amount === 'string' ? parseInt(amount) : amount;

    // Convert amount to smallest currency unit (cents/paise)
    let amountInCents = Math.round(numericAmount * 100);
    
    console.log('Creating payment intent with amount:', amountInCents, 'currency: inr');

    // Create PaymentIntent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'inr', // Using INR as Stripe officially supports it
      automatic_payment_methods: { enabled: true },
      metadata: { orderId }
    });

    // Log payment intent details for debugging
    console.log('Payment intent created successfully with details:', {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      clientSecret: paymentIntent.client_secret ? 'Present (starts with: ' + paymentIntent.client_secret.substring(0, 10) + '...)' : 'Missing'
    });

    // Send the client secret to the client
    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('Error creating PaymentIntent:', error);
    console.error('Stripe error details:', error.raw ? JSON.stringify(error.raw) : 'No detailed error');
    res.status(500).json({
      error: error.message || 'Failed to create payment intent',
      details: error.raw || {},
    });
  }
});

// Endpoint to verify payment
app.get('/verify-payment/:paymentIntentId', async (req, res) => {
  const { paymentIntentId } = req.params;
  console.log('Verifying payment intent:', paymentIntentId);

  try {
    if (!stripe) {
      console.error('Stripe is not initialized');
      return res.status(500).json({
        error: 'Stripe is not initialized',
        status: 'failed',
      });
    }

    // Retrieve payment intent from Stripe
    console.log('Retrieving payment intent from Stripe');
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    console.log('Payment intent retrieved with status:', paymentIntent.status);
    console.log('Payment intent details:', {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      metadata: paymentIntent.metadata,
    });

    // Extract order ID from metadata
    const orderId = paymentIntent.metadata?.orderId || null;

    // Update order status in Firestore if payment is successful and orderId exists
    if (orderId && paymentIntent.status === 'succeeded') {
      try {
        const orderRef = db.collection('orders').doc(orderId);
        const orderDoc = await orderRef.get();
        
        if (orderDoc.exists) {
          await orderRef.update({
            status: 'Paid',
            paymentId: paymentIntentId,
            paymentStatus: paymentIntent.status,
            updatedAt: new Date().toISOString()
          });
          console.log(`Order ${orderId} status updated to Paid`);
        } else {
          console.log(`Order ${orderId} not found in Firestore`);
        }
      } catch (error) {
        console.error('Error updating order status:', error);
      }
    }

    // Return the payment status
    console.log('Sending payment verification response');
    res.json({
      status: paymentIntent.status,
      orderId: orderId,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      created: new Date(paymentIntent.created * 1000).toISOString(),
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    console.error('Stripe error details:', error.raw ? JSON.stringify(error.raw) : 'No detailed error');
    res.status(500).json({ 
      error: error.message || 'Failed to verify payment',
      details: error.raw || {},
      status: 'failed'
    });
  }
});

// Start the server
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log('Environment:', {
    stripeKey: process.env.STRIPE_SECRET_KEY ? 'Present' : 'Using fallback key',
    port: PORT
  });
  listRoutes();
});