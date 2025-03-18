import { useEffect, useState } from "react";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import { db, auth } from "./firebase";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const Cart = () => {
  const [cartItems, setCartItems] = useState<any[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCartItems = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const cartCollection = collection(db, `users/${user.uid}/cart`);
      const querySnapshot = await getDocs(cartCollection);
      setCartItems(querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    };

    fetchCartItems();
  }, []);

  const removeFromCart = async (id: string) => {
    const user = auth.currentUser;
    if (!user) return;

    await deleteDoc(doc(db, `users/${user.uid}/cart`, id));
    setCartItems(cartItems.filter((item) => item.id !== id));
    toast({ title: "Removed from cart", variant: "destructive" });
  };

  const handleCheckout = () => {
    navigate("/payment");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-12 px-6">
        <h2 className="text-3xl font-bold text-center mb-6">Your Cart</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 px-4">
          {cartItems.length > 0 ? (
            cartItems.map((item) => (
              <div key={item.id} className="bg-white p-4 rounded-lg shadow-md">
                <img src={item.imageUrl} alt={item.title} className="w-full h-48 object-cover rounded-md" />
                <h3 className="text-lg font-bold mt-2">{item.title}</h3>
                <p className="text-gray-600">${item.price}</p>
                <Button variant="destructive" className="mt-3" onClick={() => removeFromCart(item.id)}>
                  Remove
                </Button>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500">Your cart is empty.</p>
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="text-center mt-8">
            <Button onClick={handleCheckout} className="bg-blue-600 hover:bg-blue-700 px-6 py-2">
              Proceed to Checkout
            </Button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Cart;
