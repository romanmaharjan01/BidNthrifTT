import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, Timestamp, addDoc, collection } from 'firebase/firestore';
import { db, auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import axios from 'axios';

// Load Stripe outside component to avoid recreating it on renders
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY || 'pk_test_YOUR_TEST_KEY');

// Add these interfaces near the top of the file, after imports
interface AuctionData {
  id: string;
  productId: string;
  currentBid: number;
  currentBidderId?: string;
  sellerId?: string;
  status?: string;
  [key: string]: any;
}

interface ProductData {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  price?: number;
  [key: string]: any;
}

// Component for the payment form
const CheckoutForm: React.FC<{
  clientSecret: string;
  auctionId: string;
  amount: number;
  onSuccess: () => void;
}> = ({ clientSecret, auctionId, amount, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js has not loaded yet
      return;
    }

    setIsProcessing(true);

    try {
      const cardElement = elements.getElement(CardElement);
      
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      // Confirm the payment
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (error) {
        setCardError(error.message || 'Payment failed');
        toast({
          title: 'Payment Failed',
          description: error.message || 'An error occurred while processing your payment.',
          variant: 'destructive',
        });
      } else if (paymentIntent?.status === 'succeeded') {
        // Verify payment on backend
        await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/payment/verify-payment`, {
          paymentIntentId: paymentIntent.id,
          auctionId,
        });
        
        setCardError(null);
        toast({
          title: 'Payment Successful',
          description: 'Your payment has been processed successfully!',
        });
        onSuccess();
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      setCardError(error.message || 'An error occurred during payment processing');
      toast({
        title: 'Error',
        description: error.message || 'An error occurred during payment processing',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm text-muted-foreground">Card Information</label>
        <div className="border p-3 rounded-md">
          <CardElement options={cardElementOptions} />
        </div>
        {cardError && <p className="text-sm text-red-500">{cardError}</p>}
      </div>
      
      <Button 
        type="submit" 
        disabled={!stripe || isProcessing} 
        className="w-full"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          `Pay NPR ${amount}`
        )}
      </Button>
    </form>
  );
};

// Main Payment page component
const Payment: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [auction, setAuction] = useState<AuctionData | null>(null);
  const [product, setProduct] = useState<ProductData | null>(null);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [shippingInfo, setShippingInfo] = useState({
    name: '',
    address: '',
    city: '',
    postalCode: '',
    phone: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        // Redirect to login if not authenticated
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!id || !userId) return;

    const fetchAuctionAndCreatePaymentIntent = async () => {
      try {
        setIsLoading(true);
        
        // Get auction details
        const auctionDoc = await getDoc(doc(db, 'auctions', id));
        if (!auctionDoc.exists()) {
          toast({
            title: 'Error',
            description: 'Auction not found',
            variant: 'destructive',
          });
          navigate('/');
          return;
        }

        const auctionData = {
          id: auctionDoc.id,
          ...auctionDoc.data(),
        } as AuctionData;

        // Verify user is the winner
        if (auctionData.currentBidderId !== userId) {
          toast({
            title: 'Access Denied',
            description: 'You are not authorized to make this payment',
            variant: 'destructive',
          });
          navigate('/');
          return;
        }

        // Get product details
        const productDoc = await getDoc(doc(db, 'products', auctionData.productId));
        if (productDoc.exists()) {
          const productData = {
            id: productDoc.id,
            ...productDoc.data(),
          } as ProductData;
          setProduct(productData);
        }

        setAuction(auctionData);

        // Get user info for pre-filling shipping details
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setShippingInfo(prev => ({
            ...prev,
            name: userData.displayName || '',
            phone: userData.phone || '',
            // Add other details if available
          }));
        }

        // Create payment intent
        const response = await axios.post(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/payment/create-payment-intent`,
          {
            amount: auctionData.currentBid,
            auctionId: id,
          }
        );

        setClientSecret(response.data.clientSecret);
      } catch (error) {
        console.error('Error loading payment data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load payment information. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuctionAndCreatePaymentIntent();
  }, [id, userId, navigate, toast]);

  const handleShippingInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setShippingInfo(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePaymentSuccess = async () => {
    try {
      // Update auction with shipping information
      await updateDoc(doc(db, 'auctions', id as string), {
        shippingInfo,
        paymentStatus: 'paid',
        updatedAt: Timestamp.now(),
      });

      // Create notification for seller
      if (auction && auction.sellerId) {
        await addDoc(collection(db, 'notifications'), {
          userId: auction.sellerId,
          title: 'Payment Received',
          message: `A payment for NPR ${auction.currentBid} has been received for your auction: ${product?.title}`,
          type: 'payment',
          read: false,
          auctionId: id,
          createdAt: Timestamp.now(),
        });
      }

      setPaymentSuccess(true);
    } catch (error) {
      console.error('Error updating shipping info:', error);
      toast({
        title: 'Error',
        description: 'Failed to update shipping information. Please contact support.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
          <Card>
            <CardHeader className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <CardTitle className="text-2xl">Payment Successful!</CardTitle>
              <CardDescription>
                Thank you for your purchase! Your order has been confirmed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded">
                <h3 className="font-semibold">Order Summary</h3>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between">
                    <span>Item:</span>
                    <span>{product?.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Amount:</span>
                    <span>NPR {auction?.currentBid}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Shipping Information</h3>
                <p>{shippingInfo.name}</p>
                <p>{shippingInfo.address}</p>
                <p>{shippingInfo.city}, {shippingInfo.postalCode}</p>
                <p>{shippingInfo.phone}</p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button onClick={() => navigate('/')}>
                Return to Home
              </Button>
            </CardFooter>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (!auction || !product || !clientSecret) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center py-10">
            <h2 className="text-2xl font-bold mb-4">Payment Information Not Available</h2>
            <p className="text-muted-foreground mb-6">Unable to load payment information. Please try again later.</p>
            <Button onClick={() => navigate('/')}>
              Return to Home
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
      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <Button 
          variant="ghost" 
          className="mb-4"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Complete Your Purchase</CardTitle>
            <CardDescription>
              You're just a few steps away from finalizing your auction win!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border-b pb-4">
              <h3 className="font-semibold mb-3">Order Summary</h3>
              <div className="flex items-center space-x-4">
                <div className="h-20 w-20 overflow-hidden rounded">
                  <img 
                    src={product.imageUrl || 'https://via.placeholder.com/80'} 
                    alt={product.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">{product.title}</h4>
                  <p className="text-sm text-muted-foreground">Winning Bid: NPR {auction.currentBid}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Shipping Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="text-sm text-muted-foreground">Full Name</label>
                  <Input
                    id="name"
                    name="name"
                    value={shippingInfo.name}
                    onChange={handleShippingInfoChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="text-sm text-muted-foreground">Phone Number</label>
                  <Input
                    id="phone"
                    name="phone"
                    value={shippingInfo.phone}
                    onChange={handleShippingInfoChange}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="address" className="text-sm text-muted-foreground">Address</label>
                  <Input
                    id="address"
                    name="address"
                    value={shippingInfo.address}
                    onChange={handleShippingInfoChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="city" className="text-sm text-muted-foreground">City</label>
                  <Input
                    id="city"
                    name="city"
                    value={shippingInfo.city}
                    onChange={handleShippingInfoChange}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="postalCode" className="text-sm text-muted-foreground">Postal Code</label>
                  <Input
                    id="postalCode"
                    name="postalCode"
                    value={shippingInfo.postalCode}
                    onChange={handleShippingInfoChange}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Payment Information</h3>
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm 
                  clientSecret={clientSecret} 
                  auctionId={id as string} 
                  amount={auction.currentBid}
                  onSuccess={handlePaymentSuccess}
                />
              </Elements>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default Payment;