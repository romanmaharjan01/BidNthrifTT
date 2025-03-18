import { useEffect, useState } from "react";
import { collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db, auth } from "./firebase";
import Navbar from "@/components/Navbar";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import { FaHeart, FaRegHeart } from "react-icons/fa"; // Heart icons for favorite
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: string;
  title: string;
  price: number;
  description: string;
  imageUrl: string;
}

const Shop = () => {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      const querySnapshot = await getDocs(collection(db, "products"));
      const productList = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(productList);
    };

    fetchProducts();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="container py-8">
        <h1 className="text-3xl font-bold text-center mb-6">Shop</h1>

        {/* Product Listing */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.length > 0 ? (
            products.map((product) => (
              <div
                key={product.id}
                className="bg-white p-4 rounded-lg shadow-lg transform hover:scale-105 hover:shadow-2xl transition-all duration-300"
              >
                <img
                  src={product.imageUrl}
                  alt={product.title}
                  className="w-full h-48 object-cover rounded-md"
                />
                <h3 className="text-lg font-bold mt-2">{product.title}</h3>
                <p className="text-gray-600">${product.price}</p>
                <p className="text-sm text-gray-500">{product.description}</p>

                <div className="mt-3 flex flex-col gap-2">
                  <Link to={`/payment/${product.id}`}>
                    <button className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700">
                      Buy Now
                    </button>
                  </Link>

                  {/* View Details Button */}
                  <Link to={`/product-detail/${product.id}`}>
                    <button className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">
                      View Details
                    </button>
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
