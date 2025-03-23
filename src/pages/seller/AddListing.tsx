// src/components/seller/AddListing.tsx
import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { auth, db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface ContextType {
  stats: any;
  products: any[];
  isLoadingData: boolean;
  fetchSellerData: (sellerId: string) => void;
  formatCurrency: (amount: number) => string;
}

const AddListing: React.FC = () => {
  const { fetchSellerData } = useOutletContext<ContextType>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [title, setTitle] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [stock, setStock] = useState<string>("");
  const [size, setSize] = useState<string>("");
  const [category, setCategory] = useState<string>("Outerwear");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSell = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

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
      toast({
        title: "Error",
        description: "Stock quantity must be greater than zero!",
        variant: "destructive",
      });
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
        createdAt: new Date(),
      });

      toast({ title: "Success", description: "Your item has been listed!" });
      setTitle("");
      setPrice("");
      setDescription("");
      setImageUrl("");
      setStock("");
      setSize("");
      setCategory("Outerwear");
      fetchSellerData(user.uid); // Refresh data after adding
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSell} className="max-w-lg mx-auto p-6 bg-white shadow-lg rounded-lg">
      <h2 className="text-2xl font-bold text-center mb-6">Sell Your Item</h2>
      <div className="space-y-4">
        <Input
          type="text"
          placeholder="Image URL"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />
        {imageUrl && (
          <img src={imageUrl} alt="Preview" className="w-full h-48 object-cover mt-2 rounded-md" />
        )}
        <Input
          type="text"
          placeholder="Product Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Input
          type="number"
          placeholder="Price (Nrs)"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <Input
          type="number"
          placeholder="Stock Quantity"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
        />
        <Input
          type="text"
          placeholder="Size (e.g., M, L, US 9)"
          value={size}
          onChange={(e) => setSize(e.target.value)}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full border rounded-md p-2"
        >
          <option value="Outerwear">Outerwear</option>
          <option value="Footwear">Footwear</option>
          <option value="Accessories">Accessories</option>
          <option value="Knitwear">Knitwear</option>
        </select>
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border rounded-md p-2"
          rows={3}
        />
      </div>
      <Button
        type="submit"
        disabled={isLoading}
        className="w-full mt-4 bg-green-600 hover:bg-green-700"
      >
        {isLoading ? "Saving..." : "List for Sale"}
      </Button>
    </form>
  );
};

export default AddListing;