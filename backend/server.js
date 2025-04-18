import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const KHALTI_SECRET_KEY = process.env.KHALTI_SECRET_KEY;

app.post('/initiate-payment', async (req, res) => {
  const { amount, purchase_order_id } = req.body;

  console.log("Initiating payment with:", { amount, purchase_order_id });
  console.log("KHALTI_SECRET_KEY loaded:", !!KHALTI_SECRET_KEY);

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  if (!purchase_order_id) {
    return res.status(400).json({ error: 'Purchase order ID is required' });
  }

  try {
    const response = await fetch('https://a.khalti.com/api/v2/epayment/initiate/', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${KHALTI_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        return_url: 'http://localhost:29995/payment-success',
        website_url: 'http://localhost:29995',
        amount: Math.round(amount * 100),
        purchase_order_id,
        purchase_order_name: 'BidnThrift Order',
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log("Khalti response OK:", data);
      res.json({
        pidx: data.pidx,
        payment_url: data.payment_url,
      });
    } else {
      // console.error("Khalti response error:", data);
      // res.status(500).json({ error: 'Khalti API error', details: data });
      console.error("Raw Khalti error:", JSON.stringify(data, null, 2));
      res.status(500).json({ error: 'Khalti API error', details: data });

    }
  } catch (error) {
    console.error('Error initiating Khalti payment:', error);
    res.status(500).json({ error: 'Payment initiation failed', details: error.message });
  }
});

app.post('/verify-payment', async (req, res) => {
  const { pidx } = req.body;

  try {
    const response = await fetch('https://a.khalti.com/api/v2/epayment/lookup/', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${KHALTI_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pidx }),
    });

    const data = await response.json();

    if (response.ok && data.status === 'Completed') {
      res.json({ success: true, message: 'Payment verified successfully', data });
    } else {
      res.status(400).json({ success: false, message: 'Payment not completed', data });
    }
  } catch (error) {
    console.error('Error verifying Khalti payment:', error);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
