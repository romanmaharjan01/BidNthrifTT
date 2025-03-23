// src/components/seller/Dashboard.tsx
import React from "react";
import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Stats {
  totalListings: number;
  totalSales: number;
  pendingShipments: number;
}

interface ContextType {
  stats: Stats;
  products: any[];
  isLoadingData: boolean;
  fetchSellerData: (sellerId: string) => void;
  formatCurrency: (amount: number) => string;
}

const Dashboard: React.FC = () => {
  const { stats, formatCurrency } = useOutletContext<ContextType>();

  return (
    <div>
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
    </div>
  );
};

export default Dashboard;