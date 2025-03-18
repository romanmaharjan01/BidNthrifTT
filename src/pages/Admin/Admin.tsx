import { useEffect, useState } from "react";
import { auth, db } from "../firebase"; // Import Firestore
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import "./AdminPanel.css"; // CSS for styling

const Admin = () => {
  const [isAdmin, setIsAdmin] = useState(null);
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [view, setView] = useState("credentials");
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
        fetchUsers();
        fetchAnalytics();
      } else {
        navigate("/");
      }
    };
    checkAdmin();
  }, [navigate]);

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const userList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(userList);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchAnalytics = async () => {
    // Mock Data (replace with Firestore data if available)
    setAnalytics([
      { name: "Products Sold", count: 120 },
      { name: "Products Bought", count: 95 },
      { name: "Website Visits", count: 3000 }
    ]);
  };

  const handleBanUser = async (userId) => {
    try {
      await updateDoc(doc(db, "users", userId), { banned: true });
      fetchUsers();
    } catch (error) {
      console.error("Error banning user:", error);
    }
  };

  const handleUnbanUser = async (userId) => {
    try {
      await updateDoc(doc(db, "users", userId), { banned: false });
      fetchUsers();
    } catch (error) {
      console.error("Error unbanning user:", error);
    }
  };

  if (isAdmin === null) return <p>Loading...</p>;

  return (
    <div className="admin-container">
      <aside className="sidebar">
        <h2>Admin Panel</h2>
        <ul>
          <li onClick={() => setView("dashboard")}>Dashboard</li>
          <li onClick={() => setView("users")}>Users</li>
        </ul>
      </aside>
      <main className="content">
        {view === "credentials" && <h1>Admin Credentials</h1>}
        {view === "dashboard" && (
          <>
            <h1>Dashboard</h1>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
        {view === "users" && (
          <>
            <h2>User Details</h2>
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Products Sold</th>
                  <th>Products Bought</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>{user.email}</td>
                    <td>{user.productsSold || 0}</td>
                    <td>{user.productsBought || 0}</td>
                    <td>
                      {user.banned ? (
                        <button onClick={() => handleUnbanUser(user.id)} className="unban">Unban</button>
                      ) : (
                        <button onClick={() => handleBanUser(user.id)} className="ban">Ban</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </main>
    </div>
  );
};

export default Admin;
