import React, { useState, useEffect, useCallback } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { collection, getDocs, query, where, onSnapshot } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import "./sellerdashboard.css";

interface Product {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
  size: string;
  sellerId: string;
  sellerEmail: string;
  createdAt: Date | null;
  price: number;
  stock: number;
}

interface Auction {
  id: string;
  title: string;
  price: number;
  endTime: string;
  status: "upcoming" | "active" | "ended" | "sold" | "sold_pending";
  sellerId: string;
}

interface Stats {
  totalListings: number;
  totalSales: number;
  pendingShipments: number;
  activeAuctions: number;
}

interface SellerData {
  products: Product[];
  stats: Stats;
}

const useSellerData = (sellerId: string, toast: ReturnType<typeof useToast>["toast"]) => {
  const [data, setData] = useState<SellerData>({
    products: [],
    stats: { totalListings: 0, totalSales: 0, pendingShipments: 0, activeAuctions: 0 },
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchSellerData = useCallback(async () => {
    if (!sellerId) return;

    setIsLoading(true);
    try {
      const [productsSnapshot, ordersSnapshot, completedOrdersSnapshot, auctionsSnapshot] = await Promise.all([
        getDocs(query(collection(db, "products"), where("sellerId", "==", sellerId))),
        getDocs(query(collection(db, "orders"), where("sellerId", "==", sellerId), where("status", "==", "pending"))),
        getDocs(query(collection(db, "products"), where("sellerId", "==", sellerId), where("status", "==", "completed"))),
        getDocs(query(collection(db, "auctions"), where("sellerId", "==", sellerId))),
      ]);

      const productsData: Product[] = productsSnapshot.docs.map((doc) => ({
        id: doc.id,
        title: doc.data().title || "",
        description: doc.data().description || "",
        imageUrl: doc.data().imageUrl || "https://placehold.co/150x150",
        category: doc.data().category || "",
        size: doc.data().size || "",
        sellerId: doc.data().sellerId || "",
        sellerEmail: doc.data().sellerEmail || "",
        createdAt: doc.data().createdAt ? new Date(doc.data().createdAt) : null,
        price: Number(doc.data().price) || 0,
        stock: Number(doc.data().stock) || 0,
      }));

      const pendingCount = ordersSnapshot.docs.length;
      const totalSales = completedOrdersSnapshot.docs.reduce(
        (total, order) => total + (Number(order.data().total) || 0),
        0
      );
      const activeAuctions = auctionsSnapshot.docs.length;

      setData({
        products: productsData,
        stats: {
          totalListings: productsData.length,
          totalSales,
          pendingShipments: pendingCount,
          activeAuctions,
        },
      });
    } catch (error: any) {
      console.error("Error fetching seller data:", error.message, error.code);
      toast({
        title: "Error",
        description: "Failed to load seller data: " + error.message,
        variant: "destructive",
      });
      setData({
        products: [],
        stats: { totalListings: 0, totalSales: 0, pendingShipments: 0, activeAuctions: 0 },
      });
    } finally {
      setIsLoading(false);
    }
  }, [sellerId, toast]);

  return { data, isLoading, fetchSellerData };
};

const useAuctionBids = (sellerId: string) => {
  const [newBidsCount, setNewBidsCount] = useState<number>(0);

  useEffect(() => {
    if (!sellerId) return;

    const auctionsQuery = query(collection(db, "auctions"), where("sellerId", "==", sellerId));
    const unsubscribe = onSnapshot(auctionsQuery, async (snapshot) => {
      const auctions = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Auction));
      let totalNewBids = 0;
      const bidPromises = auctions.map(async (auction) => {
        const bidsRef = collection(db, "auctions", auction.id, "bids");
        const bidsSnapshot = await getDocs(bidsRef);
        return bidsSnapshot.docs.length;
      });

      const bidCounts = await Promise.all(bidPromises);
      totalNewBids = bidCounts.reduce((sum, count) => sum + count, 0);
      setNewBidsCount(totalNewBids);
    });

    return () => unsubscribe();
  }, [sellerId]);

  return { newBidsCount };
};

const SellerDashboard: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [userId, setUserId] = useState<string>("");
  const [sellerImage, setSellerImage] = useState<string>("");

  const { data, isLoading, fetchSellerData } = useSellerData(userId, toast);
  const { newBidsCount } = useAuctionBids(userId);

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
      setSellerImage(user.photoURL || "https://placehold.co/150x150");
      await fetchSellerData();
    });

    return () => unsubscribe();
  }, [navigate, toast, fetchSellerData]);

  const formatCurrency = (amount: number): string => `Nrs ${(amount || 0).toFixed(2)}`;
  const toggleMobileMenu = () => setIsMobileMenuOpen((prev) => !prev);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <main className="flex-1 flex flex-row">
        <aside className={`sidebar ${isMobileMenuOpen ? "mobile-open" : ""}`}>
          <div className="sidebar-header">
            <h2 className="sidebar-title">Seller Dashboard</h2>
            <img src={sellerImage} alt="Seller Profile" className="seller-image" />
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
              to="/seller/my-auctions"
              className={({ isActive }) => (isActive ? "menu-link active" : "menu-link")}
            >
              <div className="flex items-center">
                <i className="fa fa-gavel"></i> My Auctions
                {newBidsCount > 0 && (
                  <span className="new-bids-dot" title={`${newBidsCount} new bids`}></span>
                )}
              </div>
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
          <div className="dashboard-container">
            {isLoading ? (
              <div className="loading-spinner">Loading...</div>
            ) : (
              <Outlet
                context={{ stats: data.stats, products: data.products, isLoadingData: isLoading, fetchSellerData, formatCurrency, userId }}
              />
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default SellerDashboard;