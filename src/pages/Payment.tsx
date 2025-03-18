import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";

const mapContainerStyle = { width: "100%", height: "300px" };
const center = { lat: 27.7172, lng: 85.3240 }; // Default to Kathmandu, Nepal

const Payment = () => {
  const { productId } = useParams<{ productId: string }>();
  const [product, setProduct] = useState<{ title: string; price: number; imageUrl: string } | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Esewa");
  const { toast } = useToast();

  // Load Google Maps
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: "YOUR_GOOGLE_MAPS_API_KEY", // 🔥 Replace with your API Key
  });

  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId) return;
      const productRef = doc(db, "products", productId);
      const productSnap = await getDoc(productRef);
      if (productSnap.exists()) {
        setProduct(productSnap.data() as { title: string; price: number; imageUrl: string });
      } else {
        toast({ title: "Error", description: "Product not found." });
      }
    };
    fetchProduct();
  }, [productId, toast]);

  const handlePayment = () => {
    if (!phoneNumber) {
      toast({ title: "Error", description: "Please enter your phone number.", variant: "destructive" });
      return;
    }
    toast({ title: "Payment Initiated", description: `Processing payment via ${paymentMethod}...` });
  };

  if (!product) return <div className="text-center py-20">Loading product details...</div>;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-12 flex items-center justify-center">
        <div className="max-w-lg w-full p-6 bg-white shadow-lg rounded-lg">
          <h2 className="text-2xl font-bold text-center mb-6">Complete Your Purchase</h2>

          {/* Product Info */}
          <div className="text-center">
            <img src={product.imageUrl} alt={product.title} className="w-full h-48 object-cover rounded-md mb-4" />
            <h3 className="text-xl font-semibold">{product.title}</h3>
            <p className="text-gray-600 text-lg">${product.price}</p>
          </div>

          {/* Phone Number Input */}
          <div className="mt-4">
            <label className="text-sm font-medium">Enter Your Phone Number</label>
            <Input
              type="tel"
              placeholder="98XXXXXXXX"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="mt-2 w-full"
              required
            />
          </div>

          {/* Payment Method Selection */}
          <div className="mt-6">
            <h3 className="text-sm font-medium mb-2">Choose Payment Method</h3>
            <div className="grid grid-cols-2 gap-3">
              {["Esewa", "Khalti", "Cash on Delivery", "Bank Transfer"].map((method) => (
                <Button
                  key={method}
                  variant={paymentMethod === method ? "default" : "outline"}
                  className="w-full"
                  onClick={() => setPaymentMethod(method)}
                >
                  {method}
                </Button>
              ))}
            </div>
          </div>

          {/* Confirm Payment Button */}
          <Button className="w-full mt-6 bg-green-600 hover:bg-green-700" onClick={handlePayment}>
            Pay with {paymentMethod}
          </Button>

          {/* Google Maps (Only if loaded) */}
          <div className="mt-6">
            <h3 className="text-sm font-medium mb-2">Find Nearby Payment Locations</h3>
            {isLoaded ? (
              <GoogleMap mapContainerStyle={mapContainerStyle} center={center} zoom={13}>
                {/* Example Markers for Payment Locations */}
                <Marker position={{ lat: 27.7172, lng: 85.3240 }} title="Esewa Office" />
                <Marker position={{ lat: 27.7086, lng: 85.3201 }} title="Khalti Office" />
                <Marker position={{ lat: 27.7121, lng: 85.3281 }} title="Bank Branch" />
              </GoogleMap>
            ) : (
              <p>Loading map...</p>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Payment;
