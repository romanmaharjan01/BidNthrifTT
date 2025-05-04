import React, { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, query, where, getDocs, onSnapshot, doc, getDoc, updateDoc, addDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  userName?: string;
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
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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
            const bidsWithoutNames = bidsSnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
              userName: "Loading..." // Placeholder while we load names
            } as Bid));
            
            bidsData[auction.id] = bidsWithoutNames;
            
            // Fetch user names for each bid
            const bidsWithNames = await Promise.all(
              bidsWithoutNames.map(async (bid) => {
                try {
                  const userDoc = await getDoc(doc(db, "users", bid.userId));
                  if (userDoc.exists()) {
                    const userData = userDoc.data();
                    return {
                      ...bid,
                      userName: userData.fullName || userData.username || userData.email || "Unknown User"
                    };
                  }
                  return {
                    ...bid,
                    userName: "Unknown User"
                  };
                } catch (error) {
                  console.error("Error fetching user data:", error);
                  return {
                    ...bid,
                    userName: "Unknown User"
                  };
                }
              })
            );
            
            bidsData[auction.id] = bidsWithNames;
            setBids({...bidsData});
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

  const getHighestBid = (auctionId: string): Bid | null => {
    const auctionBids = bids[auctionId];
    if (!auctionBids || auctionBids.length === 0) return null;
    
    return auctionBids.reduce((highest, current) => 
      current.amount > highest.amount ? current : highest, auctionBids[0]);
  };

  const handleEndAuction = async (auction: Auction) => {
    setIsProcessing(true);
    try {
      const highestBid = getHighestBid(auction.id);
      
      if (!highestBid) {
        // No bids on the auction - just mark it as ended
        await updateDoc(doc(db, "auctions", auction.id), {
          status: "ended",
          endedAt: serverTimestamp()
        });
        
        toast({
          title: "Auction Ended",
          description: "The auction has been ended. There were no bids."
        });
        
        // Optionally delete the product
        await deleteDoc(doc(db, "auctions", auction.id));
        return;
      }
      
      // Get the user's email for notification
      let buyerEmail = "";
      let buyerFcmToken = "";
      try {
        const userDoc = await getDoc(doc(db, "users", highestBid.userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          buyerEmail = userData.email || "";
          buyerFcmToken = userData.fcmToken || "";
        }
      } catch (error) {
        console.error("Error fetching buyer data:", error);
      }
      
      // Update auction status
      await updateDoc(doc(db, "auctions", auction.id), {
        status: "ended",
        endedAt: serverTimestamp(),
        winningBidId: highestBid.id,
        winningUserId: highestBid.userId,
        finalPrice: highestBid.amount
      });
      
      // Add notification for highest bidder in the notifications collection
      await addDoc(collection(db, "notifications"), {
        userId: highestBid.userId,
        type: "auction_won",
        message: `Congratulations! You won the auction for ${auction.title} with your bid of ${formatCurrency(highestBid.amount)}.`,
        auctionId: auction.id,
        createdAt: serverTimestamp(),
        read: false,
        productImage: auction.imageUrl,
        actionUrl: `/payment/${auction.id}`
      });
      
      // Send email to highest bidder
      if (buyerEmail) {
        await addDoc(collection(db, "mail"), {
          to: buyerEmail,
          template: {
            name: "auction-won",
            data: {
              userName: highestBid.userName,
              auctionTitle: auction.title,
              bidAmount: formatCurrency(highestBid.amount),
              auctionId: auction.id,
              actionUrl: `${window.location.origin}/payment/${auction.id}`
            }
          },
          createdAt: serverTimestamp()
        });
        
        console.log(`Email notification sent to ${buyerEmail}`);
      }
      
      // Send push notification if FCM token exists
      if (buyerFcmToken) {
        // This would typically be handled by a cloud function
        await addDoc(collection(db, "push-notifications"), {
          token: buyerFcmToken,
          title: "Auction Won!",
          body: `Congratulations! You won the auction for ${auction.title}`,
          data: {
            auctionId: auction.id,
            type: "auction_won"
          },
          createdAt: serverTimestamp()
        });
        
        console.log("Push notification queued");
      }
      
      toast({
        title: "Auction Ended",
        description: `The auction has been ended. ${highestBid.userName} was notified as the winner.`
      });
      
    } catch (error: any) {
      console.error("Error ending auction:", error);
      toast({
        title: "Error",
        description: "Failed to end auction: " + error.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
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
              <TableHead>Actions</TableHead>
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
                <TableCell>
                  <div className="flex space-x-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedAuction(auction)}
                        >
                          View Bids
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Bids for {auction.title}</DialogTitle>
                        </DialogHeader>
                        <div className="max-h-[60vh] overflow-y-auto">
                          {bids[auction.id]?.length > 0 ? (
                            <div className="overflow-hidden rounded-md border">
                              <div className="bg-blue-500 text-white py-3 px-4 grid grid-cols-3">
                                <div className="font-medium">USER</div>
                                <div className="font-medium">AMOUNT</div>
                                <div className="font-medium">DATE</div>
                              </div>
                              <div className="divide-y">
                                {bids[auction.id]
                                  ?.sort((a, b) => b.amount - a.amount)
                                  .map((bid, index) => {
                                    const isHighestBid = index === 0;
                                    return (
                                      <div 
                                        key={bid.id}
                                        className={`grid grid-cols-3 py-3 px-4 ${
                                          isHighestBid 
                                            ? "bg-blue-50 font-medium" 
                                            : index % 2 === 0 
                                              ? "bg-gray-50" 
                                              : "bg-white"
                                        }`}
                                      >
                                        <div>{bid.userName}</div>
                                        <div>{formatCurrency(bid.amount)}</div>
                                        <div>{new Date(bid.timestamp).toLocaleString()}</div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          ) : (
                            <p className="text-center p-4 text-gray-500">No bids for this auction yet</p>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    {auction.status !== "ended" && auction.status !== "sold" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            disabled={isProcessing}
                          >
                            End Auction
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>End Auction</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to end this auction? This will notify the highest bidder and end the auction immediately.
                              {getHighestBid(auction.id) 
                                ? ` The highest bid is ${formatCurrency(getHighestBid(auction.id)!.amount)} by ${getHighestBid(auction.id)!.userName}.` 
                                : " There are currently no bids on this auction."}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleEndAuction(auction)}
                              disabled={isProcessing}
                              className="bg-red-500 hover:bg-red-600"
                            >
                              {isProcessing ? "Processing..." : "End Auction"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default MyAuctions;