import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
  deleteDoc,
  query,
  where,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { updateProfile, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Pencil, X } from "lucide-react";
import { motion } from "framer-motion";
import AuctionOversight from "./AuctionOversight";
import * as Dialog from "@radix-ui/react-dialog";

// Define interfaces to align with AuctionOversight
interface Auction {
  id: string;
  title: string;
  price: number;
  endTime: string;
  status: "upcoming" | "active" | "ended" | "sold" | "sold_pending";
  description?: string;
  imageUrl?: string;
  bids?: { userId: string; amount: number; timestamp: string }[];
}

interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  banned?: boolean;
  purchasesCount?: number;
  listingsCount?: number;
}

const Admin = () => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [pendingProducts, setPendingProducts] = useState<any[]>([]);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(true);
  const [view, setView] = useState<
    "dashboard" | "consumers" | "sellers" | "products" | "pending" | "auctions" | "profile"
  >("dashboard");
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [profileImage, setProfileImage] = useState<string>("");
  const [newImageUrl, setNewImageUrl] = useState<string>("");
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [userToBan, setUserToBan] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdmin = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate("/login");
        return;
      }
      await user.getIdToken(true);
      const decodedToken = await user.getIdTokenResult();
      if (decodedToken.claims.admin) {
        setIsAdmin(true);
        setEmail(user.email || "");
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setName(userData.fullName || user.displayName || generateDefaultName(user.email));
          setProfileImage(
            userData.profileImage || user.photoURL || "https://via.placeholder.com/150"
          );
        } else {
          const generatedName = generateDefaultName(user.email);
          await setDoc(userDocRef, { fullName: generatedName, profileImage: "", role: "admin" });
          setName(generatedName);
          setProfileImage("https://via.placeholder.com/150");
        }

        const unsubscribeUsers = fetchUsers();
        const unsubscribeProducts = fetchProducts();
        const unsubscribePendingProducts = fetchPendingProducts();
        const unsubscribeAuctions = fetchAuctions();

        return () => {
          unsubscribeUsers();
          unsubscribeProducts();
          unsubscribePendingProducts();
          unsubscribeAuctions();
        };
      } else {
        navigate("/");
      }
    };
    checkAdmin();
  }, [navigate]);

  const generateDefaultName = (email: string | null): string => {
    return email ? email.split("@")[0].replace(/[\._-]/g, " ") : "Admin";
  };

  const fetchUsers = () => {
    try {
      const unsubscribe = onSnapshot(
        collection(db, "users"),
        (snapshot) => {
          const userList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as User));
          setUsers(userList);
          console.log("Fetched users:", userList);
        },
        (error) => {
          console.error("Error fetching users:", error);
          setError("Failed to fetch users.");
        }
      );
      return unsubscribe;
    } catch (error) {
      console.error("Error setting up users listener:", error);
      setError("Failed to fetch users.");
      return () => {};
    }
  };

  const fetchProducts = () => {
    try {
      const unsubscribe = onSnapshot(
        query(collection(db, "products"), where("status", "==", "approved")),
        (snapshot) => {
          const productList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          setProducts(productList);
        },
        (error) => {
          console.error("Error fetching products:", error);
          setError("Failed to fetch products.");
        }
      );
      return unsubscribe;
    } catch (error) {
      console.error("Error setting up products listener:", error);
      setError("Failed to fetch products.");
      return () => {};
    }
  };

  const fetchPendingProducts = () => {
    try {
      const unsubscribe = onSnapshot(
        query(collection(db, "products"), where("status", "==", "pending")),
        (snapshot) => {
          const pendingList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          setPendingProducts(pendingList);
        },
        (error) => {
          console.error("Error fetching pending products:", error);
          setError("Failed to fetch pending products.");
        }
      );
      return unsubscribe;
    } catch (error) {
      console.error("Error setting up pending products listener:", error);
      setError("Failed to fetch pending products.");
      return () => {};
    }
  };

  const fetchAuctions = () => {
    try {
      const unsubscribe = onSnapshot(
        collection(db, "auctions"),
        (snapshot) => {
          const auctionList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Auction));
          setAuctions(auctionList);
        },
        (error) => {
          console.error("Error fetching auctions:", error);
          setError("Failed to fetch auctions.");
        }
      );
      return unsubscribe;
    } catch (error) {
      console.error("Error setting up auctions listener:", error);
      setError("Failed to fetch auctions.");
      return () => {};
    }
  };

  useEffect(() => {
    const fetchAnalytics = () => {
      try {
        setIsAnalyticsLoading(true);
        const unsubscribePurchases = onSnapshot(
          collection(db, "purchases"),
          (snapshot) => {
            const totalSales = snapshot.docs.length;
            const totalRevenue = snapshot.docs.reduce((sum, doc) => {
              const price = Number(doc.data().price || 0);
              if (isNaN(price)) {
                console.warn(`Invalid price in purchase document ${doc.id}:`, doc.data().price);
                return sum;
              }
              return sum + price;
            }, 0);
            console.log("Purchases snapshot:", { totalSales, totalRevenue });

            const unsubscribeAuctions = onSnapshot(
              query(collection(db, "auctions"), where("status", "==", "upcoming")),
              (auctionsSnapshot) => {
                const activeAuctions = auctionsSnapshot.docs.length;
                console.log("Auctions snapshot:", { activeAuctions });

                const analyticsData = [
                  { name: "Total Sales", count: totalSales },
                  { name: "Total Revenue", count: totalRevenue },
                  { name: "Active Auctions", count: activeAuctions },
                  { name: "Registered Users", count: users.length },
                ];
                console.log("Analytics data:", analyticsData);
                setAnalytics(analyticsData);
                setIsAnalyticsLoading(false);
              },
              (error) => {
                console.error("Error fetching auctions for analytics:", error);
                setError("Failed to fetch auctions for analytics.");
                setIsAnalyticsLoading(false);
              }
            );

            return () => unsubscribeAuctions();
          },
          (error) => {
            console.error("Error fetching purchases for analytics:", error);
            setError("Failed to fetch purchases for analytics.");
            setIsAnalyticsLoading(false);
          }
        );

        return () => unsubscribePurchases();
      } catch (error) {
        console.error("Error setting up analytics listener:", error);
        setError("Failed to fetch analytics.");
        setIsAnalyticsLoading(false);
        return () => {};
      }
    };

    const unsubscribeAnalytics = fetchAnalytics();
    return () => unsubscribeAnalytics();
  }, [users]);

  const handleBanUser = async (userId: string) => {
    setUserToBan(userId);
    setBanDialogOpen(true);
  };

  const confirmBanUser = async () => {
    if (!userToBan || !banReason) return;

    try {
      await updateDoc(doc(db, "users", userToBan), {
        banned: true,
        banReason: banReason,
      });
      toast({ title: "User Banned", description: "The user has been banned successfully." });
      setBanDialogOpen(false);
      setBanReason("");
      setUserToBan(null);
    } catch (error) {
      console.error("Error banning user:", error);
      toast({ title: "Error", description: "Failed to ban user.", variant: "destructive" });
    }
  };

  const handleUnbanUser = async (userId: string) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        banned: false,
        banReason: "",
      });
      toast({ title: "User Unbanned", description: "The user has been unbanned successfully." });
    } catch (error) {
      console.error("Error unbanning user:", error);
      toast({ title: "Error", description: "Failed to unban user.", variant: "destructive" });
    }
  };

  const handleApproveProduct = async (productId: string) => {
    try {
      await updateDoc(doc(db, "products", productId), { status: "approved" });
      toast({ title: "Product Approved", description: "The product has been approved and is now live." });
    } catch (error) {
      console.error("Error approving product:", error);
      toast({ title: "Error", description: "Failed to approve product.", variant: "destructive" });
    }
  };

  const handleRejectProduct = async (productId: string) => {
    try {
      await updateDoc(doc(db, "products", productId), { status: "rejected" });
      toast({ title: "Product Rejected", description: "The product has been rejected." });
    } catch (error) {
      console.error("Error rejecting product:", error);
      toast({ title: "Error", description: "Failed to reject product.", variant: "destructive" });
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        await deleteDoc(doc(db, "products", productId));
        toast({ title: "Product Deleted", description: "The product has been deleted successfully." });
      } catch (error) {
        console.error("Error deleting product:", error);
        toast({ title: "Error", description: "Failed to delete product.", variant: "destructive" });
      }
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setNewImageUrl(profileImage);
  };

  const handleSave = async () => {
    if (!auth.currentUser) return;

    try {
      const imageURL = newImageUrl || profileImage;
      await updateProfile(auth.currentUser, { displayName: name, photoURL: imageURL });
      await setDoc(
        doc(db, "users", auth.currentUser.uid),
        { fullName: name, profileImage: imageURL },
        { merge: true }
      );

      setProfileImage(imageURL);
      toast({ title: "Profile Updated!", description: "Your changes have been saved." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsEditing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Error logging out:", error);
      toast({ title: "Error", description: "Failed to log out. Please try again.", variant: "destructive" });
    }
  };

  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <span className="text-gray-100 text-lg">Checking admin access...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-red-500 text-lg">
        {error}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gray-900 text-gray-100 flex"
    >
      <div className="flex w-full flex-col md:flex-row">
        <aside className="w-full md:w-64 bg-gray-800 p-6 flex-shrink-0">
          <h2 className="text-2xl font-bold text-teal-400 mb-8">BidNThrift Admin</h2>
          <ul className="space-y-4">
            <li
              onClick={() => setView("dashboard")}
              className={`cursor-pointer hover:text-teal-400 transition-colors ${
                view === "dashboard" ? "text-teal-400 font-semibold" : "text-gray-300"
              }`}
            >
              Dashboard
            </li>
            <li
              onClick={() => setView("consumers")}
              className={`cursor-pointer hover:text-teal-400 transition-colors ${
                view === "consumers" ? "text-teal-400 font-semibold" : "text-gray-300"
              }`}
            >
              Consumer Management
            </li>
            <li
              onClick={() => setView("sellers")}
              className={`cursor-pointer hover:text-teal-400 transition-colors ${
                view === "sellers" ? "text-teal-400 font-semibold" : "text-gray-300"
              }`}
            >
              Seller Management
            </li>
            <li
              onClick={() => setView("products")}
              className={`cursor-pointer hover:text-teal-400 transition-colors relative ${
                view === "products" ? "text-teal-400 font-semibold" : "text-gray-300"
              }`}
            >
              Product Management
              {pendingProducts.length > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-red-600 rounded-full"></span>
              )}
            </li>
            <li
              onClick={() => setView("pending")}
              className={`cursor-pointer hover:text-teal-400 transition-colors ${
                view === "pending" ? "text-teal-400 font-semibold" : "text-gray-300"
              }`}
            >
              Pending Listings
            </li>
            <li
              onClick={() => setView("auctions")}
              className={`cursor-pointer hover:text-teal-400 transition-colors ${
                view === "auctions" ? "text-teal-400 font-semibold" : "text-gray-300"
              }`}
            >
              Auction Oversight
            </li>
            <li
              onClick={() => setView("profile")}
              className={`cursor-pointer hover:text-teal-400 transition-colors ${
                view === "profile" ? "text-teal-400 font-semibold" : "text-gray-300"
              }`}
            >
              Profile
            </li>
          </ul>
        </aside>
        <main className="flex-1 p-4 md:p-8 overflow-auto">
          {view === "dashboard" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-3xl font-semibold text-teal-400 mb-6">Dashboard</h1>
              {isAnalyticsLoading ? (
                <p className="text-gray-400 text-center py-8">Loading analytics...</p>
              ) : analytics.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value, name) => (name === "Total Revenue" ? `$${value}` : value)} />
                    <Bar dataKey="count" fill="#00796b" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-400 text-center py-8">No analytics data available.</p>
              )}
            </motion.div>
          )}

          {view === "consumers" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-3xl font-semibold text-teal-400 mb-6">Consumer Management</h1>
              {users.filter((user) => user.role === "consumer").length > 0 ? (
                <table className="w-full border-collapse bg-gray-800 rounded-lg overflow-hidden">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-teal-400 font-medium">Email</th>
                      <th className="px-4 py-3 text-left text-teal-400 font-medium">Full Name</th>
                      <th className="px-4 py-3 text-left text-teal-400 font-medium">Purchases</th>
                      <th className="px-4 py-3 text-left text-teal-400 font-medium">Status</th>
                      <th className="px-4 py-3 text-left text-teal-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users
                      .filter((user) => user.role === "consumer")
                      .map((user) => (
                        <tr
                          key={user.id}
                          className="border-t border-gray-700 hover:bg-gray-750 transition-colors"
                        >
                          <td className="px-4 py-3 text-gray-300">{user.email}</td>
                          <td className="px-4 py-3 text-gray-300">{user.fullName}</td>
                          <td className="px-4 py-3 text-gray-300">{user.purchasesCount || 0}</td>
                          <td className="px-4 py-3 text-gray-300">
                            {user.banned ? "Banned" : "Active"}
                          </td>
                          <td className="px-4 py-3">
                            {user.banned ? (
                              <Button
                                onClick={() => handleUnbanUser(user.id)}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
                              >
                                Unban
                              </Button>
                            ) : (
                              <Button
                                onClick={() => handleBanUser(user.id)}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
                              >
                                Ban
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-400 text-center py-8">No consumers found.</p>
              )}
            </motion.div>
          )}

          {view === "sellers" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-3xl font-semibold text-teal-400 mb-6">Seller Management</h1>
              {users.filter((user) => user.role === "seller").length > 0 ? (
                <table className="w-full border-collapse bg-gray-800 rounded-lg overflow-hidden">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-teal-400 font-medium">Email</th>
                      <th className="px-4 py-3 text-left text-teal-400 font-medium">Full Name</th>
                      <th className="px-4 py-3 text-left text-teal-400 font-medium">Listings</th>
                      <th className="px-4 py-3 text-left text-teal-400 font-medium">Status</th>
                      <th className="px-4 py-3 text-left text-teal-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users
                      .filter((user) => user.role === "seller")
                      .map((user) => (
                        <tr
                          key={user.id}
                          className="border-t border-gray-700 hover:bg-gray-750 transition-colors"
                        >
                          <td className="px-4 py-3 text-gray-300">{user.email}</td>
                          <td className="px-4 py-3 text-gray-300">{user.fullName}</td>
                          <td className="px-4 py-3 text-gray-300">{user.listingsCount || 0}</td>
                          <td className="px-4 py-3 text-gray-300">
                            {user.banned ? "Banned" : "Active"}
                          </td>
                          <td className="px-4 py-3">
                            {user.banned ? (
                              <Button
                                onClick={() => handleUnbanUser(user.id)}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
                              >
                                Unban
                              </Button>
                            ) : (
                              <Button
                                onClick={() => handleBanUser(user.id)}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
                              >
                                Ban
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-400 text-center py-8">No sellers found.</p>
              )}
            </motion.div>
          )}

          {view === "products" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-3xl font-semibold text-teal-400 mb-6">Product Management</h1>
              {products.length > 0 ? (
                <table className="w-full border-collapse bg-gray-800 rounded-lg overflow-hidden">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-teal-400 font-medium">Title</th>
                      <th className="px-4 py-3 text-left text-teal-400 font-medium">Seller</th>
                      <th className="px-4 py-3 text-left text-teal-400 font-medium">Price</th>
                      <th className="px-4 py-3 text-left text-teal-400 font-medium">Type</th>
                      <th className="px-4 py-3 text-left text-teal-400 font-medium">Stock</th>
                      <th className="px-4 py-3 text-left text-teal-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr
                        key={product.id}
                        className="border-t border-gray-700 hover:bg-gray-750 transition-colors"
                      >
                        <td className="px-4 py-3 text-gray-300">{product.title}</td>
                        <td className="px-4 py-3 text-gray-300">{product.sellerEmail}</td>
                        <td className="px-4 py-3 text-gray-300">
                          $
                          {typeof product.price === "number"
                            ? product.price.toFixed(2)
                            : product.price}
                        </td>
                        <td className="px-4 py-3 text-gray-300">
                          {product.isAuction ? "Auction" : "Direct Sale"}
                        </td>
                        <td className="px-4 py-3 text-gray-300">{product.stock}</td>
                        <td className="px-4 py-3">
                          <Button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-400 text-center py-8">No approved products found.</p>
              )}
            </motion.div>
          )}

          {view === "pending" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-3xl font-semibold text-teal-400 mb-6">Pending Listings</h1>
              {pendingProducts.length > 0 ? (
                <table className="w-full border-collapse bg-gray-800 rounded-lg overflow-hidden">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-teal-400 font-medium">Title</th>
                      <th className="px-4 py-3 text-left text-teal-400 font-medium">Seller</th>
                      <th className="px-4 py-3 text-left text-teal-400 font-medium">Price</th>
                      <th className="px-4 py-3 text-left text-teal-400 font-medium">Stock</th>
                      <th className="px-4 py-3 text-left text-teal-400 font-medium">Category</th>
                      <th className="px-4 py-3 text-left text-teal-400 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingProducts.map((product) => (
                      <tr
                        key={product.id}
                        className="border-t border-gray-700 hover:bg-gray-750 transition-colors"
                      >
                        <td className="px-4 py-3 text-gray-300">{product.title}</td>
                        <td className="px-4 py-3 text-gray-300">{product.sellerEmail}</td>
                        <td className="px-4 py-3 text-gray-300">
                          $
                          {typeof product.price === "number"
                            ? product.price.toFixed(2)
                            : product.price}
                        </td>
                        <td className="px-4 py-3 text-gray-300">{product.stock}</td>
                        <td className="px-4 py-3 text-gray-300">{product.category}</td>
                        <td className="px-4 py-3 flex gap-2">
                          <Button
                            onClick={() => handleApproveProduct(product.id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
                          >
                            Approve
                          </Button>
                          <Button
                            onClick={() => handleRejectProduct(product.id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
                          >
                            Reject
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-400 text-center py-8">No pending listings found.</p>
              )}
            </motion.div>
          )}

          {view === "auctions" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <AuctionOversight auctions={auctions} users={users} />
            </motion.div>
          )}

          {view === "profile" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl mx-auto"
            >
              <h1 className="text-3xl font-semibold text-teal-400 mb-6">Admin Profile</h1>
              <div className="flex flex-col md:flex-row gap-8">
                <img
                  src={profileImage}
                  alt="Admin Profile"
                  className="w-32 h-32 rounded-full object-cover border-2 border-teal-400"
                />
                <div className="flex-1 space-y-4">
                  <Label htmlFor="name" className="text-gray-300">
                    Full Name
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={!isEditing}
                      className="w-full bg-gray-700 text-gray-100 border-gray-600 rounded-md px-3 py-2 focus:ring-2 focus:ring-teal-400"
                    />
                    {!isEditing ? (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleEdit}
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        onClick={handleSave}
                        className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md"
                      >
                        Save
                      </Button>
                    )}
                  </div>
                  <Label htmlFor="email" className="text-gray-300">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                    className="w-full bg-gray-700 text-gray-100 border-gray-600 rounded-md px-3 py-2"
                  />
                  {isEditing && (
                    <>
                      <Label htmlFor="imageUrl" className="text-gray-300">
                        Profile Image URL
                      </Label>
                      <Input
                        id="imageUrl"
                        type="text"
                        value={newImageUrl}
                        onChange={(e) => setNewImageUrl(e.target.value)}
                        placeholder="Paste image URL here"
                        className="w-full bg-gray-700 text-gray-100 border-gray-600 rounded-md px-3 py-2 focus:ring-2 focus:ring-teal-400"
                      />
                    </>
                  )}
                  <Button
                    onClick={handleLogout}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md mt-4"
                  >
                    Logout
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </main>
      </div>

      <Dialog.Root open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
            <Dialog.Title className="text-lg font-semibold text-teal-400">Ban User</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-gray-400">
              Please provide a reason for banning this user.
            </Dialog.Description>
            <div className="mt-4">
              <Label htmlFor="banReason" className="text-gray-300">
                Reason for Ban
              </Label>
              <Input
                id="banReason"
                type="text"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Enter ban reason"
                className="mt-1 w-full bg-gray-700 text-gray-100 border-gray-600 rounded-md px-3 py-2 focus:ring-2 focus:ring-teal-400"
              />
            </div>
            <div className="mt-6 flex justify-end space-x-2">
              <Dialog.Close asChild>
                <Button
                  variant="outline"
                  onClick={() => setBanReason("")}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </Button>
              </Dialog.Close>
              <Button
                onClick={confirmBanUser}
                disabled={!banReason}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
              >
                Confirm Ban
              </Button>
            </div>
            <Dialog.Close asChild>
              <button className="absolute top-2 right-2 p-1 text-gray-400 hover:text-teal-400">
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </motion.div>
  );
};

export default Admin;