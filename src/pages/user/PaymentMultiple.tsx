import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, Timestamp, addDoc, collection, getDocs, where, query } from 'firebase/firestore';
import { db, auth } from '../firebase';
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
import { Loader2, CheckCircle, ArrowLeft, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import OrderChat from '@/components/OrderChat';
import { createOrderNotification, createPaymentNotification } from "@/services/notificationService";
import { initializeOrderChat } from "@/services/chatService";

// Load Stripe with a valid publishable key
const stripePromise = loadStripe('pk_test_51RGXzVPewya4IHYyhSnVWU000x3SxIRlCMbtywY8rYsBXrxv81SpXDEvlq1kIVx5QZiJYfa9ocHMvtYBLsP883wv00ovh93c0C');

interface CartItem {
  productId: string;
  title: string;
  price: number;
  imageUrl: string;
  quantity: number;
  sellerId?: string;
}

interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  status: string;
  shippingInfo?: {
    name: string;
    address: string;
    city: string;
    postalCode: string;
    phone: string;
  };
  deliveryLocation?: {
    lat: number;
    lng: number;
    address?: string;
  };
  createdAt: any;
}

interface DeliveryLocation {
  lat: number;
  lng: number;
  address?: string;
}

// Component for the payment form
const CheckoutForm: React.FC<{
  clientSecret: string;
  orderId: string;
  amount: number;
  onSuccess: () => void;
}> = ({ clientSecret, orderId, amount, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js has not loaded yet
      console.log("Stripe has not loaded yet");
      return;
    }

    setIsProcessing(true);

    try {
      const cardElement = elements.getElement(CardElement);
      
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      console.log("Processing payment with secret:", clientSecret.slice(0, 10) + "...");

      // Confirm the payment
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: 'Test Customer',
          },
        },
      });

      if (error) {
        console.error("Payment confirmation error:", error);
        setCardError(error.message || 'Payment failed');
        toast({
          title: 'Payment Failed',
          description: error.message || 'An error occurred while processing your payment.',
          variant: 'destructive',
        });
      } else if (paymentIntent?.status === 'succeeded') {
        console.log("Payment succeeded:", paymentIntent.id);
        setCardError(null);
        toast({
          title: 'Payment Successful',
          description: 'Your payment has been processed successfully!',
        });
        onSuccess();
      } else {
        console.log("Payment intent status:", paymentIntent?.status);
        toast({
          title: 'Payment Status',
          description: `Payment status: ${paymentIntent?.status || 'unknown'}`,
        });
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
    hidePostalCode: true,
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" id="payment-form">
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
const PaymentMultiple: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
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
  // Add state for delivery location
  const [deliveryLocation, setDeliveryLocation] = useState<DeliveryLocation>({
    lat: 27.7172, // Default to Kathmandu coordinates
    lng: 85.3240,
    address: '',
  });
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const { toast } = useToast();
  const [sellerOrders, setSellerOrders] = useState<Record<string, CartItem[]>>({});

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

    const fetchOrderAndCreatePaymentIntent = async () => {
      try {
        setIsLoading(true);
        
        // Get order details
        const orderDoc = await getDoc(doc(db, 'orders', id));
        if (!orderDoc.exists()) {
          toast({
            title: 'Error',
            description: 'Order not found',
            variant: 'destructive',
          });
          navigate('/cart');
          return;
        }

        const orderData = {
          id: orderDoc.id,
          ...orderDoc.data(),
        } as Order;

        // Verify user is the owner of the order
        if (orderData.userId !== userId) {
          toast({
            title: 'Access Denied',
            description: 'You are not authorized to access this order',
            variant: 'destructive',
          });
          navigate('/cart');
          return;
        }

        setOrder(orderData);

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
        // First, check if we already have a payment intent for this order
        const paymentIntentsQuery = query(
          collection(db, 'paymentIntents'),
          where('orderId', '==', id),
          where('userId', '==', userId)
        );
        
        const paymentIntentsSnapshot = await getDocs(paymentIntentsQuery);
        let existingClientSecret = '';
        
        if (!paymentIntentsSnapshot.empty) {
          const paymentIntentDoc = paymentIntentsSnapshot.docs[0];
          existingClientSecret = paymentIntentDoc.data().clientSecret;
          console.log("Found existing payment intent");
        }
        
        if (existingClientSecret) {
          setClientSecret(existingClientSecret);
        } else {
          console.log("Creating new payment intent for amount:", orderData.total);
          
          // Create new payment intent via our server
          try {
            const response = await fetch('http://localhost:5002/create-payment-intent', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                amount: orderData.total * 100, // Convert to smallest currency unit
                orderId: id
              }),
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error("Payment intent creation failed:", errorText);
              throw new Error("Failed to create payment intent");
            }
            
            const data = await response.json();
            console.log("Payment intent created:", data);
            
            // Save payment intent reference to Firestore
            await addDoc(collection(db, 'paymentIntents'), {
              clientSecret: data.clientSecret,
              paymentIntentId: data.paymentIntentId,
              orderId: id,
              userId: userId,
              amount: orderData.total,
              createdAt: Timestamp.now()
            });
            
            setClientSecret(data.clientSecret);
          } catch (error) {
            console.error("Error creating payment intent:", error);
            toast({
              title: 'Payment Setup Failed',
              description: 'Failed to set up payment. Please try again later.',
              variant: 'destructive',
            });
          }
        }
        
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

    fetchOrderAndCreatePaymentIntent();
  }, [id, userId, navigate, toast]);

  useEffect(() => {
    // Load Google Maps script
    const loadGoogleMapsScript = () => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY'}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initializeMap;
      document.head.appendChild(script);
    };

    loadGoogleMapsScript();
  }, []);

  const initializeMap = () => {
    if (mapRef.current && !mapInstanceRef.current) {
      const mapOptions = {
        center: { lat: deliveryLocation.lat, lng: deliveryLocation.lng },
        zoom: 14,
        mapTypeControl: false,
      };

      const map = new google.maps.Map(mapRef.current, mapOptions);
      mapInstanceRef.current = map;

      // Set marker
      const marker = new google.maps.Marker({
        position: { lat: deliveryLocation.lat, lng: deliveryLocation.lng },
        map: map,
        draggable: true,
        title: 'Your delivery location',
      });
      markerRef.current = marker;

      // Add click event to map
      map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          marker.setPosition(e.latLng);
          updateLocationFromMarker(e.latLng);
        }
      });

      // Add drag end event to marker
      marker.addListener('dragend', () => {
        if (marker.getPosition()) {
          updateLocationFromMarker(marker.getPosition()!);
        }
      });

      // Create geocoder for address lookup
      const geocoder = new google.maps.Geocoder();

      // Update address when marker position changes
      const updateLocationFromMarker = (position: google.maps.LatLng) => {
        const lat = position.lat();
        const lng = position.lng();
        
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            setDeliveryLocation({
              lat,
              lng, 
              address: results[0].formatted_address
            });
            
            // Also update address field in shipping info
            setShippingInfo(prev => ({
              ...prev,
              address: results[0].formatted_address
            }));
          } else {
            setDeliveryLocation({ lat, lng });
            toast({
              title: 'Location Set',
              description: 'Address details could not be fetched. Only coordinates saved.',
              variant: 'default',
            });
          }
        });
      };

      setMapLoaded(true);
    }
  };

  const handleShippingInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setShippingInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleAddressSearch = () => {
    if (!mapInstanceRef.current || !markerRef.current) return;
    
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: shippingInfo.address }, (results, status) => {
      if (status === 'OK' && results && results[0] && results[0].geometry) {
        const location = results[0].geometry.location;
        
        // Update map center and marker
        mapInstanceRef.current?.setCenter(location);
        markerRef.current?.setPosition(location);
        
        // Update delivery location state
        setDeliveryLocation({
          lat: location.lat(),
          lng: location.lng(),
          address: results[0].formatted_address
        });
      } else {
        toast({
          title: 'Address Not Found',
          description: 'Could not find the entered address. Please try again.',
          variant: 'destructive',
        });
      }
    });
  };

  const handlePaymentSuccess = async () => {
    if (!userId || !order) return;
    
    try {
      setIsLoading(true);
      
      // Update order status
      await updateDoc(doc(db, 'orders', order.id), {
        status: 'paid',
        paidAt: Timestamp.now(),
        shippingInfo,
        deliveryLocation: {
          lat: deliveryLocation.lat,
          lng: deliveryLocation.lng,
          address: deliveryLocation.address,
        },
      });
      
      // Group items by seller
      const sellerOrders: Record<string, CartItem[]> = {};
      
      for (const item of order.items) {
        // Get product details to find seller
        const productDoc = await getDoc(doc(db, 'products', item.productId));
        if (productDoc.exists()) {
          const productData = productDoc.data();
          const sellerId = productData.sellerId || 'unknown';
          
          if (!sellerOrders[sellerId]) {
            sellerOrders[sellerId] = [];
          }
          
          sellerOrders[sellerId].push({
            ...item,
            sellerId
          });
        }
      }
      
      // Save seller orders to state for chat component
      setSellerOrders(sellerOrders);
      
      // Create individual orders for each seller
      for (const [sellerId, items] of Object.entries(sellerOrders)) {
        if (sellerId === 'unknown') continue;
        
        const sellerTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Create seller-specific order
        const sellerOrderRef = await addDoc(collection(db, 'orders'), {
          parentOrderId: order.id,
          buyerId: userId,
          sellerId,
          items,
          totalPrice: sellerTotal,
          shippingInfo,
          deliveryLocation: {
            lat: deliveryLocation.lat,
            lng: deliveryLocation.lng,
            address: deliveryLocation.address,
          },
          deliveryStatus: 'Pending',
          paidAt: Timestamp.now(),
          createdAt: Timestamp.now(),
        });
        
        // Update stock for each item
        for (const item of items) {
          const productRef = doc(db, "products", item.productId);
          const productDoc = await getDoc(productRef);
          
          if (productDoc.exists()) {
            const currentStock = productDoc.data().stock;
            const newStock = Math.max(0, currentStock - item.quantity);
            
            await updateDoc(productRef, {
              stock: newStock
            });
          }
        }
        
        // Send notification to seller
        try {
          // Get buyer name
          const buyerDoc = await getDoc(doc(db, "users", userId));
          const buyerName = buyerDoc.exists() 
            ? (buyerDoc.data().displayName || buyerDoc.data().email || "A customer")
            : "A customer";
          
          // Get first product name
          const productName = items[0].title || "an item";
          
          // Create notification for seller
          await createOrderNotification(
            sellerId,
            sellerOrderRef.id,
            items.length > 1 ? `${productName} and ${items.length - 1} more items` : productName,
            buyerName
          );
          
          // Initialize chat between buyer and seller
          await initializeOrderChat(
            userId,
            sellerId,
            items[0].productId,
            productName,
            sellerOrderRef.id
          );
        } catch (error) {
          console.error("Error sending notifications:", error);
        }
      }
      
      // Create payment notification for buyer
      if (userId) {
        await createPaymentNotification(
          userId,
          order.total,
          order.id.substring(0, 8)
        );
      }
      
      // Clear the user's cart
      const cartRef = doc(db, 'carts', userId);
      await updateDoc(cartRef, { items: [] });
      
      setPaymentSuccess(true);
      toast({
        title: 'Order Placed',
        description: 'Your order has been placed successfully!',
      });
    } catch (error: any) {
      console.error('Error processing order:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to complete order. Please contact support.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
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
                    <span>Order ID:</span>
                    <span>{order?.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Items:</span>
                    <span>{order?.items.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Amount:</span>
                    <span>NPR {order?.total.toFixed(2)}</span>
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
              
              {sellerOrders && Object.keys(sellerOrders).length > 0 && (
                <div className="pt-6">
                  <h3 className="font-semibold mb-4">Chat with Sellers</h3>
                  <div className="space-y-6">
                    {Object.entries(sellerOrders).map(([sellerId, items]) => {
                      const productName = items[0]?.title || 'your purchased item';
                      return (
                        <div key={sellerId} className="border rounded-lg p-4">
                          <h4 className="font-medium mb-2">
                            {items.length > 1 
                              ? `${productName} and ${items.length - 1} more item(s)`
                              : productName
                            }
                          </h4>
                          {userId && (
                            <OrderChat
                              buyerId={userId}
                              sellerId={sellerId}
                              orderId={order?.id || ''}
                              productId={items[0]?.productId || ''}
                              productName={productName}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <div className="flex w-full gap-2">
                <Button onClick={() => navigate('/user-details/purchases')} variant="outline" className="flex-1">
                  View Purchases
                </Button>
                <Button onClick={() => navigate('/shop')} className="flex-1">
                  Continue Shopping
                </Button>
              </div>
            </CardFooter>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center py-10">
            <h2 className="text-2xl font-bold mb-4">Order Information Not Available</h2>
            <p className="text-muted-foreground mb-6">Unable to load order information. Please try again later.</p>
            <Button onClick={() => navigate('/cart')}>
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
      <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
        <Button 
          variant="ghost" 
          className="mb-4"
          onClick={() => navigate('/cart')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Cart
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Complete Your Purchase</CardTitle>
            <CardDescription>
              Enter your shipping information and payment details to complete your order
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="border-b pb-4">
              <h3 className="font-semibold mb-3">Order Summary</h3>
              <div className="space-y-4 max-h-60 overflow-y-auto">
                {order.items.map((item, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="h-16 w-16 overflow-hidden rounded">
                      <img 
                        src={item.imageUrl || 'https://via.placeholder.com/64'} 
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        NPR {item.price.toFixed(2)} x {item.quantity}
                      </p>
                    </div>
                    <div className="font-medium">
                      NPR {(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t flex justify-between font-bold">
                <span>Total</span>
                <span>NPR {order.total.toFixed(2)}</span>
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
                  <div className="flex space-x-2">
                    <Input
                      id="address"
                      name="address"
                      value={shippingInfo.address}
                      onChange={handleShippingInfoChange}
                      required
                      className="flex-1"
                    />
                    <Button 
                      type="button" 
                      onClick={handleAddressSearch}
                      variant="secondary"
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      Find
                    </Button>
                  </div>
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
              <h3 className="font-semibold">Select Delivery Location</h3>
              <div
                ref={mapRef}
                className="h-[300px] w-full rounded-md border"
              ></div>
              {deliveryLocation.address && (
                <p className="text-sm text-muted-foreground">
                  Selected location: {deliveryLocation.address}
                </p>
              )}
            </div>

            {clientSecret && (
              <div className="space-y-4">
                <h3 className="font-semibold">Payment Information</h3>
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <CheckoutForm 
                    clientSecret={clientSecret} 
                    orderId={id as string} 
                    amount={order.total}
                    onSuccess={handlePaymentSuccess}
                  />
                </Elements>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default PaymentMultiple; 