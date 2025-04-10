// src/pages/Cart.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, deleteDoc, updateDoc, arrayRemove, collection, getDocs } from "firebase/firestore";
import { db, auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast"; // Corrected import path
import { Loader2, Trash2 } from "lucide-react";

interface CartItem {
  productId: string;
  title: string;
  price: number;
  imageUrl: string;
  quantity: number;
}

interface Cart {
  userId: string;
  items: CartItem[];
}

const Cart = () => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
        navigate("/login");
        toast({
          title: "Error",
          description: "You must be logged in to view your cart.",
          variant: "destructive",
        });
      }
    });

    return () => unsubscribe();
  }, [navigate, toast]);

  // Fetch cart items
  useEffect(() => {
    const fetchCart = async () => {
      if (!userId) return;

      try {
        setLoading(true);
        const cartRef = doc(db, "carts", userId);
        const cartSnap = await getDoc(cartRef);

        if (cartSnap.exists()) {
          setCart(cartSnap.data() as Cart);
        } else {
          // Fallback to subcollection if top-level cart document doesn't exist
          const cartCollection = collection(db, `users/${userId}/cart`);
          const querySnapshot = await getDocs(cartCollection);
          const items = querySnapshot.docs.map((doc) => ({
            productId: doc.id,
            ...doc.data(),
          } as CartItem));
          setCart({ userId, items });
        }
      } catch (err) {
        console.error("Error fetching cart:", err);
        toast({
          title: "Error",
          description: "Failed to load cart. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCart();
  }, [userId, toast]);

  // Remove item from cart
  const handleRemoveFromCart = async (productId: string) => {
    if (!userId) return;

    try {
      const cartRef = doc(db, "carts", userId);
      const itemToRemove = cart?.items.find((item) => item.productId === productId);

      if (itemToRemove) {
        await updateDoc(cartRef, {
          items: arrayRemove(itemToRemove),
        });

        setCart((prev) => ({
          ...prev!,
          items: prev!.items.filter((item) => item.productId !== productId),
        }));

        toast({
          title: "Item Removed",
          description: "The item has been removed from your cart.",
        });
      } else {
        // Fallback for subcollection structure
        await deleteDoc(doc(db, `users/${userId}/cart`, productId));
        setCart((prev) => ({
          ...prev!,
          items: prev!.items.filter((item) => item.productId !== productId),
        }));
        toast({
          title: "Item Removed",
          description: "The item has been removed from your cart.",
        });
      }
    } catch (err) {
      console.error("Error removing item from cart:", err);
      toast({
        title: "Error",
        description: "Failed to remove item from cart. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Clear cart
  const handleClearCart = async () => {
    if (!userId) return;

    try {
      const cartRef = doc(db, "carts", userId);
      await deleteDoc(cartRef);

      setCart({ userId, items: [] });

      toast({
        title: "Cart Cleared",
        description: "All items have been removed from your cart.",
      });
    } catch (err) {
      console.error("Error clearing cart:", err);
      toast({
        title: "Error",
        description: "Failed to clear cart. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle checkout
  const handleCheckout = () => {
    navigate("/payment/multiple");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex justify-center items-center flex-1">
          <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 py-12 flex items-center justify-center">
          <div className="max-w-lg w-full p-6 bg-white shadow-lg rounded-lg text-center">
            <h2 className="text-2xl font-bold mb-4">Your Cart is Empty</h2>
            <Button
              onClick={() => navigate("/shop")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Continue Shopping
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const totalPrice = cart.items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-12 flex items-center justify-center">
        <div className="max-w-4xl w-full p-6 bg-white shadow-lg rounded-lg">
          <h2 className="text-2xl font-bold mb-6 text-center">Your Cart</h2>

          {/* Cart Items */}
          <div className="space-y-4">
            {cart.items.map((item) => (
              <div
                key={item.productId}
                className="flex items-center gap-4 p-4 border rounded-lg"
              >
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-20 h-20 object-contain rounded"
                />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="text-gray-600">
                    ₨{item.price.toFixed(2)} x {item.quantity}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => handleRemoveFromCart(item.productId)}
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>
            ))}
          </div>

          {/* Total Price */}
          <div className="mt-6 border-t pt-4">
            <h3 className="text-lg font-semibold">
              Total: ₨{totalPrice.toFixed(2)}
            </h3>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-6 justify-center">
            <Button
              onClick={handleCheckout}
              className="bg-green-600 hover:bg-green-700"
            >
              Checkout
            </Button>
            <Button
              onClick={handleClearCart}
              variant="destructive"
              className="border-gray-300"
            >
              Clear Cart
            </Button>
            <Button
              onClick={() => navigate("/shop")}
              variant="outline"
              className="border-gray-300"
            >
              Continue Shopping
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Cart;