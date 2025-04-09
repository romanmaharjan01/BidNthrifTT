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
}

interface Order {
  id: string;
  productId: string;
  product?: Product;
  consumerId: string;
  consumerLocation?: string;
  deliveryLocation: { lat: number; lng: number };
  quantity: number;
  totalPrice: number;
  deliveryStatus: "Pending" | "Sent for Delivery" | "Delivered";
  sellerId: string;
}

interface Stats {
  totalListings: number;
  totalSales: number;
  pendingShipments: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats>({ totalListings: 0, totalSales: 0, pendingShipments: 0 });
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const { toast } = useToast();

  const deliveryStatusOptions: Order["deliveryStatus"][] = ["Pending", "Sent for Delivery", "Delivered"];

  const fetchSellerData = async (sellerId: string) => {
    try {
      setIsLoadingData(true);

      // Fetch seller's orders
      const ordersQuery = query(collection(db, "orders"), where("sellerId", "==", sellerId));
      const ordersSnapshot = await getDocs(ordersQuery);
      const ordersData = await Promise.all(
        ordersSnapshot.docs.map(async (orderDoc) => {
          const order = { id: orderDoc.id, ...orderDoc.data() } as Order;
          // Fetch product details for each order
          const productRef = doc(db, "products", order.productId);
          const productSnap = await getDoc(productRef);
          if (productSnap.exists()) {
            order.product = productSnap.data() as Product;
          }
          return order;
        })
      );

      // Calculate stats with fallback for missing totalPrice
      const totalSales = ordersData.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
      const pendingShipments = ordersData.filter((order) => order.deliveryStatus === "Pending").length;

      // Fetch total listings
      const productsQuery = query(collection(db, "products"), where("sellerId", "==", sellerId));
      const productsSnapshot = await getDocs(productsQuery);
      const totalListings = productsSnapshot.size;

      setOrders(ordersData);
      setStats({ totalListings, totalSales, pendingShipments });
    } catch (error) {
      toast({ title: "Error", description: "Failed to load seller data.", variant: "destructive" });
      console.error("Error fetching seller data:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (auth.currentUser) {
      fetchSellerData(auth.currentUser.uid);
    } else {
      toast({ title: "Error", description: "You must be logged in to view the dashboard.", variant: "destructive" });
      setIsLoadingData(false);
    }
  }, [toast]);

  const handleUpdateDeliveryStatus = async (order: Order, newStatus: Order["deliveryStatus"]) => {
    try {
      const orderRef = doc(db, "orders", order.id);
      await updateDoc(orderRef, { deliveryStatus: newStatus });
      toast({
        title: "Success",
        description: `Delivery status updated to "${newStatus}"!`,
      });
      if (auth.currentUser) {
        fetchSellerData(auth.currentUser.uid);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update delivery status",
        variant: "destructive",
      });
    }
  };

  const getNextStatus = (currentStatus: Order["deliveryStatus"]): Order["deliveryStatus"] => {
    const currentIndex = deliveryStatusOptions.indexOf(currentStatus);
    const nextIndex = (currentIndex + 1) % deliveryStatusOptions.length;
    return deliveryStatusOptions[nextIndex];
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || isNaN(amount)) return "₨0.00";
    return `₨${amount.toFixed(2)}`;
  };

  if (isLoadingData) {
    return <div className="p-4">Loading dashboard...</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-6">Seller Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          { title: "Total Listings", value: stats.totalListings },
          { title: "Pending Shipments", value: stats.pendingShipments },
          { title: "Total Sales", value: formatCurrency(stats.totalSales) },
        ].map((stat, index) => (
          <Card key={index}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <p>Welcome to your seller dashboard! Check your stats above.</p>

      {/* Orders Table */}
      <div className="mt-6">
        <h2 className="text-2xl font-semibold mb-4">Your Orders</h2>
        {orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-200 px-4 py-2 text-left">Product Title</th>
                  <th className="border border-gray-200 px-4 py-2 text-left">Category</th>
                  <th className="border border-gray-200 px-4 py-2 text-left">Total Price</th>
                  <th className="border border-gray-200 px-4 py-2 text-left">Quantity</th>
                  <th className="border border-gray-200 px-4 py-2 text-left">Consumer Location</th>
                  <th className="border border-gray-200 px-4 py-2 text-left">Delivery Status</th>
                  <th className="border border-gray-200 px-4 py-2 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="border border-gray-200 px-4 py-2">
                      {order.product?.title || "N/A"}
                    </td>
                    <td className="border border-gray-200 px-4 py-2">
                      {order.product?.category || "N/A"}
                    </td>
                    <td className="border border-gray-200 px-4 py-2">
                      {formatCurrency(order.totalPrice)}
                    </td>
                    <td className="border border-gray-200 px-4 py-2">{order.quantity}</td>
                    <td className="border border-gray-200 px-4 py-2">
                      {order.consumerLocation || `Lat: ${order.deliveryLocation.lat}, Lng: ${order.deliveryLocation.lng}`}
                    </td>
                    <td className="border border-gray-200 px-4 py-2">
                      {order.deliveryStatus === "Delivered" ? (
                        <span className="text-green-600 font-semibold">Delivered</span>
                      ) : order.deliveryStatus === "Sent for Delivery" ? (
                        <span className="text-blue-600 font-semibold">Sent for Delivery</span>
                      ) : (
                        <span className="text-red-600 font-semibold">Pending</span>
                      )}
                    </td>
                    <td className="border border-gray-200 px-4 py-2">
                      <Button
                        onClick={() =>
                          handleUpdateDeliveryStatus(order, getNextStatus(order.deliveryStatus))
                        }
                        className={`${
                          order.deliveryStatus === "Delivered"
                            ? "bg-red-600 hover:bg-red-700"
                            : order.deliveryStatus === "Sent for Delivery"
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-blue-600 hover:bg-blue-700"
                        } text-white`}
                      >
                        {order.deliveryStatus === "Delivered"
                          ? "Mark as Pending"
                          : order.deliveryStatus === "Sent for Delivery"
                          ? "Mark as Delivered"
                          : "Mark as Sent"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No orders found.</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
