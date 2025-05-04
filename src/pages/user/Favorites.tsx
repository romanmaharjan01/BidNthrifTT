import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Favorite {
  id: string;
  title: string;
  price: number;
  imageUrl: string;
}

interface ContextType {
  favorites: Favorite[];
  navigate: (path: string) => void;
}

const Favorites: React.FC = () => {
  const { favorites, navigate } = useOutletContext<ContextType>();

  const handleProductClick = (productId: string) => {
    navigate(`/product-detail/${productId}`);
  };

  const handleAddToCart = async (product: Favorite) => {
    // Navigate to product detail page where user can add to cart
    navigate(`/product-detail/${product.id}`);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Your Favorite Products</h2>
      {favorites.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {favorites.map((favorite) => (
            <Card key={favorite.id} className="overflow-hidden">
              <div 
                className="relative aspect-square cursor-pointer"
                onClick={() => handleProductClick(favorite.id)}
              >
                <img
                  src={favorite.imageUrl}
                  alt={favorite.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-lg truncate cursor-pointer" onClick={() => handleProductClick(favorite.id)}>
                  {favorite.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="font-bold text-lg">₨{favorite.price.toFixed(2)}</div>
              </CardContent>
              <CardFooter className="p-4 pt-0">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddToCart(favorite);
                  }}
                  className="w-full"
                  variant="outline"
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Add to Cart
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">You haven't added any products to your favorites yet.</p>
          <Button
            onClick={() => navigate("/shop")}
            className="mt-4"
          >
            Browse Products
          </Button>
        </div>
      )}
    </div>
  );
};

export default Favorites; 