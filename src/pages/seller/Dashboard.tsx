import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "../firebase"; // Adjust path to your Firebase config
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: string;
  title: string;
  category: string;
  price: number;
  stock: number;
  imageUrl?: string;
}

interface OrderItem {
  id: string;
  productId: string;
  sellerId: string;
  buyerId: string;
  title: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  purchaseDate?: any;
  category?: string;
  source?: string;
  deliveryStatus?: {
    status: string;
    location: string;
    updatedAt: any;
    history: {
      status: string;
      location: string;
      timestamp: any;
      description: string;
    }[];
  } | string;
  product?: Product;
}

interface Stats {
  totalListings: number;
  totalSales: number;
  pendingShipments: number;
  totalOrders: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats>({ totalListings: 0, totalSales: 0, pendingShipments: 0, totalOrders: 0 });
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const { toast } = useToast();

  const deliveryStatusOptions = ["Processing", "Shipped", "Out for Delivery", "Delivered"];

  const fetchSellerData = async (sellerId: string) => {
    try {
      setIsLoadingData(true);

      // Fetch regular orders
      const ordersQuery = query(collection(db, "orders"), where("sellerId", "==", sellerId));
      const ordersSnapshot = await getDocs(ordersQuery);
      const ordersData = await Promise.all(
        ordersSnapshot.docs.map(async (orderDoc) => {
          const orderData = orderDoc.data();
          // Explicitly create order object with all required properties
          const order = { 
            id: orderDoc.id,
            productId: orderData.productId || "",
            sellerId: orderData.sellerId || "",
            buyerId: orderData.buyerId || "",
            title: orderData.title || "",
            price: orderData.price || 0,
            quantity: orderData.quantity || 1,
            imageUrl: orderData.imageUrl,
            purchaseDate: orderData.purchaseDate,
            category: orderData.category,
            deliveryStatus: orderData.deliveryStatus,
            source: "orders" 
          } as OrderItem;
          
          // Fetch product details for each order
          if (order.productId) {
            const productRef = doc(db, "products", order.productId);
            const productSnap = await getDoc(productRef);
            if (productSnap.exists()) {
              order.product = productSnap.data() as Product;
              order.category = order.product.category;
              order.imageUrl = order.product.imageUrl;
            }
          }
          return order;
        })
      );

      // Fetch purchased products from the purchases collection
      const purchasesQuery = query(collection(db, "purchases"), where("sellerId", "==", sellerId));
      const purchasesSnapshot = await getDocs(purchasesQuery);
      const purchasesData = purchasesSnapshot.docs.map(doc => {
        const data = doc.data();
        // Cast to OrderItem and ensure all required properties are present
        return {
          id: doc.id,
          productId: data.productId || "",
          sellerId: data.sellerId || "",
          buyerId: data.buyerId || "",
          title: data.title || "",
          price: data.price || 0,
          quantity: data.quantity || 1,
          imageUrl: data.imageUrl,
          purchaseDate: data.purchaseDate,
          category: data.category,
          deliveryStatus: data.deliveryStatus,
          source: "purchases"
        } as OrderItem;
      });

      // Combine orders and purchases
      const allOrders = [...ordersData, ...purchasesData];

      // Calculate stats
      const totalSales = allOrders.reduce((sum, order) => {
        const price = typeof order.price === 'number' ? order.price : 0;
        const quantity = typeof order.quantity === 'number' ? order.quantity : 1;
        return sum + (price * quantity);
      }, 0);
      
      const pendingShipments = allOrders.filter((order) => {
        return !isDelivered(order);
      }).length;

      // Fetch total listings
      const productsQuery = query(collection(db, "products"), where("sellerId", "==", sellerId));
      const productsSnapshot = await getDocs(productsQuery);
      const totalListings = productsSnapshot.size;

      setOrders(allOrders);
      setStats({ 
        totalListings, 
        totalSales, 
        pendingShipments,
        totalOrders: allOrders.length
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to load seller data.", variant: "destructive" });
      console.error("Error fetching seller data:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchSellerData(user.uid);
      }
    });

    return () => unsubscribe();
  }, []);

