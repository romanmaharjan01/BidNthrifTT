
import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Heart, Clock, Tag } from "lucide-react";

export interface Product {
  id: string;
  title: string;
  price: number;
  currentBid?: number;
  isAuction: boolean;
  image: string;
  category: string;
  size: string;
  endsAt?: string;
  seller: string;
}

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const [isFavorite, setIsFavorite] = useState(false);
  
  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorite(!isFavorite);
  };
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };
  
  const getTimeRemaining = (endsAt?: string) => {
    if (!endsAt) return null;
    
    const now = new Date();
    const endTime = new Date(endsAt);
    const diff = endTime.getTime() - now.getTime();
    
    if (diff <= 0) return "Ended";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    }
    
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    
    return `${minutes}m`;
  };
  
  const timeRemaining = product.isAuction ? getTimeRemaining(product.endsAt) : null;
  
  return (
    <Card className="product-card group">
      <Link to={`/product/${product.id}`} className="relative block">
        {/* Favorite button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 z-10 rounded-full bg-background/80 backdrop-blur-sm"
          onClick={toggleFavorite}
        >
          <Heart className={`h-5 w-5 ${isFavorite ? 'fill-brand-accent-red text-brand-accent-red' : ''}`} />
          <span className="sr-only">Add to favorites</span>
        </Button>
        
        {/* Product image */}
        <div className="relative aspect-square overflow-hidden">
          <img src={product.image} alt={product.title} className="product-image" />
          
          {/* Auction badge */}
          {product.isAuction && (
            <Badge variant="secondary" className="absolute left-2 top-2 bg-brand-accent-yellow text-foreground">
              Auction
            </Badge>
          )}
        </div>
        
        <CardContent className="p-4">
          <div className="grid gap-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium line-clamp-1">{product.title}</p>
              <p className="text-sm font-medium text-brand-accent-yellow">{product.size}</p>
            </div>
            
            <div className="flex items-center gap-1">
              <Tag className="h-3 w-3 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{product.category}</p>
            </div>
            
            {product.isAuction ? (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Current Bid</p>
                  <p className="text-xs text-muted-foreground">Starting Price</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="font-medium">
                    {product.currentBid ? formatPrice(product.currentBid) : "No bids"}
                  </p>
                  <p className="text-xs">{formatPrice(product.price)}</p>
                </div>
                {timeRemaining && (
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3 text-brand-accent-red" />
                    <p className="text-xs countdown-timer">
                      {timeRemaining}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-2">
                <p className="font-medium">
                  {formatPrice(product.price)}
                </p>
              </div>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="p-4 pt-0">
          <div className="flex items-center justify-between w-full">
            <p className="text-xs text-muted-foreground">
              by {product.seller}
            </p>
            {product.isAuction ? (
              <Button size="sm" className="text-xs h-8 bg-brand-green hover:bg-brand-green-dark">
                Place Bid
              </Button>
            ) : (
              <Button size="sm" className="text-xs h-8 bg-brand-green hover:bg-brand-green-dark">
                Buy Now
              </Button>
            )}
          </div>
        </CardFooter>
      </Link>
    </Card>
  );
};

export default ProductCard;
