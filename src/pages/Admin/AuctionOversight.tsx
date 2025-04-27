import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

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
}

const AuctionOversight = ({ auctions, users }: AuctionOversightProps) => {
  const [bidsByAuction, setBidsByAuction] = useState<{ [auctionId: string]: any[] }>({});
  const { toast } = useToast();

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="mb-4">Auction Oversight</h1>
      {auctions.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Starting Price</TableHead>
              <TableHead>End Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Highest Bidder</TableHead>
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