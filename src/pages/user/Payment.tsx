// src/pages/Payment.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc, collection, updateDoc, increment } from "firebase/firestore";
import { db, auth } from "../firebase";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L, { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

const mapContainerStyle = { width: "100%", height: "300px" };
const defaultCenter: LatLngExpression = [27.7172, 85.3240];

interface Product {
  title: string;
  price: number;
  imageUrl: string;
  sellerId: string;
  stock: number;
}

const MapClickHandler = ({ setDeliveryLocation, toast }: { setDeliveryLocation: (loc: [number, number]) => void; toast: any }) => {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setDeliveryLocation([lat, lng]);
      toast({ title: "Delivery Location Set", description: `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}` });
    },
  });
  return null;
};

const Payment = () => {
  const { productId } = useParams<{ productId: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId) {
        toast({ title: "Error", description: "Product ID is missing.", variant: "destructive" });
        return;
      }
      try {
        setLoading(true);
        const productRef = doc(db, "products", productId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const productData = productSnap.data() as Product;
          if (productData.stock <= 0) {
            toast({ title: "Error", description: "Product is out of stock.", variant: "destructive" });
            navigate("/shop");
            return;
          }
          setProduct(productData);
        } else {
          toast({ title: "Error", description: "Product not found.", variant: "destructive" });
          navigate("/shop");
        }
      } catch (error) {
        toast({ title: "Error", description: "Failed to load product details.", variant: "destructive" });
        console.error("Error fetching product:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId, toast, navigate]);

  const handleCOD = async () => {
    if (!phoneNumber || !/^\d{10}$/.test(phoneNumber) || !product || !deliveryLocation || !auth.currentUser) {
      toast({
        title: "Error",
        description: !phoneNumber
          ? "Please enter your phone number."
          : !/^\d{10}$/.test(phoneNumber)
          ? "Please enter a valid 10-digit phone number."
          : !product
          ? "Product data is missing."
          : !deliveryLocation
          ? "Please select a delivery location."
          : "You must be logged in to place an order.",
        variant: "destructive",
      });
      if (!auth.currentUser) navigate("/login");
      return;
    }

    try {
      setLoading(true);

      const productRef = doc(db, "products", productId!);
      const productSnap = await getDoc(productRef);
      const currentStock = productSnap.data()?.stock || 0;
      if (currentStock < 1) {
        toast({ title: "Error", description: "Product is out of stock.", variant: "destructive" });
        return;
      }

      const orderData = {
        productId,
        userId: auth.currentUser.uid,
        sellerId: product.sellerId,
        phoneNumber,
        deliveryLocation: { lat: deliveryLocation[0], lng: deliveryLocation[1] },
        amount: product.price,
        quantity: 1,
        totalPrice: product.price,
        status: "pending",
        paymentMethod: "COD",
        createdAt: new Date().toISOString(),
      };

      const orderRef = doc(collection(db, "orders"));
      await setDoc(orderRef, orderData);

      await updateDoc(productRef, { stock: increment(-1) });

      const purchaseData = {
        productId,
        title: product.title,
        price: product.price,
        purchaseDate: new Date().toISOString(),
      };
      const purchaseRef = doc(collection(db, `users/${auth.currentUser.uid}/purchases`));
      await setDoc(purchaseRef, purchaseData);

      // Initiate chat with seller
      const chatId = [auth.currentUser.uid, product.sellerId].sort().join("_");
      const timestamp = Date.now();
      const messageData = {
        text: `Hi, I just ordered "${product.title}" via COD. Can you confirm the details?`,
        senderId: auth.currentUser.uid,
        timestamp,
      };

      const messageRef = doc(collection(db, `chats/${chatId}/messages`));
      await setDoc(messageRef, messageData);

      const chatRef = doc(db, "chats", chatId);
      await setDoc(chatRef, {
        sellerId: product.sellerId,
        buyerId: auth.currentUser.uid,
        lastMessage: messageData.text,
        timestamp,
      }, { merge: true });

      toast({
        title: "Order Confirmed",
        description: "Your Cash on Delivery order has been placed, and a chat with the seller has started!",
      });

      // Navigate to UserChat instead of payment/success
      navigate(`/chat/${chatId}`, { state: { sellerId: product.sellerId } });
    } catch (error) {
      toast({ title: "Error", description: "Failed to place order or start chat.", variant: "destructive" });
      console.error("Error in handleCOD:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="text-center py-20">Loading product details...</div>
        <Footer />
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-12 flex items-center justify-center">
        <div className="max-w-lg w-full p-6 bg-white shadow-lg rounded-lg">
          <h2 className="text-2xl font-bold text-center mb-6">Complete Your Purchase</h2>
          <div className="text-center">
            <img 
              src={product.imageUrl} 
              alt={product.title} 
              className="w-full h-48 object-cover rounded-md mb-4" 
              onError={(e) => (e.currentTarget.src = "/placeholder-image.jpg")}
            />
            <h3 className="text-xl font-semibold">{product.title}</h3>
            <p className="text-gray-600 text-lg">₨{product.price.toFixed(2)}</p>
            <p className="text-gray-500">Stock: {product.stock}</p>
          </div>
          <div className="mt-4">
            <label className="text-sm font-medium">Enter Your Phone Number</label>
            <Input
              type="tel"
              placeholder="98XXXXXXXX"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
              maxLength={10}
              className="mt-2 w-full"
              required
            />
          </div>
          <div className="mt-6">
            <h3 className="text-sm font-medium mb-2">Set Your Delivery Location</h3>
            <MapContainer 
              center={defaultCenter} 
              zoom={13} 
              style={mapContainerStyle}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapClickHandler setDeliveryLocation={setDeliveryLocation} toast={toast} />
              {deliveryLocation && (
                <Marker position={deliveryLocation}>
                  <Popup>Your Delivery Location</Popup>
                </Marker>
              )}
            </MapContainer>
          </div>
          <Button 
            className="w-full mt-6 bg-blue-600 hover:bg-blue-700" 
            onClick={handleCOD}
            disabled={loading || product.stock <= 0}
          >
            {loading ? "Processing..." : "Place Order (COD)"}
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Payment;