// src/pages/user/PurchasedProducts.tsx
import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db, auth } from "../firebase"; // Adjust path to your Firebase config
import { useToast } from "@/hooks/use-toast";
import "./PurchasedProducts.css"; // Adjust path to your CSS file
import { Button } from "@/components/ui/button";
import { ShoppingBag, Truck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Define the Product interface
interface Product {
  id: string;
  title: string;
  price: number;
  imageUrl: string;
  images: string[];
  sellerId?: string;
  purchaseDate?: any;
  description?: string;
  quantity: number;
  deliveryStatus: {
    status: string;
    location: string;
    updatedAt: any;
    history: {
      status: string;
      location: string;
      timestamp: any;
      description: string;
    }[];
  };
}

// Define the context type for useOutletContext
interface Context {
  purchases: Product[];
}

const PurchasedProducts: React.FC = () => {
  const { purchases } = useOutletContext<Context>(); // Get purchases from parent context
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // If purchases are not provided via context, you could fetch them here
  React.useEffect(() => {
    if (!purchases || purchases.length === 0) {
      const fetchPurchases = async () => {
        setLoading(true);
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
              description: "You haven't made any purchases yet.",
            });
          }
        } catch (error) {
          console.error("Error fetching purchases:", error);
          toast({
            title: "Error",
            description: "Failed to load purchases. Please try again.",
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      };

      fetchPurchases();
    }
  }, [purchases, toast]);

  const handleViewDetails = (product: Product) => {
    setSelectedProduct(product);
    setIsDialogOpen(true);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  if (loading) {
    return (
      <div className="purchased-products">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="purchased-products">
      <div className="flex items-center gap-3 mb-8">
        <ShoppingBag className="w-6 h-6" />
        <h2 className="text-2xl font-bold">Your Purchased Products</h2>
      </div>

      {purchases && purchases.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
          {purchases.map((product) => (
            <div key={product.id} className="product-card">
              <div className="relative">
                <div className="product-image-container">
                  <img
                    src={product.imageUrl || product.images?.[0] || "https://placehold.co/400x300"}
                    alt={product.title}
                    className="product-image"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "https://placehold.co/400x300";
                    }}
                  />
                </div>
                <div className="status-badge">
                  {product.deliveryStatus?.status || "Processing"}
                </div>
              </div>
              <div className="product-details">
                <h3 className="product-title">{product.title}</h3>
                <p className="price">${product.price.toFixed(2)} × {product.quantity}</p>
                {product.purchaseDate && (
                  <p className="purchase-date">
                    Purchased on: {formatDate(product.purchaseDate)}
                  </p>
                )}
                <button 
                  className="track-button"
                  onClick={() => handleViewDetails(product)}
                >
                  <Truck className="w-4 h-4" />
                  Track Order
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <ShoppingBag className="w-12 h-12 text-gray-400 mb-4" />
          <p className="text-xl font-medium text-gray-600">No purchased products found</p>
          <p className="text-gray-500 mt-2">
            Your purchased items will appear here once you make a purchase.
          </p>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        {selectedProduct && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Order Tracking</DialogTitle>
              <DialogDescription>
                Track your order status and delivery progress
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{selectedProduct.title}</h3>
                  <span className="text-sm text-gray-500">
                    Order ID: {selectedProduct.id.slice(0, 8)}
                  </span>
                </div>
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Current Status</h4>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-600 font-medium">
                      {selectedProduct.deliveryStatus?.status}
                    </span>
                    <span className="text-gray-500">
                      {formatDate(selectedProduct.deliveryStatus?.updatedAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Location: {selectedProduct.deliveryStatus?.location}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Delivery History</h4>
                  <div className="space-y-3">
                    {selectedProduct.deliveryStatus?.history.map((event, index) => (
                      <div key={index} className="border-l-2 border-gray-200 pl-4 pb-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{event.status}</span>
                          <span className="text-gray-500">
                            {formatDate(event.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                        <p className="text-sm text-gray-500">Location: {event.location}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default PurchasedProducts;