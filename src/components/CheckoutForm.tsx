import { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from './ui/use-toast';

interface CheckoutFormProps {
  order: any;
}

const CheckoutForm = ({ order }: CheckoutFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      console.error('Stripe.js has not loaded');
      return;
    }

    setIsProcessing(true);

    try {
      // Confirm the payment
      const { error: submitError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
        },
        redirect: 'if_required',
      });

      if (submitError) {
        console.error('Payment submission error:', submitError);
        throw new Error(submitError.message);
      }

      if (paymentIntent) {
        // Verify the payment on the backend
        const verifyResponse = await fetch(`http://localhost:5002/verify-payment/${paymentIntent.id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (!verifyResponse.ok) {
          const errorData = await verifyResponse.json();
          throw new Error(errorData.error || 'Payment verification failed');
        }

        // Payment successful
        toast({
          title: "Payment Successful",
          description: "Your order has been confirmed!",
          variant: "default",
        });

        // Redirect to success page
        navigate('/payment-success', {
          state: { 
            orderId: order.id,
            paymentIntentId: paymentIntent.id
          }
        });
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Failed",
        description: error.message || "There was a problem processing your payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full"
      >
        {isProcessing ? (
          <div className="flex items-center justify-center">
            <Loader2 className="animate-spin mr-2" />
            Processing...
          </div>
        ) : (
          `Pay NPR ${order.total}`
        )}
      </Button>
    </form>
  );
};

export default CheckoutForm; 