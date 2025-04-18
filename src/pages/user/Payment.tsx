import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Payment: React.FC = () => {
  const [amount, setAmount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handlePayment = async () => {
    if (!amount || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5000/initiate-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount,
          purchase_order_id: `ORDER-${Date.now()}`, // Unique order ID
        }),
      });

      const data = await response.json();

      if (response.ok && data.payment_url) {
        // Redirect to Khalti's payment page
        window.location.href = data.payment_url;
      } else {
        throw new Error(data.error || 'Failed to initiate payment');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Payment Page</h2>
      <div>
        <label>
          Amount (NPR):
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            min="1"
            disabled={loading}
          />
        </label>
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button onClick={handlePayment} disabled={loading}>
        {loading ? 'Processing...' : 'Pay with Khalti'}
      </button>
    </div>
  );
};

export default Payment;