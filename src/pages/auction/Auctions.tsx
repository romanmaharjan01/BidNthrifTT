import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
} from "firebase/auth";
import { db, auth } from "../firebase";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import BidModal from "./BidModal";
import { toast } from "sonner";

// Define the Auction interface
interface Auction {
  id: string;
  title: string;
  price: number;
  imageUrl: string;
  endTime: string;
  status: string;
  sellerId?: string; // Added to identify the seller
  unsubscribe?: () => void; // For the onSnapshot unsubscribe function
}

const Auctions = () => {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const ensureAuthenticated = () => {
      onAuthStateChanged(auth, async (user) => {
        if (!user) {
          try {
            await signInAnonymously(auth);
            console.log("Signed in anonymously");
            setCurrentUserId(null);
            fetchAuctions();
          } catch (err) {
            console.error("Anonymous sign-in failed", err);
            setError("Authentication failed. Please try again.");
            setLoading(false);
          }
        } else {
          console.log("User signed in:", user.uid);
          setCurrentUserId(user.uid);
          fetchAuctions();
        }
      });
    };

    const fetchAuctions = async () => {
      try {
        setLoading(true);
        setError(null);
        const querySnapshot = await getDocs(collection(db, "auctions"));
        const auctionList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Auction[];

        // Set up real-time listeners for each auction
        const auctionListWithListeners = auctionList
          .filter((auction) => {
            // Keep auctions that haven't ended yet or ended recently
            return (
              !auction.endTime ||
              new Date(auction.endTime).getTime() > Date.now() ||
              (auction.status === "ended" &&
                new Date(auction.endTime).getTime() >
                  Date.now() - 60 * 60 * 1000)
            );
          })
          .map((auction) => {
            // Listener for bids
            const bidsQuery = query(
              collection(db, "auctions", auction.id, "bids"),
              orderBy("timestamp", "desc")
            );
            const unsubscribeBids = onSnapshot(bidsQuery, (snapshot) => {
              const highestBid = snapshot.docs[0]?.data()?.amount || auction.price;
              setAuctions((prev) =>
                prev.map((item) =>
                  item.id === auction.id ? { ...item, price: highestBid } : item
                )
              );
            });

            // Listener for auction status
            const auctionRef = doc(db, "auctions", auction.id);
            const unsubscribeStatus = onSnapshot(auctionRef, (docSnapshot) => {
              if (docSnapshot.exists()) {
                const updatedAuction = {
                  id: docSnapshot.id,
                  ...docSnapshot.data(),
                } as Auction;
                setAuctions((prev) =>
                  prev.map((item) =>
                    item.id === auction.id
                      ? { ...item, status: updatedAuction.status }
                      : item
                  )
                );
              }
            });

            return {
              ...auction,
              unsubscribe: () => {
                unsubscribeBids();
                unsubscribeStatus();
              },
            };
          });

        setAuctions(auctionListWithListeners);
      } catch (err) {
        setError("Failed to fetch auctions. Please try again later.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    ensureAuthenticated();

    return () => {
      auctions.forEach((auction) => {
        if (auction.unsubscribe) auction.unsubscribe();
      });
    };
  }, []);

  // Handle manual auction ending by seller
  const handleEndAuction = async (auctionId: string) => {
    try {
      const auctionRef = doc(db, "auctions", auctionId);
      await updateDoc(auctionRef, { status: "ended", endTime: new Date().toISOString() });
      console.log(`Auction ${auctionId} ended by seller`);
    } catch (err) {
      console.error("Error ending auction:", err);
      setError("Failed to end auction. Please try again.");
    }
  };

  // Update auction status and filter ended auctions
  useEffect(() => {
    const intervalId = setInterval(() => {
      setAuctions((prevAuctions) => {
        const updatedAuctions = prevAuctions.map((auction) => {
          if (
            auction.endTime &&
            new Date(auction.endTime).getTime() <= Date.now() &&
            auction.status !== "ended"
          ) {
            try {
              const auctionRef = doc(db, "auctions", auction.id);
              updateDoc(auctionRef, { status: "ended" }).catch((err) => {
                console.error("Error updating auction status:", err);
              });
              return { ...auction, status: "ended" };
            } catch (err) {
              console.error("Error updating auction status:", err);
              return auction;
            }
          }
          return auction;
        });

        // Filter out ended auctions (keep recently ended for 1 hour)
        return updatedAuctions.filter((auction) => {
          const endTime = auction.endTime
            ? new Date(auction.endTime).getTime()
            : Infinity;
          const oneHourAgo = Date.now() - 60 * 60 * 1000;
          return (
            auction.status !== "ended" ||
            (endTime <= Date.now() && endTime > oneHourAgo)
          );
        });
      });
    }, 30000); // Check every 30 seconds

    return () => clearInterval(intervalId);
  }, []);

  const handlePlaceBid = async (id: string, newBid: number, currentBid: number) => {
  if (newBid <= currentBid) {
    setError("Please enter a bid higher than the current bid.");
    return;
  }

  try {
    if (!auth.currentUser) {
      setError("Please sign in to place a bid.");
      return;
    }

    const bidsQuery = query(
      collection(db, "auctions", id, "bids"),
      orderBy("amount", "desc")
    );
    const bidsSnapshot = await getDocs(bidsQuery);
    const previousHighestBid = bidsSnapshot.docs[0]?.data();

    const bidData = {
      userId: auth.currentUser.uid,
      amount: newBid,
      timestamp: new Date().toISOString(),
    };

    await addDoc(collection(db, "auctions", id, "bids"), bidData);

    if (previousHighestBid && previousHighestBid.userId !== auth.currentUser.uid) {
      const auctionDoc = await getDoc(doc(db, "auctions", id));
      const auction = auctionDoc.data() as Auction;
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      const bidderName = userDoc.exists()
        ? userDoc.data().fullName || userDoc.data().email || "Another Bidder"
        : "Another Bidder";

      const outbidNotification = {
        userId: previousHighestBid.userId,
        type: "outbid",
        message: `You have been outbid on ${auction.title}! ${bidderName} placed a bid of $${newBid.toFixed(2)}. Place a higher bid now.`,
        auctionId: id,
        timestamp: new Date().toISOString(),
        status: "unread",
        actionUrl: `/auctions#${id}`,
      };
      console.log("Sending outbid notification from handlePlaceBid with userId:", previousHighestBid.userId, outbidNotification);
      await addDoc(collection(db, "notifications"), outbidNotification);
    }

    setSelectedAuction(null);
    toast(
      <>
        <div className="font-bold">Bid Placed</div>
        <div>Your bid of ${newBid.toFixed(2)} has been placed successfully.</div>
      </>
    );
  } catch (err: any) {
    console.error("Error placing bid:", err);
    if (err.code === "permission-denied") {
      setError("Cannot place bid. The auction may have ended or you lack permission.");
    } else {
      setError("Failed to place bid: " + err.message);
    }
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
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
          <div className="text-center text-gray-600">
            <p className="text-lg">No auctions available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {auctions.map((auction) => {
              const timeRemaining = auction.endTime
                ? getTimeRemaining(auction.endTime)
                : null;
              const isActive =
                auction.status !== "ended" && timeRemaining && timeRemaining.total > 0;
              const isSeller = currentUserId && auction.sellerId === currentUserId;

              return (
                <motion.div
                  key={auction.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card
                    className={`bg-white border shadow-xl transition-shadow duration-300 ${
                      !isActive
                        ? "border-red-300 opacity-70 bg-gray-100"
                        : "border-gray-200 hover:shadow-2xl"
                    }`}
                  >
                    <CardHeader>
                      <img
                        src={auction.imageUrl}
                        alt={auction.title}
                        className={`w-full h-56 object-cover rounded-t-md transition-transform duration-300 ${
                          !isActive ? "grayscale" : "hover:scale-105"
                        }`}
                      />
                    </CardHeader>
                    <CardContent className="p-4">
                      <h3
                        className={`text-xl font-bold truncate ${
                          !isActive ? "text-gray-500" : "text-blue-600"
                        }`}
                      >
                        {auction.title}
                      </h3>
                      <p className="text-gray-600 mt-1">
                        Current Bid:{" "}
                        <span
                          className={`font-semibold ${
                            !isActive ? "text-gray-500" : "text-green-600"
                          }`}
                        >
                          ${auction.price}
                        </span>
                      </p>
                      {isActive ? (
                        <Badge
                          variant="outline"
                          className="mt-2 bg-red-100 text-red-600 border-none"
                        >
                          {`${timeRemaining.days}d ${timeRemaining.hours}h ${timeRemaining.minutes}m ${timeRemaining.seconds}s`}
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="mt-2">
                          Auction Ended
                        </Badge>
                      )}
                    </CardContent>
                    <CardFooter className="p-4 flex flex-col space-y-2">
                      <Button
                        onClick={() => setSelectedAuction(auction)}
                        disabled={!isActive}
                        className={`w-full font-semibold ${
                          isActive
                            ? "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                            : "bg-gray-400 cursor-not-allowed text-gray-700"
                        } transition-all duration-300`}
                      >
                        {isActive ? "Place a Bid" : "Closed"}
                      </Button>
                      {isSeller && isActive && (
                        <Button
                          variant="destructive"
                          onClick={() => handleEndAuction(auction.id)}
                          className="w-full"
                        >
                          End Auction
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      {selectedAuction && (
        <BidModal
          auction={selectedAuction}
          onClose={() => setSelectedAuction(null)}
          onPlaceBid={handlePlaceBid}
        />
      )}
      <Footer />
    </div>
  );
};

export default Auctions;