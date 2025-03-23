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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
      {isLoadingData ? (
        <p className="loading-text">Loading listings...</p>
      ) : products.length > 0 ? (
        <div className="product-list">
          {products.map((product) => (
            <div key={product.id} className="product-card">
              <div className="product-card-content">
                {editingProductId === product.id && editedProduct ? (
                  <div className="edit-form">
                    <input
                      name="title"
                      value={editedProduct.title}
                      onChange={handleChange}
                      placeholder="Product Title"
                      className="edit-input"
                    />
                    <input
                      name="description"
                      value={editedProduct.description}
                      onChange={handleChange}
                      placeholder="Description"
                      className="edit-input"
                    />
                    <input
                      name="imageUrl"
                      value={editedProduct.imageUrl}
                      onChange={handleChange}
                      placeholder="Image URL"
                      className="edit-input"
                    />
                    <input
                      name="size"
                      value={editedProduct.size}
                      onChange={handleChange}
                      placeholder="Size"
                      className="edit-input"
                    />
                    <select
                      name="category"
                      value={editedProduct.category}
                      onChange={handleChange}
                      className="edit-select"
                    >
                      <option value="Outerwear">Outerwear</option>
                      <option value="Footwear">Footwear</option>
                      <option value="Accessories">Accessories</option>
                      <option value="Knitwear">Knitwear</option>
                    </select>
                    <input
                      name="price"
                      type="number"
                      value={editedProduct.price}
                      onChange={handleChange}
                      placeholder="Price (Nrs)"
                      className="edit-input"
                    />
                    <input
                      name="stock"
                      type="number"
                      value={editedProduct.stock}
                      onChange={handleChange}
                      placeholder="Stock Quantity"
                      className="edit-input"
                    />
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
                      <img
                        src={product.imageUrl}
                        alt={product.title}
                        className="product-image"
                      />
                      <div className="product-info">
                        <h3 className="product-title">{product.title}</h3>
                        <p className="product-meta">
                          {product.category} - {product.size}
                        </p>
                        <p className="product-price">Price: {formatCurrency(product.price)}</p>
                        <p className="product-stock">Stock: {product.stock}</p>
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
        <p className="empty-text">No listings found.</p>
      )}
    </div>
  );
};

export default Listings;