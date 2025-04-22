import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { LatLng } from 'leaflet';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { useNavigate, useParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import L from 'leaflet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

// Initialize Stripe (replace with your publishable key)
const stripePromise = loadStripe('pk_test_51RGXzVPewya4IHYyhSnVWU000x3SxIRlCMbtywY8rYsBXrxv81SpXDEvlq1kIVx5QZiJYfa9ocHMvtYBLsP883wv00ovh93c0C'); // Replace with your Stripe test publishable key

// Fix Leaflet marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface CartItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  category?: string;
  size?: string;
  seller?: string;
}

interface PaymentProps {}

const Payment: React.FC<PaymentProps> = () => {
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'Stripe'>('COD');
  const [deliveryLocation, setDeliveryLocation] = useState<LatLng | null>(null);
  const [address, setAddress] = useState<string>('');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const navigate = useNavigate();
  const stripe = useStripe();
  const elements = useElements();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  // Fetch order details from Firestore
  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) {
        setError('Order ID is missing');
        return;
      }
      try {
        const orderDoc = await getDoc(doc(db, 'orders', id));
        if (orderDoc.exists()) {
          const orderData = orderDoc.data();
          setCartItems(orderData.cartItems || []);
          setTotal(Number(orderData.total) || 0);
        } else {
          setError('Order not found');
        }
      } catch (err) {
        setError('Failed to load order details');
        console.error('Error fetching order:', err);
        toast({
          title: 'Error',
          description: 'Failed to load order details.',
          variant: 'destructive',
        });
      }
    };
    fetchOrder();
  }, [id, toast]);

  // Default location (Kathmandu, Nepal)
  const defaultPosition = new LatLng(27.7172, 85.3240);

  // Component to handle map clicks
  const LocationMarker: React.FC = () => {
    useMapEvents({
      click(e) {
        setDeliveryLocation(e.latlng);
        setAddress(`Lat: ${e.latlng.lat}, Lng: ${e.latlng.lng}`);
      },
    });

    return deliveryLocation ? (
      <Marker position={deliveryLocation}>
        <Popup>Selected delivery location</Popup>
      </Marker>
    ) : null;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryLocation || !address) {
      toast({
        title: 'Error',
        description: 'Please select a delivery location and enter an address.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const user = auth.currentUser;
      if (!user) {
        setError('Please log in to place an order.');
        setLoading(false);
        navigate('/login');
        return;
      }
      const idToken = await user.getIdToken();

      const orderUpdate = {
        cartItems,
        total,
        paymentMethod,
        deliveryLocation: {
          lat: deliveryLocation.lat,
          lng: deliveryLocation.lng,
        },
        address,
        status: paymentMethod === 'COD' ? 'Pending' : 'Awaiting Payment',
        updatedAt: new Date().toISOString(),
        userId: user.uid,
      };

      // Update the Firestore order
      await setDoc(doc(db, 'orders', id!), orderUpdate, { merge: true });

      if (paymentMethod === 'COD') {
        toast({
          title: 'Success',
          description: 'Order placed successfully with Cash on Delivery!',
        });
        navigate('/payment/success');
        setLoading(false);
      } else {
        // Create Stripe PaymentIntent
        const response = await fetch('http://localhost:5000/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            amount: total, // Amount in NPR (backend converts to paisa)
            orderId: id,
            userId: user.uid,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create payment intent');
        }

        const { clientSecret } = await response.json();
        setClientSecret(clientSecret);

        if (!stripe || !elements) {
          throw new Error('Stripe or Elements not initialized');
        }

        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
          throw new Error('Card Element not found');
        }

        const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: user.displayName || 'Anonymous',
            },
          },
        });

        if (stripeError) {
          setError(`Payment failed: ${stripeError.message}`);
          await setDoc(doc(db, 'orders', id!), {
            status: 'Payment Failed',
            error: stripeError.message,
          }, { merge: true });
          toast({
            title: 'Payment Failed',
            description: stripeError.message,
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        if (paymentIntent.status === 'succeeded') {
          await setDoc(doc(db, 'orders', id!), {
            status: 'Payment Succeeded',
            paymentIntentId: paymentIntent.id,
          }, { merge: true });
          toast({
            title: 'Success',
            description: 'Payment successful!',
          });
          navigate('/payment/success');
        }
      }
    } catch (err) {
      setError('Failed to process order. Please try again.');
      console.error('Error processing order:', err);
      toast({
        title: 'Error',
        description: (err as Error).message || 'Failed to process order. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
        <p className="text-red-600 text-lg">{error}</p>
        <Button onClick={() => navigate('/shop')} className="mt-4">
          Back to Shop
        </Button>
      </div>
    );
  }

  if (!cartItems.length) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
        <p className="text-gray-600 text-lg">Loading order...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-6">Checkout</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-4">Delivery Location</h3>
            <div className="h-80 rounded-lg overflow-hidden">
              <MapContainer
                center={defaultPosition}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <LocationMarker />
              </MapContainer>
            </div>
            <div className="mt-4">
              <Label htmlFor="address">Detailed Address</Label>
              <Input
                id="address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter detailed address"
                className="mt-2"
                required
              />
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-4">Payment Method</h3>
            <div className="flex flex-col gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="COD"
                  checked={paymentMethod === 'COD'}
                  onChange={() => setPaymentMethod('COD')}
                  className="h-4 w-4"
                />
                Cash on Delivery (COD)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="Stripe"
                  checked={paymentMethod === 'Stripe'}
                  onChange={() => setPaymentMethod('Stripe')}
                  className="h-4 w-4"
                />
                Credit/Debit Card (Stripe)
              </label>
            </div>
          </div>

          {paymentMethod === 'Stripe' && (
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-4">Card Details</h3>
              <div className="p-4 border rounded-lg">
                <CardElement options={{ style: { base: { fontSize: '16px' } } }} />
              </div>
              {error && <p className="text-red-600 mt-2">{error}</p>}
            </div>
          )}

          <div className="mb-6">
            <h3 className="text-xl font-semibold mb-4">Order Summary</h3>
            <ul className="mb-4">
              {cartItems.map((item) => (
                <li key={item.id} className="flex justify-between py-2">
                  <span>{item.title} x {item.quantity}</span>
                  <span>NPR {(item.price * item.quantity).toFixed(2)}</span>
                </li>
              ))}
            </ul>
            <p className="text-lg font-semibold">Total: NPR {total.toFixed(2)}</p>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-700"
          >
            {loading ? 'Processing...' : 'Place Order'}
          </Button>
        </form>
      </div>
    </div>
  );
};

// Export wrapped with Elements for Stripe
export default (props: PaymentProps) => (
  <Elements stripe={stripePromise}>
    <Payment {...props} />
  </Elements>
);