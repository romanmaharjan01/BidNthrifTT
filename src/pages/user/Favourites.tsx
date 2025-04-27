// src/pages/user/Favourites.tsx
import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, deleteDoc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Heart, ShoppingCart, Trash2, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Favorite {
  id: string;
  userId: string;
  productId: string;
  createdAt: Date;
}

interface Product {
  id: string;
  title: string;
  description?: string;
  price: number;
  imageUrl?: string;
  category: string;
  sellerId: string;
  sellerName?: string;
  rating?: number;
}

interface FavoriteWithProduct extends Favorite {
  product: Product;
}

const Favourites: React.FC = () => {
  const [favorites, setFavorites] = useState<FavoriteWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        navigate("/login");
        toast({
          title: "Authentication Required",
          description: "Please log in to view your favorites.",
          variant: "destructive",
        });
      }
    });

    return () => unsubscribe();
  }, [navigate, toast]);

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!userId) return;

      try {
        setLoading(true);
        const favoritesQuery = query(
          collection(db, "favorites"),
          where("userId", "==", userId)
        );
        const favoritesSnapshot = await getDocs(favoritesQuery);

        if (favoritesSnapshot.empty) {
          setFavorites([]);
          setLoading(false);
          return;
        }

        const favoritesWithProducts = await Promise.all(
          favoritesSnapshot.docs.map(async (favoriteDoc) => {
            const favorite = {
              id: favoriteDoc.id,
              ...favoriteDoc.data(),
            } as Favorite;

            // Fetch product details
            const productDoc = await getDoc(doc(db, "products", favorite.productId));
            
            if (!productDoc.exists()) {
              // Product no longer exists, you might want to delete this favorite
              await deleteDoc(doc(db, "favorites", favorite.id));
              return null;
            }
            
            const productData = {
              id: productDoc.id,
              ...productDoc.data(),
            } as Product;

            // Fetch seller name if available
            if (productData.sellerId) {
              try {
                const sellerDoc = await getDoc(doc(db, "users", productData.sellerId));
                if (sellerDoc.exists()) {
                  const sellerData = sellerDoc.data();
                  productData.sellerName = sellerData.displayName || "Unknown Seller";
                }
              } catch (error) {
                console.error("Error fetching seller:", error);
              }
            }
            
            return {
              ...favorite,
              product: productData,
            } as FavoriteWithProduct;
          })
        );

        // Filter out null values (products that no longer exist)
        const validFavorites = favoritesWithProducts.filter(
          (fav): fav is FavoriteWithProduct => fav !== null
        );

        setFavorites(validFavorites);
      } catch (error) {
        console.error("Error fetching favorites:", error);
        toast({
          title: "Error",
          description: "Failed to load your favorites. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [userId, toast]);

  const handleRemoveFavorite = async (favoriteId: string) => {
    try {
      await deleteDoc(doc(db, "favorites", favoriteId));
      setFavorites((prevFavorites) => 
        prevFavorites.filter((favorite) => favorite.id !== favoriteId)
      );
      toast({
        title: "Removed from Favorites",
        description: "Item has been removed from your favorites.",
      });
    } catch (error) {
      console.error("Error removing favorite:", error);
      toast({
        title: "Error",
        description: "Failed to remove item from favorites.",
        variant: "destructive",
      });
    }
  };

  const handleAddToCart = async (product: Product) => {
    if (!userId) return;

    try {
      // Check if user already has a cart
      const cartRef = doc(db, "carts", userId);
      const cartDoc = await getDoc(cartRef);

      let cartData;
      let cartItems;

      if (cartDoc.exists()) {
        cartData = cartDoc.data();
        cartItems = cartData.items || [];

        // Check if product already in cart
        const existingItemIndex = cartItems.findIndex(
          (item: any) => item.productId === product.id
        );

        if (existingItemIndex !== -1) {
          // Increment quantity if product already in cart
          cartItems[existingItemIndex].quantity += 1;
        } else {
          // Add new product to cart
          cartItems.push({
            productId: product.id,
            title: product.title,
            price: product.price,
            imageUrl: product.imageUrl || "",
            quantity: 1,
          });
        }

        // Update cart with new items
        await updateDoc(cartRef, { items: cartItems });
      } else {
        // Create new cart for user
        const newCart = {
          userId,
          items: [
            {
              productId: product.id,
              title: product.title,
              price: product.price,
              imageUrl: product.imageUrl || "",
              quantity: 1,
            },
          ],
        };

        await setDoc(cartRef, newCart);
      }

      toast({
        title: "Added to Cart",
        description: `${product.title} has been added to your cart.`,
      });
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast({
        title: "Error",
        description: "Failed to add item to cart. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleProductClick = (productId: string) => {
    navigate(`/products/${productId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center">
          <Heart className="text-red-500 mr-2 h-6 w-6" />
          <h1 className="text-3xl font-bold">Your Favorites</h1>
        </div>

        {favorites.length === 0 ? (
          <div className="text-center py-12">
            <div className="mb-4 flex justify-center">
              <Heart className="h-16 w-16 text-gray-300" />
            </div>
            <h2 className="text-2xl font-bold mb-2">No Favorites Yet</h2>
            <p className="text-gray-500 mb-6">
              Start adding products to your favorites list by clicking the heart icon on products you love.
            </p>
            <Button onClick={() => navigate("/shop")} className="bg-blue-600 hover:bg-blue-700">
              Browse Products
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {favorites.map((favorite) => (
              <Card key={favorite.id} className="overflow-hidden">
                <div 
                  className="relative h-48 cursor-pointer"
                  onClick={() => handleProductClick(favorite.product.id)}
                >
                  {favorite.product.imageUrl ? (
                    <img
                      src={favorite.product.imageUrl}
                      alt={favorite.product.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-400">No image</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFavorite(favorite.id);
                      }}
                      className="h-8 w-8 rounded-full"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {favorite.product.rating && (
                    <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded-full text-sm flex items-center">
                      <Star className="h-3 w-3 text-yellow-400 mr-1 fill-current" />
                      {favorite.product.rating.toFixed(1)}
                    </div>
                  )}
                </div>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-lg truncate cursor-pointer" onClick={() => handleProductClick(favorite.product.id)}>
                    {favorite.product.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="text-sm text-muted-foreground mb-2 truncate">
                    {favorite.product.sellerName || ""}
                  </div>
                  <div className="font-bold text-lg">₨{favorite.product.price.toFixed(2)}</div>
                </CardContent>
                <CardFooter className="p-4 pt-0">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToCart(favorite.product);
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
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Favourites;