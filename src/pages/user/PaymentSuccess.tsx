import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { sendAutomatedPurchaseMessage, sendAutomatedAuctionMessage } from "@/services/chatService";
import { auth, db } from "../firebase";
import { getDoc, doc, updateDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import OrderChat from '@/components/OrderChat';
import config from '@/config';
import { createOrderNotification, createPaymentNotification } from "@/services/notificationService";
import { initializeOrderChat } from "@/services/chatService";

// Initialize Stripe
const stripePromise = loadStripe('pk_test_51RGXzVPewya4IHYyhSnVWU000x3SxIRlCMbtywY8rYsBXrxv81SpXDEvlq1kIVx5QZiJYfa9ocHMvtYBLsP883wv00ovh93c0C');

// Interface for order data
interface OrderData {
  id: string;
  buyerId: string;
  sellerId: string;
  items: Array<{
    productId: string;
    title: string;
    price: number;
    quantity: number;
  }>;
  totalPrice: number;
  status: string;
}

const PaymentStatusCheck = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { search } = location;
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your payment...');
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const { toast } = useToast();

  // Get current user
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUserId(user ? user.uid : null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const params = new URLSearchParams(search);
        const paymentIntent = params.get('payment_intent');
        const orderId = params.get('order_id');
        
        console.log('Verifying payment:', { paymentIntent, orderId });
        
        if (!paymentIntent && !orderId) {
          setStatus('error');
          setMessage('No payment information found.');
          return;
        }

        // If no payment intent but we have order ID
        if (!paymentIntent && orderId) {
          console.log('No payment intent found, but order ID is available:', orderId);
          try {
            // Fetch order details - first try Firestore
            const orderDoc = await getDoc(doc(db, "orders", orderId));
            
            if (orderDoc.exists()) {
              const data = orderDoc.data();
              console.log('Order data retrieved from Firestore:', data);
              
              // Set the order data
              setOrderData({
                id: orderId,
                buyerId: data.buyerId || userId || '',
                sellerId: data.sellerId || '',
                items: data.items || [],
                totalPrice: data.totalPrice || 0,
                status: data.status || ''
              });
              
              // Show success message
              setStatus('success');
              setMessage('Order confirmed! Thank you for your purchase.');
              toast({
                title: "Order Confirmed",
                description: "Your order has been confirmed. Thank you for your purchase!"
              });
            } else {
              // Try from backend API
              const orderResponse = await fetch(`${config.apiUrl}/orders/${orderId}`);
              if (!orderResponse.ok) {
                throw new Error('Failed to fetch order details');
              }
              
              const apiOrderData = await orderResponse.json();
              console.log('Order data retrieved from API:', apiOrderData);
              
              // Set the order data
              setOrderData({
                id: orderId,
                buyerId: apiOrderData.userId || userId || '',
                sellerId: apiOrderData.sellerId || '',
                items: apiOrderData.cartItems || [],
                totalPrice: apiOrderData.total || 0,
                status: apiOrderData.status || ''
              });
              
              // Show success message
              setStatus('success');
              setMessage('Order confirmed! Thank you for your purchase.');
              toast({
                title: "Order Confirmed",
                description: "Your order has been confirmed. Thank you for your purchase!"
              });
            }
          } catch (error) {
            console.error('Error processing order:', error);
            setStatus('error');
            setMessage('Failed to verify order information.');
          }
          return;
        }

        // Verify payment with backend
        if (!paymentIntent) {
          setStatus('error');
          setMessage('No payment information found.');
          return;
        }

        console.log('Verifying payment with backend:', paymentIntent);
        const response = await fetch(`${config.apiUrl}/verify-payment/${paymentIntent}`);
        
        if (!response.ok) {
          let errorDetails = {};
          let errorMessage = `Failed to verify payment: ${response.statusText}`;
          
          try {
            // Try to parse error response as JSON
            const errorData = await response.json();
            console.error('Payment verification failed:', response.status, errorData);
            
            // Use the user-friendly message if available
            if (errorData.userMessage) {
              errorMessage = errorData.userMessage;
            }
            
            errorDetails = errorData;
          } catch (parseError) {
            // If we can't parse as JSON, use text response
            const errorText = await response.text();
            console.error('Payment verification failed (non-JSON):', response.status, errorText);
            errorDetails = { text: errorText };
          }
          
          setStatus('error');
          setMessage(errorMessage);
          setPaymentDetails({ error: errorDetails, status: 'failed' });
          return;
        }
        
        const data = await response.json();
        console.log('Payment verification result:', data);
        setPaymentDetails(data);
        
        // Process based on payment status
        if (data.status === 'succeeded') {
          // Get order data
          if (data.orderId) {
            try {
              // Try to fetch from Firestore first
              const orderDoc = await getDoc(doc(db, "orders", data.orderId));
              
              if (orderDoc.exists()) {
                const orderData = orderDoc.data();
                setOrderData({
                  id: data.orderId,
                  buyerId: orderData.buyerId || userId || '',
                  sellerId: orderData.sellerId || '',
                  items: orderData.items || [],
                  totalPrice: orderData.totalPrice || 0,
                  status: orderData.status || ''
                });
              } else {
                // Try from API
                const orderResponse = await fetch(`${config.apiUrl}/orders/${data.orderId}`);
                if (orderResponse.ok) {
                  const apiOrderData = await orderResponse.json();
                  setOrderData({
                    id: data.orderId,
                    buyerId: apiOrderData.userId || userId || '',
                    sellerId: apiOrderData.sellerId || '',
                    items: apiOrderData.cartItems || [],
                    totalPrice: apiOrderData.total || 0,
                    status: apiOrderData.status || ''
                  });
                }
              }
            } catch (error) {
              console.error('Error fetching order details:', error);
            }
          }
          
          await processSuccessfulPayment(data, params, setStatus, setMessage, toast);
        } else if (data.status === 'processing') {
          setStatus('loading');
          setMessage(data.userMessage || 'Your payment is processing. Please wait a moment...');
        } else {
          setStatus('error');
          setMessage(data.userMessage || `Payment ${data.status || 'failed'}. Please try again.`);
        }
      } catch (error) {
        console.error('Error during payment verification:', error);
        setStatus('error');
        setMessage('An error occurred. Please try again later.');
      }
    };

    verifyPayment();
  }, [search, toast, navigate, location, userId]);

  const handleContinueShopping = () => {
    navigate('/shop');
  };

  const handleViewPurchases = () => {
    navigate('/user-details/purchases');
  };

  const handleTryAgain = () => {
    navigate('/cart');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-start bg-gray-50 p-4">
        <Card className="w-full max-w-md mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {status === 'loading' && <Loader2 className="h-6 w-6 animate-spin text-blue-500" />}
              {status === 'success' && <CheckCircle className="h-6 w-6 text-green-500" />}
              {status === 'error' && <XCircle className="h-6 w-6 text-red-500" />}
              <span>
                {status === 'loading' && 'Processing Payment'}
                {status === 'success' && 'Payment Successful'}
                {status === 'error' && 'Payment Failed'}
              </span>
            </CardTitle>
            <CardDescription>{message}</CardDescription>
          </CardHeader>
          <CardContent>
            {status === 'success' && (
              <p className="text-sm text-gray-500">
                Your order has been processed successfully. You'll receive a confirmation email shortly.
                You can now view your purchases or continue shopping.
              </p>
            )}
            {status === 'error' && (
              <p className="text-sm text-gray-500">
                We were unable to process your payment. Please try again or contact customer support for assistance.
                {paymentDetails && (
                  <span className="block mt-2">
                    Payment status: {paymentDetails.status || 'unknown'}
                  </span>
                )}
              </p>
            )}
            {status === 'loading' && (
              <p className="text-sm text-gray-500">
                Please wait while we verify your payment. This may take a moment...
              </p>
            )}
          </CardContent>
          <CardFooter className="flex gap-2">
            {status === 'success' && (
              <>
                <Button onClick={handleViewPurchases} variant="outline" className="flex-1">
                  View Purchases
                </Button>
                <Button onClick={handleContinueShopping} className="flex-1">
                  Continue Shopping
                </Button>
              </>
            )}
            {status === 'error' && (
              <Button onClick={handleTryAgain} className="w-full">
                Return to Cart
              </Button>
            )}
            {status === 'loading' && (
              <Button disabled className="w-full">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </Button>
            )}
          </CardFooter>
        </Card>
        
        {/* Chat with seller - only shown after successful payment */}
        {status === 'success' && orderData && userId && orderData.sellerId && orderData.items.length > 0 && (
          <div className="w-full max-w-md">
            <h2 className="text-xl font-semibold mb-3">Chat with Seller</h2>
            <OrderChat 
              buyerId={userId} 
              sellerId={orderData.sellerId}
              orderId={orderData.id}
              productId={orderData.items[0].productId}
              productName={orderData.items[0].title || 'your purchased item'}
            />
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

// Wrapper component that provides Stripe context
const PaymentSuccess = () => {
  return (
    <Elements stripe={stripePromise}>
      <PaymentStatusCheck />
    </Elements>
  );
};

// Define or import processSuccessfulPayment function
const processSuccessfulPayment = async (
  paymentData: any,
  params: URLSearchParams,
  setStatus: React.Dispatch<React.SetStateAction<'loading' | 'success' | 'error'>>,
  setMessage: React.Dispatch<React.SetStateAction<string>>,
  toast: (options: { title: string; description: string }) => void
) => {
  try {
    const orderId = paymentData.orderId || params.get('order_id');
    const userId = auth.currentUser?.uid;
    
    if (!orderId) {
      // Still show success even without order ID
      setStatus('success');
      setMessage('Payment successful! Thank you for your purchase.');
      toast({
        title: 'Payment Successful',
        description: 'Thank you for your purchase!'
      });
      return;
    }
    
    try {
      // First try to get order from Firestore
      const orderDoc = await getDoc(doc(db, "orders", orderId));
      
      if (orderDoc.exists()) {
        const orderData = orderDoc.data();
        
        // Create notification for seller
        if (orderData.sellerId && userId) {
          try {
            // Get buyer name
            const buyerDoc = await getDoc(doc(db, "users", userId));
            const buyerName = buyerDoc.exists() 
              ? (buyerDoc.data().displayName || buyerDoc.data().email || "A customer")
              : "A customer";
            
            // Get first product name
            const productName = orderData.items && orderData.items.length > 0 
              ? orderData.items[0].title 
              : "an item";
            
            // Send notification to seller
            await createOrderNotification(
              orderData.sellerId,
              orderId,
              productName,
              buyerName
            );
            
            // Create payment notification for buyer
            await createPaymentNotification(
              userId,
              orderData.totalPrice || 0,
              orderId.substring(0, 8)
            );
            
            // Initialize chat between buyer and seller
            if (orderData.items && orderData.items.length > 0) {
              await initializeOrderChat(
                userId,
                orderData.sellerId,
                orderData.items[0].productId,
                productName,
                orderId
              );
            }
          } catch (error) {
            console.error("Error sending notifications:", error);
          }
        }
      } else {
        // Try from backend API
        const orderResponse = await fetch(`${config.apiUrl}/orders/${orderId}`);
        if (orderResponse.ok) {
          const apiOrderData = await orderResponse.json();
          
          // Handle any notification for API orders if needed
          if (userId) {
            // Create payment notification for buyer
            await createPaymentNotification(
              userId,
              apiOrderData.total || 0,
              orderId.substring(0, 8)
            );
          }
        }
      }
    } catch (error) {
      console.error("Error handling order notifications:", error);
    }
    
    // Show success message
    setStatus('success');
    setMessage('Payment successful! Thank you for your purchase.');
    toast({
      title: 'Payment Successful',
      description: 'Thank you for your purchase!'
    });
  } catch (error) {
    console.error('Error processing successful payment:', error);
    setStatus('success');
    setMessage('Payment successful! We will process your order shortly.');
  }
};

export default PaymentSuccess;