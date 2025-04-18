import { useEffect, useState } from "react";
import { useNavigate, NavLink, Outlet, useLocation } from "react-router-dom";
import { auth, db } from "../firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import Footer from "@/components/Footer";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import "./UserDetails.css";
import ProfileSection from "./Profile";

interface Purchase {
  id: string;
  productId: string;
  title: string;
  price: number;
  purchaseDate: string;
}

interface CartItem {
  id: string;
  productId: string;
  title: string;
  price: number;
  quantity: number;
}

interface Favorite {
  id: string;
  title: string;
}

interface ProfileData {
  fullName: string;
  email: string;
  profileImage: string;
}

const UserDetails: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (!authUser) {
        navigate("/login");
        return;
      }

      setUser(authUser);
      await fetchUserData(authUser.uid);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (location.pathname === "/user-details" || location.pathname === "/user-details/") {
      navigate("/user-details/profile", { replace: true });
    }
  }, [location, navigate]);

  const fetchUserData = async (uid: string) => {
    try {
      console.log("Fetching data for UID:", uid);
      // Fetch user profile
      const userDocRef = doc(db, "users", uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setProfile({
          fullName: userData.fullName || auth.currentUser?.displayName || "Unknown",
          email: auth.currentUser?.email || "",
          profileImage: userData.profileImage || auth.currentUser?.photoURL || "https://placehold.co/150x150",
        });
      } else {
        setProfile({
          fullName: auth.currentUser?.displayName || "Unknown",
          email: auth.currentUser?.email || "",
          profileImage: "https://placehold.co/150x150",
        });
      }

      // Fetch purchases
      const purchasesQuery = query(collection(db, "purchases"), where("buyerId", "==", uid));
      const purchasesSnapshot = await getDocs(purchasesQuery);
      const purchasesData = purchasesSnapshot.docs.map((doc) => ({
        id: doc.id,
        productId: doc.data().productId,
        title: doc.data().title,
        price: Number(doc.data().price),
        purchaseDate: doc.data().purchaseDate,
      }));
      setPurchases(purchasesData);

      // Fetch cart items
      const cartQuery = query(collection(db, "cart"), where("userId", "==", uid));
      const cartSnapshot = await getDocs(cartQuery);
      const cartData = cartSnapshot.docs.map((doc) => ({
        id: doc.id,
        productId: doc.data().productId,
        title: doc.data().title,
        price: Number(doc.data().price),
        quantity: doc.data().quantity || 1,
      }));
      setCartItems(cartData);

      // Fetch favorites
      const savedFavorites = localStorage.getItem("favorites");
      if (savedFavorites) {
        const favoriteIds = JSON.parse(savedFavorites);
        const favoritesData: Favorite[] = [];
        for (const id of favoriteIds) {
          const productDoc = await getDoc(doc(db, "products", id));
          if (productDoc.exists()) {
            favoritesData.push({ id, title: productDoc.data().title || "Unknown" });
          }
        }
        setFavorites(favoritesData);
      }
    } catch (error: any) {
      console.error("Error fetching user data:", error.message, error.code);
      setProfile({
        fullName: auth.currentUser?.displayName || "Unknown",
        email: auth.currentUser?.email || "",
        profileImage: "https://placehold.co/150x150",
      });
      setPurchases([]);
      setCartItems([]);
      setFavorites([]);
    }
  };

  const toggleMobileMenu = () => setIsMobileMenuOpen((prev) => !prev);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex justify-center items-center">
          <Loader2 className="animate-spin w-8 h-8 text-teal-600" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="p-4 bg-gray-100 flex justify-between items-center">
        <h1 className="text-xl font-bold">User Dashboard</h1>
        <Button
          onClick={() => navigate("/")}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Go Home
        </Button>
      </header>
      <main className="flex-1 flex flex-row">
        <aside className={`sidebar ${isMobileMenuOpen ? "mobile-open" : ""}`}>
          <div className="sidebar-header">
            <h2 className="sidebar-title">User Details</h2>
            <img
              src={profile?.profileImage || "https://placehold.co/150x150"}
              alt="User Profile"
              className="seller-image"
            />
            <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
              <i className={`fa ${isMobileMenuOpen ? "fa-times" : "fa-bars"}`}></i>
            </button>
          </div>
          <nav className="sidebar-nav">
            <NavLink
              to="profile"
              className={({ isActive }) => (isActive ? "menu-link active" : "menu-link")}
            >
              <i className="fa fa-user"></i> Profile
            </NavLink>
            <NavLink
              to="purchases"
              className={({ isActive }) => (isActive ? "menu-link active" : "menu-link")}
            >
              <i className="fa fa-shopping-bag"></i> Purchased Products
            </NavLink>
            <NavLink
              to="cart"
              className={({ isActive }) => (isActive ? "menu-link active" : "menu-link")}
            >
              <i className="fa fa-shopping-cart"></i> Cart Items
            </NavLink>
            <NavLink
              to="favorites"
              className={({ isActive }) => (isActive ? "menu-link active" : "menu-link")}
            >
              <i className="fa fa-heart"></i> Favorites
            </NavLink>
          </nav>
        </aside>
        <section className="content">
          <Outlet context={{ profile, purchases, cartItems, favorites, navigate }} />
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default UserDetails;