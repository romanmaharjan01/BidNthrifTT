import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import config from '@/config';

// Initialize Stripe with the publishable key
const stripePromise = loadStripe('pk_test_51RGXzVPewya4IHYyhSnVWU000x3SxIRlCMbtywY8rYsBXrxv81SpXDEvlq1kIVx5QZiJYfa9ocHMvtYBLsP883wv00ovh93c0C');

interface Order {
  id: string;
  userId: string;
  cartItems: Array<{
    id: string;
    title: string;
    price: number;
    quantity: number;
    imageUrl: string;
  }>;
  total: number;
  status: string;
  createdAt: string;
  currency?: string;
}

// Approximate conversion rate for display purposes
const NPR_TO_INR_RATE = 0.0075;

const CheckoutForm = ({ order }: { order: Order }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!stripe) {
      console.log('Stripe not loaded yet');
      return;
    }

    const clientSecret = new URLSearchParams(window.location.search).get(
      'payment_intent_client_secret'
    );

    if (!clientSecret) {
      console.log('No client secret in URL');
      return;
    }

    console.log('Found client secret in URL, verifying payment');

    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
      console.log('Retrieved payment intent status:', paymentIntent?.status);

      switch (paymentIntent?.status) {
        case 'succeeded':
          toast({
            title: 'Payment Successful',
            description: 'Thank you for your purchase!',
          });
          console.log('Redirecting to success page from retrieval with paymentIntent:', paymentIntent.id);
          navigate(`/payment/success?payment_intent=${paymentIntent.id}`);
          break;
        case 'processing':
          toast({
            title: 'Payment Processing',
            description: 'Your payment is processing.',
          });
          break;
        case 'requires_payment_method':
          toast({
            title: 'Payment Failed',
            description: 'Please try another payment method.',
            variant: 'destructive',
          });
          break;
        default:
          toast({
            title: 'Payment Status',
            description: `Payment status: ${paymentIntent?.status || 'unknown'}`,
            variant: 'destructive',
          });
          break;
      }
    }).catch(error => {
      console.error('Error retrieving payment intent:', error);
      toast({
        title: 'Error',
        description: 'Could not verify payment status',
        variant: 'destructive',
      });
    });
  }, [stripe, navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      console.error("Stripe.js hasn't loaded yet");
      setErrorMessage("Payment processor not ready. Please try again in a moment.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      console.log('Starting payment submission process');

      const submitResult = await elements.submit();
      console.log('Elements submission result:', submitResult);

      if (submitResult.error) {
        console.error('Element submission error:', submitResult.error);
        throw submitResult.error;
      }

      console.log('Order details for payment:', {
        id: order.id,
        total: order.total,
      });

      // Check for required options before proceeding
      if (!stripe || !elements) {
        throw new Error("Stripe has not been properly initialized.");
      }

      console.log('Confirming payment with Stripe');
      const returnUrl = `${window.location.origin}/payment/success?order_id=${order.id}`;
      console.log('Return URL:', returnUrl);

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: returnUrl,
        },
        redirect: 'if_required',
      });

      console.log('Payment confirmation result:', { 
        error: error ? { type: error.type, message: error.message } : undefined, 
        paymentIntent: paymentIntent ? { id: paymentIntent.id, status: paymentIntent.status } : undefined 
      });

      if (error) {
        console.error('Payment confirmation error:', error);
        throw error;
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        console.log('Payment succeeded without redirect');
        // Log the order ID and payment intent that will be passed to success page
        console.log('Redirecting to success page with params:', {
          orderId: order.id,
          paymentIntentId: paymentIntent.id,
          url: `/payment/success?order_id=${order.id}&payment_intent=${paymentIntent.id}`
        });
        toast({
          title: 'Payment Successful',
          description: 'Thank you for your purchase!',
        });
        navigate(`/payment/success?order_id=${order.id}&payment_intent=${paymentIntent.id}`);
      } else {
        console.log('Payment requires additional actions, waiting for redirect');
      }
    } catch (error: any) {
      console.error('Detailed payment error:', error);

      if (error.type) console.error('Error type:', error.type);
      if (error.code) console.error('Error code:', error.code);
      if (error.decline_code) console.error('Decline code:', error.decline_code);
      if (error.message) console.error('Error message:', error.message);

      // Use a more user-friendly error message
      let userFriendlyMessage = "An unexpected error occurred";
      
      if (error.message) {
        if (error.message.includes("elements store")) {
          userFriendlyMessage = "Payment system initialization failed. Please refresh the page and try again.";
        } else if (error.message.includes("card was declined")) {
          userFriendlyMessage = "Your card was declined. Please try another payment method.";
        } else if (error.message.includes("authentication")) {
          userFriendlyMessage = "Additional authentication is required. Please try again.";
        } else {
          userFriendlyMessage = error.message;
        }
      }
      
      setErrorMessage(userFriendlyMessage);
      toast({
        title: 'Payment Failed',
        description: userFriendlyMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {errorMessage && (
        <div className="text-red-500 text-sm mt-2">{errorMessage}</div>
      )}
      <Button
        type="submit"
        disabled={!stripe || isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span>Processing...</span>
          </div>
        ) : (
          'Pay Now'
        )}
      </Button>
    </form>
  );
};

const Payment: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchOrderAndCreateIntent = async () => {
      if (!id) {
        setError('Order ID is missing');
        setLoading(false);
        return;
      }

      try {
        // Fetch order details
        const orderResponse = await fetch(`${config.apiUrl}/orders/${id}`);
        if (!orderResponse.ok) {
          throw new Error('Failed to fetch order details');
        }
        const orderData = await orderResponse.json();
        setOrder(orderData);

        // Create payment intent
        const intentResponse = await fetch(`${config.apiUrl}/create-payment-intent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: orderData.total, // Amount in NPR
            orderId: orderData.id,
          }),
        });

        if (!intentResponse.ok) {
          const errorData = await intentResponse.json();
          console.error('Payment intent creation failed:', errorData);
          throw new Error(errorData.error || 'Failed to create payment intent');
        }

        const { clientSecret, paymentIntentId } = await intentResponse.json();
        console.log('Payment intent created:', paymentIntentId);
        setClientSecret(clientSecret);
      } catch (error: any) {
        console.error('Error in payment setup:', error);
        setError(error.message || 'An error occurred while setting up the payment');
        toast({
          title: 'Payment Setup Failed',
          description: error.message || 'Failed to set up payment. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOrderAndCreateIntent();
  }, [id, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading payment details...</span>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Payment Error</h2>
            <p className="text-gray-600 mb-4">{error || 'Order not found'}</p>
            <Button onClick={() => navigate('/cart')} className="bg-blue-600 hover:bg-blue-700">
              Return to Cart
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Complete Your Payment</h1>

          <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
            <div className="space-y-4">
              {order.cartItems.map((item) => (
                <div key={item.id} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                  </div>
                  <p className="font-medium">NPR {item.price * item.quantity}</p>
                </div>
              ))}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center font-bold">
                  <p>Total</p>
                  <p>NPR {order.total}</p>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Payment will be processed in INR (approx. INR {(order.total * NPR_TO_INR_RATE).toFixed(2)})
                </p>
              </div>
            </div>
          </div>

          {clientSecret && (
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm order={order} />
              </Elements>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Payment;