  const formatCurrency = (amount: number) => {
    return `Npr ${amount.toFixed(2)}`;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const isDelivered = (order: OrderItem): boolean => {
    if (order.source === "purchases") {
      return order.deliveryStatus && typeof order.deliveryStatus === 'object' && order.deliveryStatus.status === "Delivered";
    } else {
      return order.deliveryStatus === "Delivered";
    }
  };

  // Updated isPending function to check if an order needs attention
  const isPending = (order: OrderItem): boolean => {
    const status = getOrderStatus(order);
    // Consider only Processing orders as pending (add more statuses if needed)
    return status === "Processing";
  };

  const handleStatusChange = async (orderId: string, newStatus: string, source: string = "purchases") => {
    try {
      if (source === "purchases") {
        // Update purchase in the purchases collection
        const purchaseRef = doc(db, "purchases", orderId);
        const purchaseDoc = await getDoc(purchaseRef);
        
        if (purchaseDoc.exists()) {
          const purchaseData = purchaseDoc.data();
          const currentTime = new Date();
          
          // Check if deliveryStatus exists
          if (!purchaseData.deliveryStatus) {
            // Create a new deliveryStatus if it doesn't exist
            await updateDoc(purchaseRef, {
              "deliveryStatus": {
                status: newStatus,
                location: "Seller's Facility",
                updatedAt: currentTime,
                history: [
                  {
                    status: newStatus,
                    location: "Seller's Facility",
                    timestamp: currentTime,
                    description: `Status updated to ${newStatus}`
                  }
                ]
              }
            });
          } else {
            // Update the existing deliveryStatus
            await updateDoc(purchaseRef, {
              "deliveryStatus.status": newStatus,
              "deliveryStatus.updatedAt": currentTime,
              "deliveryStatus.history": [
                ...(purchaseData.deliveryStatus.history || []),
                {
                  status: newStatus,
                  location: "Seller's Facility",
                  timestamp: currentTime,
                  description: `Status updated to ${newStatus}`
                }
              ]
            });
          }
        }
      } else {
        // Update order in the orders collection
        await updateDoc(doc(db, "orders", orderId), {
          deliveryStatus: newStatus,
        });
      }

      // Update local state with the new order data
      const updatedOrders = orders.map((order) => {
        if (order.id === orderId) {
          if (source === "purchases" && order.source === "purchases") {
            // Handle purchase updates
            const currentDeliveryStatus = typeof order.deliveryStatus === 'object' ? order.deliveryStatus : undefined;
            
            if (!currentDeliveryStatus) {
              return {
                ...order,
                deliveryStatus: {
                  status: newStatus,
                  location: "Seller's Facility",
                  updatedAt: new Date(),
                  history: [
                    {
                      status: newStatus,
                      location: "Seller's Facility",
                      timestamp: new Date(),
                      description: `Status updated to ${newStatus}`
                    }
                  ]
                }
              };
            } else {
              // Update existing deliveryStatus
              return {
                ...order,
                deliveryStatus: {
                  ...currentDeliveryStatus,
                  status: newStatus,
                  updatedAt: new Date(),
                  history: [
                    ...(currentDeliveryStatus.history || []),
                    {
                      status: newStatus,
                      location: "Seller's Facility",
                      timestamp: new Date(),
                      description: `Status updated to ${newStatus}`
                    }
                  ]
                }
              };
            }
          } else if (source === "orders" && order.source === "orders") {
            // Handle orders updates
            return {
              ...order,
              deliveryStatus: newStatus
            };
          }
        }
        return order;
      });
      
      // Apply the updated orders to state
      setOrders(updatedOrders);
      
      // Recalculate pending shipments based on the updated orders
      const pendingShipments = updatedOrders.filter(order => isPending(order)).length;
      
      // Update stats with the correct pending count
      setStats(prev => ({
        ...prev,
        pendingShipments
      }));

      toast({
        title: "Status Updated",
        description: `Order status changed to ${newStatus}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update order status.",
        variant: "destructive",
      });
      console.error("Error updating order status:", error);
    }
  };

  // Get delivery status for display
  const getOrderStatus = (order: OrderItem): string => {
    if (order.source === "purchases") {
      return typeof order.deliveryStatus === 'object' ? order.deliveryStatus?.status || "Processing" : "Processing";
    } else {
      return typeof order.deliveryStatus === 'string' ? order.deliveryStatus : "Processing";
    }
  };

  // Filter orders for display
  const displayOrders = showPendingOnly 
    ? orders.filter(order => isPending(order))
    : orders;

  if (isLoadingData) {
    return <div className="loading-spinner">Loading seller data...</div>;
  }

  return (
    <div className="dashboard-container">
      <h1 className="text-3xl font-bold mb-6">Seller Dashboard</h1>

      {/* Stats Cards */}
      <div className="flex flex-wrap gap-4 mb-6">
        {[
          { title: "Total Listings", value: stats.totalListings },
          { 
            title: "Pending Shipments", 
            value: stats.pendingShipments, 
            action: true,
            onClick: () => setShowPendingOnly(!showPendingOnly)
          },
          { title: "Total Sales", value: formatCurrency(stats.totalSales) },
          { title: "Total Orders", value: stats.totalOrders },
        ].map((stat, index) => (
          <div 
            className={`card flex-1 min-w-[200px] ${stat.action ? 'cursor-pointer hover:bg-gray-50' : ''}`} 
            key={index}
            onClick={stat.action ? stat.onClick : undefined}
          >
            <div className="card-header">
              <div className="card-title">{stat.title}</div>
            </div>
            <div className="card-content">
              <p className="text-2xl font-bold">{stat.value}</p>
              {stat.action && (
                <p className="text-sm text-gray-500 mt-1">
                  {showPendingOnly ? "Click to show all orders" : "Click to filter"}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <p>Welcome to your seller dashboard! Check your stats above.</p>

      {/* Orders Table */}
      <div className="mt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">
            {showPendingOnly ? "Pending Shipments" : "Your Orders"}
          </h2>
          <Button
            onClick={() => setShowPendingOnly(!showPendingOnly)}
            variant={showPendingOnly ? "outline" : "default"}
          >
            {showPendingOnly ? "Show All Orders" : "Show Pending Only"}
          </Button>
        </div>
        
        {displayOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-200 px-4 py-2 text-left">Product</th>
                  <th className="border border-gray-200 px-4 py-2 text-left">Title</th>
                  <th className="border border-gray-200 px-4 py-2 text-left">Category</th>
                  <th className="border border-gray-200 px-4 py-2 text-left">Price</th>
                  <th className="border border-gray-200 px-4 py-2 text-left">Quantity</th>
                  <th className="border border-gray-200 px-4 py-2 text-left">Date</th>
                  <th className="border border-gray-200 px-4 py-2 text-left">Status</th>
                  <th className="border border-gray-200 px-4 py-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {displayOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="border border-gray-200 px-4 py-2">
                      <img 
                        src={order.imageUrl || order.product?.imageUrl || "https://placehold.co/100x100"} 
                        alt={order.title || order.product?.title || "Product"} 
                        className="w-16 h-16 object-cover rounded"
                      />
                    </td>
                    <td className="border border-gray-200 px-4 py-2">
                      {order.title || order.product?.title || "Unknown Product"}
                    </td>
                    <td className="border border-gray-200 px-4 py-2">
                      {order.category || order.product?.category || "N/A"}
                    </td>
                    <td className="border border-gray-200 px-4 py-2">
                      {formatCurrency(order.price || 0)}
                    </td>
                    <td className="border border-gray-200 px-4 py-2">
                      {order.quantity || 1}
                    </td>
                    <td className="border border-gray-200 px-4 py-2">
                      {formatDate(order.purchaseDate)}
                    </td>
                    <td className="border border-gray-200 px-4 py-2">
                      <span className={`badge ${
                        getOrderStatus(order) === "Delivered" 
                          ? "badge-success" 
                          : getOrderStatus(order) === "Processing" 
                            ? "badge-warning" 
                            : "badge-info"
                      }`}>
                        {getOrderStatus(order)}
                      </span>
                    </td>
                    <td className="border border-gray-200 px-4 py-2">
                      <select
                        value={getOrderStatus(order)}
                        onChange={(e) =>
                          handleStatusChange(
                            order.id,
                            e.target.value,
                            order.source
                          )
                        }
                        className="form-select"
                      >
                        {deliveryStatusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>
            {showPendingOnly
              ? "No pending shipments found. All your orders are delivered!"
              : "No orders found. Once you receive orders, they will appear here."}
          </p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
