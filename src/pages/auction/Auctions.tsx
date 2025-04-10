import { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const Auctions = () => {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAuctions = async () => {
      try {
        setLoading(true);
        setError(null);
        const querySnapshot = await getDocs(collection(db, "auctions"));
        const auctionList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAuctions(auctionList);
      } catch (err) {
        setError("Failed to fetch auctions. Please try again later.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAuctions();
  }, []);

  const placeBid = async (id: string, currentBid: number) => {
    const newBid = prompt("Enter your bid:", (currentBid + 1).toString());
    if (newBid && parseFloat(newBid) > currentBid) {
      try {
        const auctionRef = doc(db, "auctions", id);
        await updateDoc(auctionRef, { price: parseFloat(newBid) });
        setAuctions((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, price: parseFloat(newBid) } : item
          )
        );
      } catch (err) {
        setError("Failed to place bid. Please try again.");
        console.error(err);
      }
    } else {
      alert("Please enter a valid bid higher than the current bid.");
    }
  };

  const getTimeRemaining = (endTime: string) => {
    const total = Date.parse(endTime) - Date.now();
    const seconds = Math.floor((total / 1000) % 60);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    return { total, days, hours, minutes, seconds };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <Navbar />
      <div className="container py-12 px-4">
        <motion.h1
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-4xl md:text-5xl font-extrabold text-center mb-10 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600"
        >
          Live Auctions
        </motion.h1>
        {auctions.length === 0 ? (
          <div className="text-center text-gray-400">
            <p className="text-lg">No auctions available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {auctions.map((auction) => {
              const timeRemaining = auction.endTime
                ? getTimeRemaining(auction.endTime)
                : null;
              const isActive = timeRemaining && timeRemaining.total > 0;

              return (
                <motion.div
                  key={auction.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card className="bg-gray-900 border border-gray-700 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                    <CardHeader>
                      <img
                        src={auction.imageUrl}
                        alt={auction.title}
                        className="w-full h-56 object-cover rounded-t-md transition-transform duration-300 hover:scale-105"
                      />
                    </CardHeader>
                    <CardContent className="p-4">
                      <h3 className="text-xl font-bold text-blue-300 truncate">
                        {auction.title}
                      </h3>
                      <p className="text-gray-400 mt-1">
                        Current Bid:{" "}
                        <span className="text-green-400 font-semibold">
                          ${auction.price}
                        </span>
                      </p>
                      {isActive ? (
                        <Badge
                          variant="outline"
                          className="mt-2 bg-red-600 border-none"
                        >
                          {`${timeRemaining.days}d ${timeRemaining.hours}h ${timeRemaining.minutes}m ${timeRemaining.seconds}s`}
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="mt-2">
                          Auction Ended
                        </Badge>
                      )}
                    </CardContent>
                    <CardFooter className="p-4">
                      <Button
                        onClick={() => placeBid(auction.id, auction.price)}
                        disabled={!isActive}
                        className={`w-full font-semibold ${
                          isActive
                            ? "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                            : "bg-gray-600 cursor-not-allowed"
                        } transition-all duration-300`}
                      >
                        {isActive ? "Place a Bid" : "Closed"}
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Auctions;