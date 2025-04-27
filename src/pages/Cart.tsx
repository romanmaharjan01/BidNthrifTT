// src/pages/Cart.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, deleteDoc, updateDoc, arrayRemove, collection, getDocs, addDoc, Timestamp } from "firebase/firestore";
import { db, auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast"; // Corrected import path
import { Loader2, Trash2, ShoppingCart } from "lucide-react";

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
  const [isProcessing, setIsProcessing] = useState(false);
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

  // Update quantity
  const handleUpdateQuantity = async (productId: string, newQuantity: number) => {
    if (!userId || !cart) return;
    
    if (newQuantity < 1) {
      handleRemoveFromCart(productId);
      return;
    }
    
    try {
      const cartRef = doc(db, "carts", userId);
      const cartItems = [...cart.items];
      const itemIndex = cartItems.findIndex(item => item.productId === productId);
      
      if (itemIndex !== -1) {
        cartItems[itemIndex].quantity = newQuantity;
        
        await updateDoc(cartRef, {
          items: cartItems
        });
        
        setCart({ ...cart, items: cartItems });
      }
    } catch (err) {
      console.error("Error updating quantity:", err);
      toast({
        title: "Error",
        description: "Failed to update quantity. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Clear cart
  const handleClearCart = async () => {
    if (!userId) return;

    try {
      const cartRef = doc(db, "carts", userId);
      await updateDoc(cartRef, { items: [] });

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
  const handleCheckout = async () => {
    if (!userId || !cart || cart.items.length === 0) return;
    
    try {
      setIsProcessing(true);
      
      // Calculate total price
      const totalPrice = cart.items.reduce(
        (total, item) => total + item.price * item.quantity,
        0
      );
      
      // Create order in Firestore
      const orderData = {
        userId,
        items: cart.items.map(item => ({
          productId: item.productId,
          title: item.title,
          price: item.price,
          quantity: item.quantity,
          imageUrl: item.imageUrl
        })),
        total: totalPrice,
        status: 'pending',
        createdAt: Timestamp.now()
      };
      
      const orderRef = await addDoc(collection(db, 'orders'), orderData);
      
      // Clear cart after order creation
      const cartRef = doc(db, "carts", userId);
      await updateDoc(cartRef, { items: [] });
      
      // Navigate to payment page with order ID
      navigate(`/payment/${orderRef.id}`);
      
    } catch (error) {
      console.error("Error processing checkout:", error);
      toast({
        title: "Checkout Failed",
        description: "An error occurred during checkout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
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
            <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-bold mb-4">Your Cart is Empty</h2>
            <p className="text-gray-500 mb-6">
              Looks like you haven't added any items to your cart yet.
            </p>
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
      <main className="flex-1 py-12 container mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8 text-center">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            {cart.items.map((item) => (
              <div
                key={item.productId}
                className="flex items-center gap-4 p-4 border rounded-lg mb-4 bg-white shadow-sm"
              >
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-20 h-20 object-contain rounded"
                />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="text-gray-600">
                    ₨{item.price.toFixed(2)}
                  </p>
                  <div className="flex items-center mt-2">
                    <button 
                      className="px-2 py-1 border rounded-l-md bg-gray-100"
                      onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)}
                    >
                      -
                    </button>
                    <span className="px-4 py-1 border-t border-b">
                      {item.quantity}
                    </span>
                    <button 
                      className="px-2 py-1 border rounded-r-md bg-gray-100"
                      onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">₨{(item.price * item.quantity).toFixed(2)}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveFromCart(item.productId)}
                    className="text-red-500 hover:text-red-700 mt-2"
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-bold mb-4">Order Summary</h2>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>₨{totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Shipping</span>
                  <span>Free</span>
                </div>
                <div className="border-t pt-3 flex justify-between font-bold">
                  <span>Total</span>
                  <span>₨{totalPrice.toFixed(2)}</span>
                </div>
              </div>

              <Button
                onClick={handleCheckout}
                className="w-full bg-green-600 hover:bg-green-700 mb-3"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Checkout'
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={handleClearCart}
                className="w-full"
              >
                Clear Cart
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Cart;