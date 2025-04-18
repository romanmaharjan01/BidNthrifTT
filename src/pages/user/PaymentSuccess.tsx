import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const PaymentSuccess: React.FC = () => {
  const [status, setStatus] = useState<string>('Verifying payment...');
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const verifyPayment = async () => {
      const pidx = searchParams.get('pidx');
      if (!pidx) {
        setStatus('Payment verification failed: Missing pidx');
        return;
      }

      try {
        const response = await fetch('http://localhost:5000/verify-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ pidx }),
        });

        const data = await response.json();

        if (data.success) {
          setStatus('Payment successful! Thank you for your purchase.');
          // Optionally save to Firestore here
        } else {
          setStatus('Payment failed or not completed.');
        }
      } catch (error) {
        setStatus('Error verifying payment. Please contact support.');
      }
    };

    verifyPayment();
  }, [searchParams]);

  return (
    <div>
      <h2>Payment Status</h2>
      <p>{status}</p>
    </div>
  );
};

export default PaymentSuccess;