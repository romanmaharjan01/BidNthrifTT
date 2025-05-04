import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { db } from "../firebase"; // Adjust path if needed
import { doc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import "./listings.css";

interface Product {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
  size: string;
  sellerId: string;
  sellerEmail: string;
  createdAt: Date | any;
  price: number;
  stock: number;
}

interface ContextType {
  stats: any;
  products: Product[];
  isLoadingData: boolean;
  fetchSellerData: (sellerId: string) => void;
  formatCurrency: (amount: number) => string;
}

const Listings: React.FC = () => {
  const { products, isLoadingData, formatCurrency, fetchSellerData } = useOutletContext<ContextType>();
  const { toast } = useToast();
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editedProduct, setEditedProduct] = useState<Product | null>(null);

  const handleEdit = (product: Product) => {
    setEditingProductId(product.id);
    setEditedProduct({ ...product });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (!editedProduct) return;
    const { name, value } = e.target;
    setEditedProduct({
      ...editedProduct,
      [name]: name === "price" ? parseFloat(value) : name === "stock" ? parseInt(value) : value,
    });
  };

  const handleSave = async () => {
    if (!editedProduct) return;

    try {
      const productRef = doc(db, "products", editedProduct.id);
      await updateDoc(productRef, {
        title: editedProduct.title,
        description: editedProduct.description,
        imageUrl: editedProduct.imageUrl,
        category: editedProduct.category,
        size: editedProduct.size,
        price: editedProduct.price,
        stock: editedProduct.stock,
      });

      toast({
        title: "Success",
        description: "Product updated successfully!",
      });
      setEditingProductId(null);
      setEditedProduct(null);
      fetchSellerData(editedProduct.sellerId);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setEditingProductId(null);
    setEditedProduct(null);
  };

  return (
    <div className="listings-container">
      <h1 className="text-2xl font-bold mb-6">My Listings</h1>
      
      {isLoadingData ? (
        <p className="loading-text">Loading listings...</p>
      ) : products.length > 0 ? (
        <div className="product-list">
          {products.map((product) => (
            <div key={product.id} className="product-card">
              <div className="product-card-content">
                {editingProductId === product.id && editedProduct ? (
                  <div className="edit-form">
                    <h3 className="text-lg font-semibold mb-3">Edit Product</h3>
                    <input
                      name="title"
                      value={editedProduct.title}
                      onChange={handleChange}
                      placeholder="Product Title"
                      className="edit-input"
                    />
                    <textarea
                      name="description"
                      value={editedProduct.description}
                      onChange={handleChange}
                      placeholder="Description"
                      rows={3}
                      className="edit-input"
                    />
                    <input
                      name="imageUrl"
                      value={editedProduct.imageUrl}
                      onChange={handleChange}
                      placeholder="Image URL"
                      className="edit-input"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <select
                          name="category"
                          value={editedProduct.category}
                          onChange={handleChange}
                          className="edit-select w-full"
                        >
                          <option value="Outerwear">Outerwear</option>
                          <option value="Footwear">Footwear</option>
                          <option value="Accessories">Accessories</option>
                          <option value="Knitwear">Knitwear</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                        <input
                          name="size"
                          value={editedProduct.size}
                          onChange={handleChange}
                          placeholder="Size"
                          className="edit-input w-full"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Price (Nrs)</label>
                        <input
                          name="price"
                          type="number"
                          value={editedProduct.price}
                          onChange={handleChange}
                          placeholder="Price"
                          className="edit-input w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                        <input
                          name="stock"
                          type="number"
                          value={editedProduct.stock}
                          onChange={handleChange}
                          placeholder="Stock Quantity"
                          className="edit-input w-full"
                        />
                      </div>
                    </div>
                    <div className="edit-form-buttons">
                      <button onClick={handleSave} className="save-button">
                        Save
                      </button>
                      <button onClick={handleCancel} className="cancel-button">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="product-display">
                    <div className="product-details">
                      <div className="image-container">
                        <img
                          src={product.imageUrl || "https://placehold.co/400x400?text=No+Image"}
                          alt={product.title}
                          className="product-image"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "https://placehold.co/400x400?text=Error+Loading";
                          }}
                        />
                      </div>
                      <div className="product-info">
                        <h3 className="product-title">{product.title}</h3>
                        <p className="product-meta">
                          {product.category} {product.size ? `- ${product.size}` : ''}
                        </p>
                        <p className="product-price">{formatCurrency(product.price)}</p>
                        <p className="product-stock">
                          <span className="font-medium">Stock:</span> {product.stock}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => handleEdit(product)} className="edit-button">
                      Edit
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p className="empty-text">No listings found.</p>
          <p className="text-gray-600 mb-4">Add your first product to start selling!</p>
        </div>
      )}
    </div>
  );
};

export default Listings;