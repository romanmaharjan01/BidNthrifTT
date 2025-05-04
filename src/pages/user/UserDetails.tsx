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
import Navbar from "@/components/Navbar";
import { User as UserIcon, ShoppingBag, ShoppingCart } from "lucide-react";

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

interface ProfileData {
  fullName: string;
  email: string;
  profileImage: string;
}

const UserDetails: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
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
    } catch (error: any) {
      console.error("Error fetching user data:", error.message, error.code);
      setProfile({
        fullName: auth.currentUser?.displayName || "Unknown",
        email: auth.currentUser?.email || "",
        profileImage: "https://placehold.co/150x150",
      });
      setPurchases([]);
      setCartItems([]);
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
      <Navbar />
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
              className={({ isActive }) =>
                isActive ? "sidebar-link active bg-gray-100 text-black font-semibold" : "sidebar-link"
              }
            >
              <UserIcon className="mr-2 h-4 w-4" />
              Profile
            </NavLink>
            <NavLink
              to="purchases"
              className={({ isActive }) =>
                isActive ? "sidebar-link active bg-gray-100 text-black font-semibold" : "sidebar-link"
              }
            >
              <ShoppingBag className="mr-2 h-4 w-4" />
              Purchases
            </NavLink>
          </nav>
        </aside>
        <section className="content">
          <Outlet context={{ profile, purchases, cartItems, navigate }} />
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default UserDetails;