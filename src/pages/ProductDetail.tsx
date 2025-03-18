import { useEffect, useState } from "react";
import { useParams } from "react-router-dom"; // For extracting the productId from the URL
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

interface Product {
  id: string;
  title: string;
  price: number;
  description: string;
  imageUrl: string;
}

const ProductDetail = () => {
  const { productId } = useParams(); // Extract the productId from the URL
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (!productId) return;

    const fetchProduct = async () => {
      const productRef = doc(db, "products", productId);
      const productSnap = await getDoc(productRef);
      if (productSnap.exists()) {
        setProduct({ id: productSnap.id, ...productSnap.data() } as Product);
      }
    };

    fetchProduct();
  }, [productId]);

  if (!product) {
    return <div className="p-4 text-center">Loading product details...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="container py-8">
        <h1 className="text-3xl font-bold text-center mb-6">{product.title}</h1>

        <div className="flex justify-center items-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg">
            <img
              src={product.imageUrl}
              alt={product.title}
              className="w-full h-64 object-cover rounded-md"
            />
            <h2 className="text-2xl font-bold mt-4">{product.title}</h2>
            <p className="text-gray-600 mt-2">{product.description}</p>
            <p className="text-lg font-semibold mt-2">${product.price}</p>

            <Button className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white">
              Add to Cart
            </Button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ProductDetail;
