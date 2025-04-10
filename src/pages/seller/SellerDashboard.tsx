import React, { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import "./seller.css";

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

interface Stats {
  totalListings: number;
  totalSales: number;
  pendingShipments: number;
}

const SellerDashboard: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [userId, setUserId] = useState<string>("");
  const [sellerImage, setSellerImage] = useState<string>("");
  const [stats, setStats] = useState<Stats>({
    totalListings: 0,
    totalSales: 0,
    pendingShipments: 0,
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in!",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }
      setUserId(user.uid);
      setSellerImage(user.photoURL || "https://via.placeholder.com/100");
      await fetchSellerData(user.uid);
    });

    return () => unsubscribe();
  }, [navigate, toast]);

  const fetchSellerData = async (sellerId: string) => {
    if (!sellerId) return;

    setIsLoadingData(true);
    try {
      const [productsSnapshot, ordersSnapshot, completedOrdersSnapshot] = await Promise.all([
        getDocs(query(collection(db, "products"), where("sellerId", "==", sellerId))),
        getDocs(query(collection(db, "orders"), where("sellerId", "==", sellerId), where("status", "==", "pending"))),
        getDocs(query(collection(db, "orders"), where("sellerId", "==", sellerId), where("status", "==", "completed"))),
      ]);

      const productsData: Product[] = productsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as Product));
      const pendingCount = ordersSnapshot.docs.length;
      const totalSales = completedOrdersSnapshot.docs.reduce((total, order) => total + (order.data().total || 0), 0);

      setProducts(productsData);
      setStats({
        totalListings: productsData.length,
        totalSales,
        pendingShipments: pendingCount,
      });
    } catch (error) {
      console.error("Error fetching seller data:", error);
      toast({
        title: "Error",
        description: "Failed to load your seller data",
        variant: "destructive",
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  const formatCurrency = (amount: number): string => `Nrs ${(amount || 0).toFixed(2)}`;
  const toggleMobileMenu = () => setIsMobileMenuOpen((prev) => !prev);

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex flex-row">
        <aside className={`sidebar ${isMobileMenuOpen ? "mobile-open" : ""}`}>
          <div className="sidebar-header">
            <h2 className="sidebar-title">Seller Dashboard</h2>
            <img
              src={sellerImage}
              alt="Seller Profile"
              className="seller-image"
            />
            <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
              <i className={`fa ${isMobileMenuOpen ? "fa-times" : "fa-bars"}`}></i>
            </button>
          </div>
          <nav className="sidebar-nav">
            <NavLink
              to="/seller/dashboard"
              className={({ isActive }) => (isActive ? "menu-link active" : "menu-link")}
            >
              <i className="fa fa-home"></i> Dashboard
            </NavLink>
            <NavLink
              to="/seller/listings"
              className={({ isActive }) => (isActive ? "menu-link active" : "menu-link")}
            >
              <i className="fa fa-box"></i> My Listings
            </NavLink>
            <NavLink
              to="/seller/add"
              className={({ isActive }) => (isActive ? "menu-link active" : "menu-link")}
            >
              <i className="fa fa-plus-circle"></i> Add Listing
            </NavLink>
            <NavLink
              to="/seller/chat"
              className={({ isActive }) => (isActive ? "menu-link active" : "menu-link")}
            >
              <i className="fa fa-comments"></i> Messages
            </NavLink>
            <NavLink
              to="/seller/sellerprofile"
              className={({ isActive }) => (isActive ? "menu-link active" : "menu-link")}
            >
              <i className="fa fa-user"></i> Profile
            </NavLink>
          </nav>
        </aside>
        <section className="content">
          <Outlet context={{ stats, products, isLoadingData, fetchSellerData, formatCurrency, userId }} />
        </section>
      </main>
    </div>
  );
};

export default SellerDashboard;