// src/pages/ProductDetail.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc, arrayUnion, getDocs, query, collection, where } from "firebase/firestore";
import { db, auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import "./Shop.css";

interface Product {
  id: string;
  title: string;
  price: number | string;
  currentBid?: number | string;
  description: string;
  imageUrl: string;
  stock: number;
  category: string;
  size: string;
  isAuction: boolean;
  endsAt?: string;
  seller: string;
}

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserId(user ? user.uid : null);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) {
        setError("Product ID is missing.");
        setLoading(false);
        return;
      }

      try {
        const productRef = doc(db, "products", id);
        const productSnap = await getDoc(productRef);

        if (productSnap.exists()) {
          const data = productSnap.data();
          setProduct({
            id: productSnap.id,
            title: data.title || "",
            price: data.price !== undefined ? Number(data.price) : 0,
            currentBid: data.currentBid !== undefined ? Number(data.currentBid) : undefined,
            description: data.description || "",
            imageUrl: data.imageUrl || "",
            stock: data.stock || 0,
            category: data.category || "",
            size: data.size || "",
            isAuction: data.isAuction || false,
            endsAt: data.endsAt || undefined,
            seller: data.seller || "",
          });
        } else {
          setError("Product not found.");
        }
      } catch (err) {
        console.error("Error fetching product:", err);
        setError("Failed to load product. Please try again later.");
        toast({
          title: "Error",
          description: "Failed to load product. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, toast]);

  const handleAddToCart = async () => {
    if (!userId) {
      toast({
        title: "Please Log In",
        description: "You need to be logged in to add items to your cart.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    if (!product) return;

    try {
      const cleanedProduct = {
        id: product.id,
        title: product.title,
        price: product.price,
        imageUrl: product.imageUrl,
        stock: product.stock,
        category: product.category,
        size: product.size,
        isAuction: product.isAuction,
        ...(product.currentBid !== undefined && { currentBid: product.currentBid }),
        ...(product.endsAt && { endsAt: product.endsAt }),
        seller: product.seller,
      };

      const cartQuery = query(collection(db, "carts"), where("userId", "==", userId));
      const cartSnapshot = await getDocs(cartQuery);
      let cartRef;

      if (cartSnapshot.empty) {
        cartRef = doc(db, "carts", userId);
        await setDoc(cartRef, {
          userId,
          items: [{ productId: product.id, quantity: 1, ...cleanedProduct }],
        });
      } else {
        cartRef = doc(db, "carts", userId);
        await setDoc(
          cartRef,
          {
            items: arrayUnion({ productId: product.id, quantity: 1, ...cleanedProduct }),
          },
          { merge: true }
        );
      }

      toast({
        title: "Added to Cart",
        description: `${product.title} has been added to your cart.`,
      });
      navigate("/cart");
    } catch (err) {
      console.error("Error adding to cart:", err);
      toast({
        title: "Error",
        description: "Failed to add item to cart. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex justify-center items-center flex-1">
          <Loader2 className="animate-spin w-8 h-8 text-brand-green" />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 py-12 flex items-center justify-center">
          <div className="max-w-lg w-full p-6 bg-white shadow-lg rounded-lg text-center">
            <h2 className="text-2xl font-bold mb-4">{error || "Product not found."}</h2>
            <Button
              onClick={() => navigate("/shop")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Back to Shop
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-12 flex items-center justify-center">
        <div className="max-w-4xl w-full p-6 bg-white shadow-lg rounded-lg flex gap-6">
          <div className="flex-1">
            <img
              src={product.imageUrl || "https://via.placeholder.com/300"}
              alt={product.title}
              className="w-full h-96 object-contain rounded-lg border"
            />
          </div>

          <div className="flex-1 space-y-4">
            <h2 className="text-2xl font-bold">{product.title}</h2>

            <div>
              <Label>Price</Label>
              <p className="text-lg font-semibold text-green-600">
                ${typeof product.price === "number" ? product.price.toFixed(2) : product.price}
              </p>
            </div>

            {product.isAuction && (
              <div>
                <Label>Auction Status</Label>
                <p
                  className={`text-lg font-semibold ${
                    product.endsAt && new Date(product.endsAt).getTime() < Date.now()
                      ? "text-red-600"
                      : "text-gray-600"
                  }`}
                >
                  {product.endsAt && new Date(product.endsAt).getTime() < Date.now()
                    ? "Auction Ended"
                    : `Current Bid: $${
                        typeof product.currentBid === "number"
                          ? product.currentBid.toFixed(2)
                          : product.currentBid
                      }`}
                </p>
              </div>
            )}

            <div>
              <Label>Stock</Label>
              <p
                className={`text-lg font-semibold ${
                  product.stock > 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {product.stock > 0 ? `In Stock (${product.stock})` : "Out of Stock"}
              </p>
            </div>

            <div>
              <Label>Category</Label>
              <p className="text-gray-600">{product.category}</p>
            </div>

            <div>
              <Label>Size</Label>
              <p className="text-gray-600">{product.size}</p>
            </div>

            <div>
              <Label>Description</Label>
              <p className="text-gray-600">{product.description}</p>
            </div>

            <div>
              <Label>Seller</Label>
              <p className="text-gray-600">{product.seller}</p>
            </div>

            <div className="flex gap-4 mt-6">
              {product.stock > 0 && !product.isAuction && (
                <>
                  <Button
                    onClick={() => navigate(`/payment/${product.id}`)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Buy Now
                  </Button>
                  <Button
                    onClick={handleAddToCart}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Add to Cart
                  </Button>
                </>
              )}
              <Button
                onClick={() => navigate("/shop")}
                variant="outline"
                className="border-gray-300"
              >
                Back to Shop
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProductDetail;