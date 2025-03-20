import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { FaHeart, FaRegHeart } from "react-icons/fa"; // Favorite icon
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Product {
  id: string;
  title: string;
  price: number;
  currentBid?: number;
  description: string;
  imageUrl: string;
  stock: number;
  category: string;
  size: string;
  isAuction: boolean;
  endsAt?: string;
  seller: string;
}

const Shop = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      const querySnapshot = await getDocs(collection(db, "products"));
      const productList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[];
      setProducts(productList);
    };
    fetchProducts();
  }, []);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((fav) => fav !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="container py-8">
        <h1 className="text-3xl font-bold text-center mb-6">Shop</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.length > 0 ? (
            products.map((product) => (
              <div
                key={product.id}
                className="bg-white p-4 rounded-lg shadow-lg hover:scale-105 transition-all duration-300 relative"
              >
                {/* Favorite Button */}
                <button
                  className="absolute top-2 right-2 text-red-500 text-xl"
                  onClick={() => toggleFavorite(product.id)}
                >
                  {favorites.includes(product.id) ? <FaHeart /> : <FaRegHeart />}
                </button>

                <img
                  src={product.imageUrl}
                  alt={product.title}
                  className="w-full h-48 object-cover rounded-md"
                />

                <h3 className="text-lg font-bold mt-2">{product.title}</h3>
                <p className="text-gray-600">${product.price}</p>
                <p className="text-sm text-gray-500">{product.description}</p>
                <p className="text-sm text-gray-700 font-semibold">Category: {product.category}</p>
                <p className="text-sm text-gray-700 font-semibold">Size: {product.size}</p>
                <p className={`text-sm font-bold ${product.stock > 0 ? "text-green-600" : "text-red-600"}`}>
                  {product.stock > 0 ? `In Stock (${product.stock})` : "Out of Stock"}
                </p>

                {/* Auction Display */}
                {product.isAuction && (
                  <p className={`text-sm font-bold ${new Date(product.endsAt!).getTime() < Date.now() ? "text-red-500" : "text-gray-600"}`}>
                    {new Date(product.endsAt!).getTime() < Date.now() ? "Ended" : `Current Bid: $${product.currentBid}`}
                  </p>
                )}

                <div className="mt-3 flex flex-col gap-2">
                  <Link to={`/payment/${product.id}`}>
                    <Button className="w-full bg-green-600 text-white hover:bg-green-700">
                      Buy Now
                    </Button>
                  </Link>
                  <Link to={`/product-detail/${product.id}`}>
                    <Button className="w-full bg-blue-600 text-white hover:bg-blue-700">
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 col-span-full">No Products Found</p>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Shop;
