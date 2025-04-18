import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, doc, updateDoc, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom"; // Import useNavigate

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

interface AuctionOversightProps {
  auctions: Auction[];
  users: User[];
  onDelete: (auctionId: string) => void;
  fetchAuctions: () => void;
}

const AuctionOversight = ({ auctions, users, onDelete }: AuctionOversightProps) => {
  const [bidsByAuction, setBidsByAuction] = useState<{ [auctionId: string]: any[] }>({});
  const { toast } = useToast();
  const navigate = useNavigate(); // Initialize useNavigate

  useEffect(() => {
    const unsubscribes: (() => void)[] = [];
    auctions.forEach((auction) => {
      const bidsRef = collection(db, "auctions", auction.id, "bids");
      const unsubscribe = onSnapshot(
        bidsRef,
        (snapshot) => {
          const bids = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          setBidsByAuction((prev) => ({ ...prev, [auction.id]: bids }));
        },
        (error) => {
          console.error(`Error fetching bids for auction ${auction.id}:`, error);
          toast({ title: "Error", description: `Failed to fetch bids for ${auction.title}.`, variant: "destructive" });
        }
      );
      unsubscribes.push(unsubscribe);
    });
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [auctions, toast]);

  const getHighestBid = (auctionId: string) => {
    const bids = bidsByAuction[auctionId] || [];
    if (!bids.length) return null;
    return bids.reduce((max, bid) => (bid.amount > max.amount ? bid : max), bids[0]);
  };

  const getUserFullName = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    return user ? user.fullName : "Unknown User";
  };

  const markAsSold = async (auctionId: string, highestBid: any) => {
    if (!highestBid) {
      toast({ title: "Error", description: "No bids found for this auction.", variant: "destructive" });
      return;
    }
    try {
      const notificationId = `${auctionId}_${highestBid.userId}`;
      await setDoc(doc(db, "notifications", notificationId), {
        userId: highestBid.userId,
        auctionId,
        message: `You won the auction for ${auctions.find((a) => a.id === auctionId)?.title}! Please acknowledge.`,
        status: "pending",
        timestamp: new Date().toISOString(),
      });

      await updateDoc(doc(db, "auctions", auctionId), { status: "sold_pending" });

      toast({
        title: "Notification Sent",
        description: `Notified ${getUserFullName(highestBid.userId)} to acknowledge the sale.`,
      });
    } catch (error) {
      console.error("Error marking auction as sold:", error);
      toast({ title: "Error", description: "Failed to mark auction as sold.", variant: "destructive" });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex justify-between items-center mb-4">
        <h1>Auction Oversight</h1>
        <Button
          onClick={() => navigate("/setauction")} // Navigate to setAuction route
          className="bg-green-600 hover:bg-green-700"
        >
          Create New Auction
        </Button>
      </div>
      {auctions.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Starting Price</TableHead>
              <TableHead>End Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Highest Bid</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {auctions.map((auction) => {
              const highestBid = getHighestBid(auction.id);
              const price = typeof auction.price === "number" ? auction.price : 0;
              const endTime = auction.endTime ? new Date(auction.endTime).toLocaleString() : "N/A";
              return (
                <TableRow key={auction.id}>
                  <TableCell>{auction.title || "Untitled"}</TableCell>
                  <TableCell>₨{price.toFixed(2)}</TableCell>
                  <TableCell>{endTime}</TableCell>
                  <TableCell>{auction.status}</TableCell>
                  <TableCell>
                    {highestBid
                      ? `${getUserFullName(highestBid.userId)}: ₨${highestBid.amount.toFixed(2)}`
                      : "No bids"}
                  </TableCell>
                  <TableCell>
                    <Button
                      onClick={() => onDelete(auction.id)}
                      className="delete-btn bg-red-600 hover:bg-red-700 mr-2"
                    >
                      Delete
                    </Button>
                    {auction.status === "ended" && (
                      <Button
                        onClick={() => markAsSold(auction.id, highestBid)}
                        className="sold-btn bg-blue-600 hover:bg-blue-700"
                      >
                        Mark as Sold
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <p className="no-data">No auctions found.</p>
      )}
    </motion.div>
  );
};

export default AuctionOversight;