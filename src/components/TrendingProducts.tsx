
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ProductCard, { Product } from "./ProductCard";

const TrendingProducts = () => {
  // Mock data for trending products
  const [products] = useState<Product[]>([
    {
      id: "5",
      title: "Oversized Cotton T-Shirt",
      price: 18,
      isAuction: false,
      image: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80&w=1964&auto=format&fit=crop",
      category: "Tops",
      size: "L",
      seller: "MinimalistStyle"
    },
    {
      id: "6",
      title: "Vintage High-Waisted Jeans",
      price: 45,
      isAuction: false,
      image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=1974&auto=format&fit=crop",
      category: "Bottoms",
      size: "29",
      seller: "DenimLover"
    },
    {
      id: "7",
      title: "Leather Crossbody Bag",
      price: 38,
      isAuction: false,
      image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=1935&auto=format&fit=crop",
      category: "Accessories",
      size: "One Size",
      seller: "VintageTreasures"
    },
    {
      id: "8",
      title: "Wool Blend Coat",
      price: 75,
      isAuction: false,
      image: "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?q=80&w=1974&auto=format&fit=crop",
      category: "Outerwear",
      size: "M",
      seller: "SustainableChic"
    }
  ]);
  
  return (
    <section className="py-12 bg-brand-neutral-lightest">
      <div className="container">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              Trending Products
            </h2>
            <p className="text-muted-foreground mt-1">
              Popular items available for immediate purchase
            </p>
          </div>
          <Button asChild variant="outline" className="mt-4 md:mt-0">
            <Link to="/shop">Shop All Products</Link>
          </Button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrendingProducts;
