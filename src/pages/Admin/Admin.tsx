import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { collection, getDocs, updateDoc, doc, deleteDoc, query, where, getDoc, setDoc } from "firebase/firestore";
import { updateProfile, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import "./AdminPanel.css";

const Admin = () => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [auctions, setAuctions] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [view, setView] = useState<"dashboard" | "consumers" | "sellers" | "products" | "auctions" | "profile">("dashboard");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [profileImage, setProfileImage] = useState<string>("");
  const [newImageUrl, setNewImageUrl] = useState<string>("");
  const [isEditing, setIsEditing] = useState<boolean>(false);
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
          setProfileImage(userData.profileImage || user.photoURL || "https://via.placeholder.com/150");
        } else {
          const generatedName = generateDefaultName(user.email);
          await setDoc(userDocRef, { fullName: generatedName, profileImage: "", role: "admin" });
          setName(generatedName);
          setProfileImage("https://via.placeholder.com/150");
        }

        try {
          await Promise.all([fetchUsers(), fetchProducts(), fetchAuctions(), fetchAnalytics()]);
        } catch (err) {
          setError("Failed to load admin data. Please try again.");
          console.error("Error in admin data fetch:", err);
        } finally {
          setLoading(false);
        }
      } else {
        navigate("/");
      }
    };
    checkAdmin();
  }, [navigate]);

  const generateDefaultName = (email: string | null): string => {
    return email ? email.split("@")[0].replace(/[\._-]/g, " ") : "Admin";
  };

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const userList = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setUsers(userList);
    } catch (error) {
      console.error("Error fetching users:", error);
      throw error;
    }
  };

  const fetchProducts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "products"));
      const productList = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setProducts(productList);
    } catch (error) {
      console.error("Error fetching products:", error);
      throw error;
    }
  };

  const fetchAuctions = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "auctions"));
      const auctionList = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setAuctions(auctionList);
    } catch (error) {
      console.error("Error fetching auctions:", error);
      throw error;
    }
  };

  const fetchAnalytics = async () => {
    try {
      const purchasesSnapshot = await getDocs(collection(db, "purchases"));
      const totalSales = purchasesSnapshot.docs.length;
      const totalRevenue = purchasesSnapshot.docs.reduce((sum, doc) => sum + Number(doc.data().price || 0), 0);

      const auctionsQuery = query(collection(db, "auctions"), where("status", "==", "upcoming"));
      const auctionsSnapshot = await getDocs(auctionsQuery);
      const activeAuctions = auctionsSnapshot.docs.length;

      const analyticsData = [
        { name: "Total Sales", count: totalSales },
        { name: "Total Revenue", count: totalRevenue },
        { name: "Active Auctions", count: activeAuctions },
        { name: "Registered Users", count: users.length },
      ];
      setAnalytics(analyticsData);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      throw error;
    }
  };

  const handleBanUser = async (userId: string) => {
    try {
      await updateDoc(doc(db, "users", userId), { banned: true });
      toast({ title: "User Banned", description: "The user has been banned successfully." });
      fetchUsers();
    } catch (error) {
      console.error("Error banning user:", error);
      toast({ title: "Error", description: "Failed to ban user.", variant: "destructive" });
    }
  };

  const handleUnbanUser = async (userId: string) => {
    try {
      await updateDoc(doc(db, "users", userId), { banned: false });
      toast({ title: "User Unbanned", description: "The user has been unbanned successfully." });
      fetchUsers();
    } catch (error) {
      console.error("Error unbanning user:", error);
      toast({ title: "Error", description: "Failed to unban user.", variant: "destructive" });
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        await deleteDoc(doc(db, "products", productId));
        toast({ title: "Product Deleted", description: "The product has been deleted successfully." });
        fetchProducts();
      } catch (error) {
        console.error("Error deleting product:", error);
        toast({ title: "Error", description: "Failed to delete product.", variant: "destructive" });
      }
    }
  };

  const handleDeleteAuction = async (auctionId: string) => {
    if (window.confirm("Are you sure you want to delete this auction?")) {
      try {
        await deleteDoc(doc(db, "auctions", auctionId));
        toast({ title: "Auction Deleted", description: "The auction has been deleted successfully." });
        fetchAuctions();
      } catch (error) {
        console.error("Error deleting auction:", error);
        toast({ title: "Error", description: "Failed to delete auction.", variant: "destructive" });
      }
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setNewImageUrl(profileImage);
  };

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setLoading(true);

    try {
      const imageURL = newImageUrl || profileImage;
      await updateProfile(auth.currentUser, { displayName: name, photoURL: imageURL });
      await setDoc(doc(db, "users", auth.currentUser.uid), { fullName: name, profileImage: imageURL }, { merge: true });

      setProfileImage(imageURL);
      toast({ title: "Profile Updated!", description: "Your changes have been saved." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsEditing(false);
      setLoading(false);
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
        <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
        <span className="ml-4 text-white">Loading admin data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-red-500">
        {error}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="admin-page"
    >
      <div className="admin-container">
        <aside className="sidebar">
          <h2>BidNThrift Admin</h2>
          <ul>
            <li onClick={() => setView("dashboard")}>Dashboard</li>
            <li onClick={() => setView("consumers")}>Consumer Management</li>
            <li onClick={() => setView("sellers")}>Seller Management</li>
            <li onClick={() => setView("products")}>Product Management</li>
            <li onClick={() => setView("auctions")}>Auction Oversight</li>
            <li onClick={() => setView("profile")}>Profile</li>
          </ul>
        </aside>
        <main className="content">
          {view === "dashboard" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <h1>Dashboard</h1>
              {analytics.length > 0 ? (
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
                <p className="no-data">No analytics data available.</p>
              )}
            </motion.div>
          )}

          {view === "consumers" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <h1>Consumer Management</h1>
              {users.filter((user) => user.role === "consumer").length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Full Name</th>
                      <th>Purchases</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users
                      .filter((user) => user.role === "consumer")
                      .map((user) => (
                        <tr key={user.id}>
                          <td>{user.email}</td>
                          <td>{user.fullName}</td>
                          <td>{user.purchasesCount || 0}</td>
                          <td>{user.banned ? "Banned" : "Active"}</td>
                          <td>
                            {user.banned ? (
                              <Button
                                onClick={() => handleUnbanUser(user.id)}
                                className="unban-btn bg-green-600 hover:bg-green-700"
                              >
                                Unban
                              </Button>
                            ) : (
                              <Button
                                onClick={() => handleBanUser(user.id)}
                                className="ban-btn bg-red-600 hover:bg-red-700"
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
                <p className="no-data">No consumers found.</p>
              )}
            </motion.div>
          )}

          {view === "sellers" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <h1>Seller Management</h1>
              {users.filter((user) => user.role === "seller").length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Full Name</th>
                      <th>Listings</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users
                      .filter((user) => user.role === "seller")
                      .map((user) => (
                        <tr key={user.id}>
                          <td>{user.email}</td>
                          <td>{user.fullName}</td>
                          <td>{user.listingsCount || 0}</td>
                          <td>{user.banned ? "Banned" : "Active"}</td>
                          <td>
                            {user.banned ? (
                              <Button
                                onClick={() => handleUnbanUser(user.id)}
                                className="unban-btn bg-green-600 hover:bg-green-700"
                              >
                                Unban
                              </Button>
                            ) : (
                              <Button
                                onClick={() => handleBanUser(user.id)}
                                className="ban-btn bg-red-600 hover:bg-red-700"
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
                <p className="no-data">No sellers found.</p>
              )}
            </motion.div>
          )}

          {view === "products" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <h1>Product Management</h1>
              {products.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Seller</th>
                      <th>Price</th>
                      <th>Type</th>
                      <th>Stock</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id}>
                        <td>{product.title}</td>
                        <td>{product.seller}</td>
                        <td>
                          $
                          {typeof product.price === "number"
                            ? product.price.toFixed(2)
                            : product.price}
                        </td>
                        <td>{product.isAuction ? "Auction" : "Direct Sale"}</td>
                        <td>{product.stock}</td>
                        <td>
                          <Button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="delete-btn bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="no-data">No products found.</p>
              )}
            </motion.div>
          )}

          {view === "auctions" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <h1>Auction Oversight</h1>
              <div className="flex justify-end mb-4">
                <Button
                  onClick={() => navigate("/setauction")}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all duration-300"
                >
                  Set Auction
                </Button>
              </div>
              {auctions.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Starting Price</th>
                      <th>End Time</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auctions.map((auction) => (
                      <tr key={auction.id}>
                        <td>{auction.title}</td>
                        <td>${typeof auction.price === "number" ? auction.price.toFixed(2) : auction.price}</td>
                        <td>{new Date(auction.endTime).toLocaleString()}</td>
                        <td>{auction.status}</td>
                        <td>
                          <Button
                            onClick={() => handleDeleteAuction(auction.id)}
                            className="delete-btn bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="no-data">No auctions found.</p>
              )}
            </motion.div>
          )}

          {view === "profile" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="profile-section"
            >
              <h1>Admin Profile</h1>
              <div className="profile-content">
                <img src={profileImage} alt="Admin Profile" className="profile-image" />
                <div className="profile-details">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="profile-edit">
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={!isEditing}
                      className="profile-input"
                    />
                    {!isEditing ? (
                      <Button variant="outline" size="icon" onClick={handleEdit} className="edit-btn">
                        <Pencil className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button onClick={handleSave} disabled={loading} className="save-btn">
                        {loading ? "Saving..." : "Save"}
                      </Button>
                    )}
                  </div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} disabled className="profile-input" />
                  {isEditing && (
                    <>
                      <Label htmlFor="imageUrl">Profile Image URL</Label>
                      <Input
                        id="imageUrl"
                        type="text"
                        value={newImageUrl}
                        onChange={(e) => setNewImageUrl(e.target.value)}
                        placeholder="Paste image URL here"
                        className="profile-input"
                      />
                    </>
                  )}
                  <Button onClick={handleLogout} className="logout-btn" disabled={loading}>
                    Logout
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </main>
      </div>
    </motion.div>
  );
};

export default Admin;