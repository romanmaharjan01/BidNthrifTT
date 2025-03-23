import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";

const Sell = () => {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [stock, setStock] = useState("");
  const [size, setSize] = useState("");
  const [category, setCategory] = useState("Outerwear");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSell = async () => {
    if (!title || !price || !description || !imageUrl || !stock || !size || !category) {
      toast({ title: "Error", description: "All fields are required!", variant: "destructive" });
      return;
    }

    const numericPrice = parseFloat(price);
    const numericStock = parseInt(stock);

    if (isNaN(numericPrice) || numericPrice <= 0) {
      toast({ title: "Error", description: "Price must be a positive number!", variant: "destructive" });
      return;
    }

    if (isNaN(numericStock) || numericStock <= 0) {
      toast({ title: "Error", description: "Stock quantity must be greater than zero!", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        toast({ title: "Error", description: "You must be logged in!", variant: "destructive" });
        navigate("/login");
        return;
      }

      await addDoc(collection(db, "products"), {
        title,
        price: numericPrice,
        description,
        imageUrl,
        stock: numericStock,
        size,
        category,
        sellerId: user.uid,
        sellerEmail: user.email,
        createdAt: new Date()
      });

      toast({ title: "Success", description: "Your item has been listed!" });
      navigate("/shop");
    } catch (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-12 flex items-center justify-center">
        <div className="max-w-lg w-full p-6 bg-white shadow-lg rounded-lg">
          <h2 className="text-2xl font-bold text-center mb-6">Sell Your Item</h2>
          <div className="space-y-4">
            <Input type="text" placeholder="Image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
            {imageUrl && <img src={imageUrl} alt="Preview" className="w-full h-48 object-cover mt-2 rounded-md" />}
            <Input type="text" placeholder="Product Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Input type="number" placeholder="Price (Nrs)" value={price} onChange={(e) => setPrice(e.target.value)} />
            <Input type="number" placeholder="Stock Quantity" value={stock} onChange={(e) => setStock(e.target.value)} />
            <Input type="text" placeholder="Size (e.g., M, L, US 9)" value={size} onChange={(e) => setSize(e.target.value)} />
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full border rounded-md p-2">
              <option value="Outerwear">Outerwear</option>
              <option value="Footwear">Footwear</option>
              <option value="Accessories">Accessories</option>
              <option value="Knitwear">Knitwear</option>
            </select>
            <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border rounded-md p-2" rows={3} />
          </div>
          <Button onClick={handleSell} disabled={isLoading} className="w-full mt-4 bg-green-600 hover:bg-green-700">
            {isLoading ? "Saving..." : "List for Sale"}
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Sell;