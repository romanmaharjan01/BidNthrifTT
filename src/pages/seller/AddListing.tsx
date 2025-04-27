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

// Define category sizes for relevant categories
const categorySizes: { [key: string]: string[] } = {
  Clothing: ["S", "M", "L", "XL"],
  Shoes: ["38", "39", "40", "41", "42", "43", "44", "45"],
  Accessories: [],
  Electronics: [],
  "Home goods": [],
  Books: [],
  Toys: [],
  Jewelry: [],
};

// List of categories
const categories = [
  "Clothing",
  "Shoes",
  "Accessories",
  "Electronics",
  "Home goods",
  "Books",
  "Toys",
  "Jewelry",
];

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
  const [category, setCategory] = useState<string>("Clothing");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = e.target.value;
    setCategory(newCategory);
    const newSizes = categorySizes[newCategory] || [];
    setSize(newSizes.length > 0 ? newSizes[0] : "");
  };

  const handleSell = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!title || !price || !description || !imageUrl || !stock || !category) {
      toast({ title: "Error", description: "All fields are required!", variant: "destructive" });
      return;
    }

    if (categorySizes[category]?.length > 0 && !size) {
      toast({ title: "Error", description: "Size is required for this category!", variant: "destructive" });
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
        size: categorySizes[category]?.length > 0 ? size : "",
        category,
        sellerId: user.uid,
        sellerEmail: user.email,
        createdAt: new Date(),
        status: "pending", // Set status to pending for admin approval
      });

      toast({ title: "Success", description: "Your item has been submitted for admin approval!" });
      setTitle("");
      setPrice("");
      setDescription("");
      setImageUrl("");
      setStock("");
      setSize("");
      setCategory("Clothing");
      fetchSellerData(user.uid);
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
        <select
          value={category}
          onChange={handleCategoryChange}
          className="w-full border rounded-md p-2"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <select
          value={size}
          onChange={(e) => setSize(e.target.value)}
          className="w-full border rounded-md p-2"
          disabled={!categorySizes[category]?.length}
        >
          {categorySizes[category]?.length > 0 ? (
            categorySizes[category].map((sizeOption) => (
              <option key={sizeOption} value={sizeOption}>
                {sizeOption}
              </option>
            ))
          ) : (
            <option value="">No sizes available</option>
          )}
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
        {isLoading ? "Submitting..." : "Submit for Approval"}
      </Button>
    </form>
  );
};

export default AddListing;