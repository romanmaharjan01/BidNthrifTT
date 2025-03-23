import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, getDocs, addDoc } from "firebase/firestore";
import "./setAuction.css";

const SetAuction: React.FC = () => {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [startingPrice, setStartingPrice] = useState("");
  const [auctionDate, setAuctionDate] = useState("");
  const [auctionTime, setAuctionTime] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const productSnapshot = await getDocs(collection(db, "products"));
        const productList = productSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setProducts(productList);
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };
    fetchProducts();
  }, []);

  const handleAuctionSubmit = async () => {
    if (!selectedProduct || !startingPrice || !auctionDate || !auctionTime) {
      alert("All fields are required!");
      return;
    }

    try {
      await addDoc(collection(db, "auctions"), {
        productId: selectedProduct,
        startingPrice: Number(startingPrice),
        auctionDate,
        auctionTime,
        status: "upcoming",
      });
      alert("Auction added successfully!");
      navigate("/seller");
    } catch (error) {
      console.error("Error adding auction:", error);
    }
  };

  return (
    <div className="auction-container">
      <h2>Set Auction</h2>
      <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}>
        <option value="">Select Product</option>
        {products.map((product) => (
          <option key={product.id} value={product.id}>{product.name}</option>
        ))}
      </select>
      <input type="number" placeholder="Starting Price" value={startingPrice} onChange={(e) => setStartingPrice(e.target.value)} />
      <input type="date" value={auctionDate} onChange={(e) => setAuctionDate(e.target.value)} />
      <input type="time" value={auctionTime} onChange={(e) => setAuctionTime(e.target.value)} />
      <button onClick={handleAuctionSubmit}>Start Auction</button>
    </div>
  );
};

export default SetAuction;
