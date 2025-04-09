import { useEffect, useState } from "react";
<<<<<<< HEAD
import { collection, getDocs, query, where } from "firebase/firestore";
=======
import { collection, getDocs } from "firebase/firestore";
>>>>>>> e553efe (Initial commit after fixing corruption)
import { db } from "./firebase";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { FaHeart, FaRegHeart, FaSearch, FaTimes } from "react-icons/fa";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import "./Shop.css";

interface Product {
  id: string;
  title: string;
  price: number | string;
  currentBid?: number | string;
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
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

<<<<<<< HEAD
  // Define all possible categories statically
=======
>>>>>>> e553efe (Initial commit after fixing corruption)
  const allCategories = [
    "Clothing",
    "Shoes",
    "Accessories",
    "Electronics",
    "Home Goods",
    "Books",
    "Toys",
    "Jewelry",
  ];

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const querySnapshot = await getDocs(collection(db, "products"));
        const productList = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || "",
            price: data.price !== undefined ? Number(data.price) : 0,
            currentBid: data.currentBid !== undefined ? Number(data.currentBid) : undefined,
            description: data.description || "",
            imageUrl: data.imageUrl || "",
            stock: data.stock || 0,
            category: data.category || "",
            size: data.size || "",
            isAuction: data.isAuction || false,
            endsAt: data.endsAt || undefined,
            seller: data.seller || "",
          } as Product;
        });
        
        setProducts(productList);
        setFilteredProducts(productList);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    const savedFavorites = localStorage.getItem("favorites");
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
    
    fetchProducts();
  }, []);

  useEffect(() => {
    localStorage.setItem("favorites", JSON.stringify(favorites));
  }, [favorites]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    filterProducts(searchTerm, selectedCategory);
  };

  const filterProducts = (search: string, category: string) => {
    let filtered = [...products];
    
    if (search.trim()) {
      const lowerSearchTerm = search.toLowerCase();
      filtered = filtered.filter(product => 
        product.title.toLowerCase().includes(lowerSearchTerm) ||
        product.description.toLowerCase().includes(lowerSearchTerm)
      );
    }
    
    if (category) {
      filtered = filtered.filter(product => product.category === category);
    }
    
    setFilteredProducts(filtered);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("");
    setFilteredProducts(products);
  };

  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((fav) => fav !== id) : [...prev, id]
    );
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    filterProducts(searchTerm, category);
  };

  return (
    <div className="shop-page">
      <Navbar />
      <div className="shop-container">
        <h1 className="shop-title">Our Collection</h1>

        <div className="shop-filters">
          <form onSubmit={handleSearch} className="search-form">
            <div className="search-input-container">
              <Input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <Button type="submit" className="search-button">
                <FaSearch />
              </Button>
            </div>
          </form>

          <div className="category-filter">
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="category-select"
            >
              <option value="">All Categories</option>
              {allCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {(searchTerm || selectedCategory) && (
            <Button
              type="button"
              onClick={clearFilters}
              className="clear-filters-button"
            >
              <FaTimes /> Clear Filters
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="loading">Loading products...</div>
        ) : (
          <div className="products-grid">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
<<<<<<< HEAD
                <div key={product.id} className="product-card">
                  <div className="product-image-container">
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      className="product-image"
                    />
                    <button
                      className="favorite-button"
                      onClick={() => toggleFavorite(product.id)}
                      aria-label={favorites.includes(product.id) ? "Remove from favorites" : "Add to favorites"}
                    >
                      {favorites.includes(product.id) ? <FaHeart className="heart-filled" /> : <FaRegHeart />}
                    </button>
                  </div>

                  <div className="product-info">
                    <h3 className="product-title">{product.title}</h3>
                    
                    <div className="product-meta">
                      <span className="product-category">{product.category}</span>
                      <span className="product-size">{product.size}</span>
                    </div>
                    
                    <p className="product-price">${typeof product.price === 'number' ? product.price.toFixed(2) : product.price}</p>
                    
                    <div className="product-status">
                      <span className={`product-stock ${product.stock > 0 ? "in-stock" : "out-of-stock"}`}>
                        {product.stock > 0 ? `In Stock (${product.stock})` : "Out of Stock"}
                      </span>

                      {product.isAuction && (
                        <span className={`product-auction ${new Date(product.endsAt!).getTime() < Date.now() ? "auction-ended" : "auction-active"}`}>
                          {new Date(product.endsAt!).getTime() < Date.now() ? "Auction Ended" : `Current Bid: $${typeof product.currentBid === 'number' ? product.currentBid.toFixed(2) : product.currentBid}`}
                        </span>
                      )}
                    </div>

                    <div className="product-actions">
                      <Link to={`/product-detail/${product.id}`} className="details-link">
                        <Button className="details-button">View Details</Button>
                      </Link>
                      {product.stock > 0 && !product.isAuction && (
                        <Link to={`/payment/${product.id}`} className="buy-link">
                          <Button className="buy-button">Buy Now</Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
=======
                <Link 
                  to={`/product-detail/${product.id}`} 
                  key={product.id} 
                  className="product-card-link"
                >
                  <div className="product-card">
                    <div className="product-image-container">
                      <img
                        src={product.imageUrl}
                        alt={product.title}
                        className="product-image"
                      />
                      <button
                        className="favorite-button"
                        onClick={(e) => {
                          e.preventDefault(); // Prevent Link navigation
                          toggleFavorite(product.id);
                        }}
                        aria-label={favorites.includes(product.id) ? "Remove from favorites" : "Add to favorites"}
                      >
                        {favorites.includes(product.id) ? <FaHeart className="heart-filled" /> : <FaRegHeart />}
                      </button>
                    </div>

                    <div className="product-info">
                      <h3 className="product-title">{product.title}</h3>
                      
                      <div className="product-meta">
                        <span className="product-category">{product.category}</span>
                        <span className="product-size">{product.size}</span>
                      </div>
                      
                      <p className="product-price">${typeof product.price === 'number' ? product.price.toFixed(2) : product.price}</p>
                      
                      <div className="product-status">
                        <span className={`product-stock ${product.stock > 0 ? "in-stock" : "out-of-stock"}`}>
                          {product.stock > 0 ? `In Stock (${product.stock})` : "Out of Stock"}
                        </span>

                        {product.isAuction && (
                          <span className={`product-auction ${new Date(product.endsAt!).getTime() < Date.now() ? "auction-ended" : "auction-active"}`}>
                            {new Date(product.endsAt!).getTime() < Date.now() ? "Auction Ended" : `Current Bid: $${typeof product.currentBid === 'number' ? product.currentBid.toFixed(2) : product.currentBid}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
>>>>>>> e553efe (Initial commit after fixing corruption)
              ))
            ) : (
              <div className="no-products">
                <p>{searchTerm || selectedCategory ? "No products match your filters" : "No Products Available"}</p>
                {(searchTerm || selectedCategory) && (
                  <Button onClick={clearFilters} className="reset-search-button">
                    Reset Filters
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Shop;