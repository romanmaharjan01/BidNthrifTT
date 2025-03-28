import { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

const Auctions = () => {
  const [auctions, setAuctions] = useState([]);

  useEffect(() => {
    const fetchAuctions = async () => {
      const querySnapshot = await getDocs(collection(db, "auctions"));
      const auctionList = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setAuctions(auctionList);
    };

    fetchAuctions();
  }, []);

  const placeBid = async (id, currentBid) => {
    const newBid = prompt("Enter your bid:", (currentBid + 1).toString());
    if (newBid && parseFloat(newBid) > currentBid) {
      const auctionRef = doc(db, "auctions", id);
      await updateDoc(auctionRef, { price: parseFloat(newBid) });
      setAuctions((prev) =>
        prev.map((item) => (item.id === id ? { ...item, price: parseFloat(newBid) } : item))
      );
    }
  };

  const getTimeRemaining = (endTime) => {
    const total = Date.parse(endTime) - Date.now();
    const seconds = Math.floor((total / 1000) % 60);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    return { total, days, hours, minutes, seconds };
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="container py-8">
        <h1 className="text-3xl font-bold text-center mb-6">Live Auctions</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {auctions.map((auction) => {
            const timeRemaining = auction.endTime ? getTimeRemaining(auction.endTime) : null;
            return (
              <div
                key={auction.id}
                className="bg-white p-4 shadow-lg rounded-lg transition-transform transform hover:scale-105 hover:shadow-xl"
              >
                <img src={auction.imageUrl} alt={auction.title} className="w-full h-48 object-cover rounded-md" />
                <h3 className="text-lg font-bold mt-2">{auction.title}</h3>
                <p className="text-gray-600">Current Bid: ${auction.price}</p>
                {timeRemaining && timeRemaining.total > 0 ? (
                  <p className="text-red-500">
                    Time Left: {timeRemaining.days}d {timeRemaining.hours}h {timeRemaining.minutes}m {timeRemaining.seconds}s
                  </p>
                ) : (
                  <p className="text-red-500">Auction Ended</p>
                )}
                <Button
                  onClick={() => placeBid(auction.id, auction.price)}
                  className="mt-3 w-full bg-blue-600 hover:bg-blue-700"
                >
                  Place a Bid
                </Button>
              </div>
            );
          })}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Auctions;
