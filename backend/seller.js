import express from "express";

const router = express.Router();

// Sample data
let products = [
    { id: "1", name: "Laptop", price: 1200, stock: 10, status: "available" },
    { id: "2", name: "Phone", price: 800, stock: 5, status: "pending" }
];

let auctions = [
    { id: "1", productName: "Vintage Watch", startingPrice: 200, status: "active" }
];

// Fetch all products
router.get("/products", (req, res) => {
    res.json(products);
});

// Fetch all auctions
router.get("/auctions", (req, res) => {
    res.json(auctions);
});

// Add a new product
router.post("/products", (req, res) => {
    const { name, price, stock, status } = req.body;
    const newProduct = { id: (products.length + 1).toString(), name, price, stock, status };
    products.push(newProduct);
    res.json({ message: "Product added successfully", product: newProduct });
});

// Add a new auction
router.post("/auctions", (req, res) => {
    const { productName, startingPrice, status } = req.body;
    const newAuction = { id: (auctions.length + 1).toString(), productName, startingPrice, status };
    auctions.push(newAuction);
    res.json({ message: "Auction created successfully", auction: newAuction });
});

export default router;
