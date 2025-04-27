import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { collection, onSnapshot, updateDoc, doc, deleteDoc, query, where, getDoc, setDoc } from "firebase/firestore";
import { updateProfile, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Pencil, X } from "lucide-react";
import { motion } from "framer-motion";
import AuctionOversight from "./AuctionOversight";
import "./AdminPanel.css";
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
  const [view, setView] = useState<"dashboard" | "consumers" | "sellers" | "products" | "pending" | "auctions" | "profile">("dashboard");
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
          setProfileImage(userData.profileImage || user.photoURL || "https://via.placeholder.com/150");
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
      const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
        const userList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as User));
        setUsers(userList);
        console.log("Fetched users:", userList);
      }, (error) => {
        console.error("Error fetching users:", error);
        setError("Failed to fetch users.");
      });
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
      const unsubscribe = onSnapshot(collection(db, "auctions"), (snapshot) => {
        const auctionList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Auction));
        setAuctions(auctionList);
      }, (error) => {
        console.error("Error fetching auctions:", error);
        setError("Failed to fetch auctions.");
      });
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
        const unsubscribePurchases = onSnapshot(collection(db, "purchases"), (snapshot) => {
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
        }, (error) => {
          console.error("Error fetching purchases for analytics:", error);
          setError("Failed to fetch purchases for analytics.");
          setIsAnalyticsLoading(false);
        });

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
      await setDoc(doc(db, "users", auth.currentUser.uid), { fullName: name, profileImage: imageURL }, { merge: true });

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
        <span className="ml-4 text-white">Checking admin access...</span>
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
            <li onClick={() => setView("products")} className="relative">
              Product Management
              {pendingProducts.length > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-red-600 rounded-full"></span>
              )}
            </li>
            <li onClick={() => setView("pending")}>Pending Listings</li>
            <li onClick={() => setView("auctions")}>Auction Oversight</li>
            <li onClick={() => setView("profile")}>Profile</li>
          </ul>
        </aside>
        <main className="content">
          {view === "dashboard" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <h1>Dashboard</h1>
              {isAnalyticsLoading ? (
                <p className="no-data">Loading analytics...</p>
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
                        <td>{product.sellerEmail}</td>
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
                <p className="no-data">No approved products found.</p>
              )}
            </motion.div>
          )}

          {view === "pending" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <h1>Pending Listings</h1>
              {pendingProducts.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Seller</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Category</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingProducts.map((product) => (
                      <tr key={product.id}>
                        <td>{product.title}</td>
                        <td>{product.sellerEmail}</td>
                        <td>
                          $
                          {typeof product.price === "number"
                            ? product.price.toFixed(2)
                            : product.price}
                        </td>
                        <td>{product.stock}</td>
                        <td>{product.category}</td>
                        <td>
                          <Button
                            onClick={() => handleApproveProduct(product.id)}
                            className="approve-btn bg-green-600 hover:bg-green-700 mr-2"
                          >
                            Approve
                          </Button>
                          <Button
                            onClick={() => handleRejectProduct(product.id)}
                            className="reject-btn bg-red-600 hover:bg-red-700"
                          >
                            Reject
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="no-data">No pending listings found.</p>
              )}
            </motion.div>
          )}

          {view === "auctions" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <AuctionOversight
                auctions={auctions}
                users={users}
              />
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
                      <Button onClick={handleSave} className="save-btn">
                        Save
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
                  <Button onClick={handleLogout} className="logout-btn">
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
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <Dialog.Title className="text-lg font-semibold">Ban User</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-gray-600">
              Please provide a reason for banning this user.
            </Dialog.Description>
            <div className="mt-4">
              <Label htmlFor="banReason">Reason for Ban</Label>
              <Input
                id="banReason"
                type="text"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Enter ban reason"
                className="mt-1"
              />
            </div>
            <div className="mt-6 flex justify-end space-x-2">
              <Dialog.Close asChild>
                <Button variant="outline" onClick={() => setBanReason("")}>
                  Cancel
                </Button>
              </Dialog.Close>
              <Button
                onClick={confirmBanUser}
                disabled={!banReason}
                className="bg-red-600 hover:bg-red-700"
              >
                Confirm Ban
              </Button>
            </div>
            <Dialog.Close asChild>
              <button className="absolute top-2 right-2 p-1">
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