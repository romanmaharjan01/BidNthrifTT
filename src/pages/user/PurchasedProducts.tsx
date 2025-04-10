// src/pages/user/PurchasedProducts.tsx
import React from "react";
import { useOutletContext } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db, auth } from "../firebase"; // Adjust path to your Firebase config
import { useToast } from "@/hooks/use-toast";
import "./PurchasedProducts.css"; // Adjust path to your CSS file
import { Button } from "@/components/ui/button";

// Define the Product interface
interface Product {
  id: string;
  title: string;
  price: number;
  imageUrl: string;
  sellerId?: string; // Optional seller ID
  purchaseDate?: string; // Optional purchase date
}

// Define the context type for useOutletContext
interface Context {
  purchases: Product[];
}

const PurchasedProducts: React.FC = () => {
  const { purchases } = useOutletContext<Context>(); // Get purchases from parent context
  const { toast } = useToast();

  // If purchases are not provided via context, you could fetch them here
  React.useEffect(() => {
    if (!purchases || purchases.length === 0) {
      const fetchPurchases = async () => {
        try {
          const user = auth.currentUser;
          if (!user) {
            toast({
              title: "Error",
              description: "You must be logged in to view purchases.",
              variant: "destructive",
            });
            return;
          }

          const purchasesQuery = query(
            collection(db, "purchases"),
            where("buyerId", "==", user.uid)
          );
          const querySnapshot = await getDocs(purchasesQuery);
          const purchasedItems = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Product[];

          // Assuming purchases are updated in the parent context, otherwise set local state
          if (purchasedItems.length === 0) {
            toast({
              title: "No Purchases",
              description: "You haven’t made any purchases yet.",
            });
          }
        } catch (error) {
          console.error("Error fetching purchases:", error);
          toast({
            title: "Error",
            description: "Failed to load purchases. Please try again.",
            variant: "destructive",
          });
        }
      };

      fetchPurchases();
    }
  }, [purchases, toast]);

  return (
    <div className="purchased-products">
      <h2 className="text-2xl font-bold mb-6">Your Purchased Products</h2>
      {purchases && purchases.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {purchases.map((product) => (
            <div key={product.id} className="product-card bg-white p-4 rounded-lg shadow-md">
              <img
                src={product.imageUrl}
                alt={product.title}
                className="w-full h-48 object-cover rounded-md mb-4"
              />
              <h3 className="text-lg font-semibold">{product.title}</h3>
              <p className="text-gray-600">Price: ${product.price.toFixed(2)}</p>
              {product.purchaseDate && (
                <p className="text-gray-500 text-sm">
                  Purchased on: {new Date(product.purchaseDate).toLocaleDateString()}
                </p>
              )}
              {product.sellerId && (
                <p className="text-gray-500 text-sm">Seller ID: {product.sellerId}</p>
              )}
              <Button className="mt-4 w-full">View Details</Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500">No purchased products found.</p>
      )}
    </div>
  );
};

export default PurchasedProducts;