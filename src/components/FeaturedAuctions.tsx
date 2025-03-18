
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ProductCard, { Product } from "./ProductCard";

const FeaturedAuctions = () => {
  // Mock data for featured auctions
  const [auctions] = useState<Product[]>([
    {
      id: "1",
      title: "Vintage Levi's Denim Jacket",
      price: 35,
      currentBid: 47,
      isAuction: true,
      image: "https://images.unsplash.com/photo-1551537482-f2075a1d41f2?q=80&w=1974&auto=format&fit=crop",
      category: "Outerwear",
      size: "M",
      endsAt: "2023-12-10T14:00:00",
      seller: "VintageLover"
    },
    {
      id: "2",
      title: "Nike Air Max 90 Sneakers",
      price: 40,
      currentBid: 65,
      isAuction: true,
      image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=2012&auto=format&fit=crop",
      category: "Footwear",
      size: "US 9",
      endsAt: "2023-12-11T18:30:00",
      seller: "SneakerHead"
    },
    {
      id: "3",
      title: "Cashmere Knit Sweater",
      price: 25,
      currentBid: 32,
      isAuction: true,
      image: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=2070&auto=format&fit=crop",
      category: "Knitwear",
      size: "L",
      endsAt: "2023-12-09T20:00:00",
      seller: "EcoFashion"
    },
    {
      id: "4",
      title: "Designer Silk Scarf",
      price: 15,
      currentBid: 21,
      isAuction: true,
      image: "https://images.unsplash.com/photo-1621184455862-c163dfb30e0f?q=80&w=1974&auto=format&fit=crop",
      category: "Accessories",
      size: "One Size",
      endsAt: "2023-12-12T12:00:00",
      seller: "LuxuryFinds"
    }
  ]);
  
  return (
    <section className="py-12 bg-background">
      <div className="container">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              Featured Auctions
            </h2>
            <p className="text-muted-foreground mt-1">
              Unique pieces ending soon - bid before they're gone
            </p>
          </div>
          <Button asChild variant="outline" className="mt-4 md:mt-0">
            <Link to="/auctions">View All Auctions</Link>
          </Button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {auctions.map((auction) => (
            <ProductCard key={auction.id} product={auction} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedAuctions;
