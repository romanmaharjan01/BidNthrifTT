import React, { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// import "./seller.css";

interface Auction {
  id: string;
  title: string;
  price: number;
  endTime: string;
  status: "upcoming" | "active" | "ended" | "sold" | "sold_pending";
  sellerId: string;
  imageUrl: string;
}

interface Bid {
  id: string;
  userId: string;
  amount: number;
  timestamp: string;
}

interface ContextType {
  userId: string;
  formatCurrency: (amount: number) => string;
}

const MyAuctions: React.FC = () => {
  const { userId, formatCurrency } = useOutletContext<ContextType>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [bids, setBids] = useState<{ [auctionId: string]: Bid[] }>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchAuctions = async () => {
      setIsLoading(true);
      try {
        const auctionsQuery = query(collection(db, "auctions"), where("sellerId", "==", userId));
        const unsubscribe = onSnapshot(auctionsQuery, async (snapshot) => {
          const auctionsData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          } as Auction));

          const bidsData: { [auctionId: string]: Bid[] } = {};
          for (const auction of auctionsData) {
            const bidsRef = collection(db, "auctions", auction.id, "bids");
            const bidsSnapshot = await getDocs(bidsRef);
            bidsData[auction.id] = bidsSnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            } as Bid));
          }

          setAuctions(auctionsData);
          setBids(bidsData);
        });

        return () => unsubscribe();
      } catch (error: any) {
        console.error("Error fetching auctions:", error.message);
        toast({
          title: "Error",
          description: "Failed to load auctions: " + error.message,
          variant: "destructive",
        });
        setAuctions([]);
        setBids({});
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuctions();
  }, [userId, toast]);

  const handleSetAuction = () => {
    navigate("/seller/set-auction");
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Auctions</h1>
        <Button onClick={handleSetAuction} className="set-auction-btn">
          Set Auction
        </Button>
      </div>
      {isLoading ? (
        <div className="loading-spinner">Loading...</div>
      ) : auctions.length === 0 ? (
        <p className="text-gray-600">No auctions found. Create one to get started!</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Current Price</TableHead>
              <TableHead>End Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Bids</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {auctions.map((auction) => (
              <TableRow key={auction.id}>
                <TableCell>
                  <img
                    src={auction.imageUrl || "https://placehold.co/50x50"}
                    alt={auction.title}
                    className="w-12 h-12 object-cover rounded"
                  />
                </TableCell>
                <TableCell>{auction.title}</TableCell>
                <TableCell>{formatCurrency(auction.price)}</TableCell>
                <TableCell>{new Date(auction.endTime).toLocaleString()}</TableCell>
                <TableCell>{auction.status}</TableCell>
                <TableCell>{bids[auction.id]?.length || 0}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default MyAuctions;