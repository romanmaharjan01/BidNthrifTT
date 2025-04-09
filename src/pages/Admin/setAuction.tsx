import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";

const SetAuction = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [startingPrice, setStartingPrice] = useState("");
  const [auctionDate, setAuctionDate] = useState("");
  const [auctionTime, setAuctionTime] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdmin = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate("/login");
        return;
      }

      try {
        await user.getIdToken(true);
        const decodedToken = await user.getIdTokenResult();
        if (decodedToken.claims.admin) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
          navigate("/");
        }
      } catch (err) {
        setError("Failed to verify admin status. Please try again.");
        console.error("Error verifying admin status:", err);
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [navigate]);

  const handleAuctionSubmit = async () => {
    if (!title || !description || !imageUrl || !startingPrice || !auctionDate || !auctionTime) {
      setError("All fields are required!");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const endTime = new Date(`${auctionDate}T${auctionTime}`).toISOString();

      await addDoc(collection(db, "auctions"), {
        title,
        description,
        imageUrl,
        price: Number(startingPrice),
        endTime,
        status: "upcoming",
      });

      alert("Auction added successfully!");
      navigate("/admin");
    } catch (err) {
      setError("Failed to add auction. Please try again.");
      console.error("Error adding auction:", err);
    } finally {
      setLoading(false);
    }
  };

  if (isAdmin === null || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-100 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-100 text-gray-900 flex flex-col">
      <div className="container mx-auto py-12 px-4 flex-grow max-w-3xl">
        <div className="mb-6">
          <button 
            onClick={() => navigate("/admin")} 
            className="flex items-center text-gray-600 border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-200 transition-colors duration-300"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Admin Panel
          </button>
        </div>

        <motion.h2
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-4xl md:text-5xl font-extrabold text-center mb-10 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-500 border-b border-gray-300 pb-4"
        >
          Set Up a New Auction
        </motion.h2>

        {error && (
          <div className="max-w-md mx-auto mb-6 p-3 rounded-lg bg-red-100 border border-red-300 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <div>
              <div className="font-semibold text-red-600">Error</div>
              <div className="text-sm text-red-500">{error}</div>
            </div>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md border border-gray-200"
        >
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="block text-gray-700 mb-1 font-medium">
                Product Title
              </label>
              <input
                type="text"
                placeholder="Enter product title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-gray-100 border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-gray-700 mb-1 font-medium">
                Product Description
              </label>
              <textarea
                placeholder="Enter product description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full bg-gray-100 border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 resize-y"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-gray-700 mb-1 font-medium">
                Image URL
              </label>
              <input
                type="text"
                placeholder="Enter image URL"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full bg-gray-100 border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-gray-700 mb-1 font-medium">
                Starting Price ($)
              </label>
              <input
                type="number"
                placeholder="Starting Price"
                value={startingPrice}
                onChange={(e) => setStartingPrice(e.target.value)}
                className="w-full bg-gray-100 border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-gray-700 mb-1 font-medium">
                Auction Date
              </label>
              <input
                type="date"
                value={auctionDate}
                onChange={(e) => setAuctionDate(e.target.value)}
                className="w-full bg-gray-100 border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-gray-700 mb-1 font-medium">
                Auction Time
              </label>
              <input
                type="time"
                value={auctionTime}
                onChange={(e) => setAuctionTime(e.target.value)}
                className="w-full bg-gray-100 border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
              />
            </div>

            <button
              onClick={handleAuctionSubmit}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-3 px-4 rounded-md flex justify-center items-center transition-all duration-300 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Starting Auction...
                </>
              ) : (
                "Start Auction"
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SetAuction;