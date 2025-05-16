import React, { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
  deleteDoc,
  setDoc,
  orderBy,
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

interface Auction {
  id: string;
  title: string;
  price: number;
  startTime: string; // Added startTime to the interface
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
        const auctionsQuery = query(
          collection(db, "auctions"),
          where("sellerId", "==", userId)
        );
        const unsubscribe = onSnapshot(auctionsQuery, async (snapshot) => {
          const auctionsData = snapshot.docs.map(
            (doc) =>
              ({
                id: doc.id,
                ...doc.data(),
              } as Auction)
          );

          const bidsData: { [auctionId: string]: Bid[] } = {};
          for (const auction of auctionsData) {
            const bidsRef = collection(db, "auctions", auction.id, "bids");
            const bidsSnapshot = await getDocs(bidsRef);
            const bidsWithoutNames = bidsSnapshot.docs.map(
              (doc) =>
                ({
                  id: doc.id,
                  ...doc.data(),
                  userName: "Loading...",
                } as Bid)
            );

            bidsData[auction.id] = bidsWithoutNames;

            const bidsWithNames = await Promise.all(
              bidsWithoutNames.map(async (bid) => {
                try {
                  const userDoc = await getDoc(doc(db, "users", bid.userId));
                  if (userDoc.exists()) {
                    const userData = userDoc.data();
                    return {
                      ...bid,
                      userName:
                        userData.fullName ||
                        userData.username ||
                        userData.email ||
                        "Unknown User",
                    };
                  }
                  return { ...bid, userName: "Unknown User" };
                } catch (error) {
                  console.error("Error fetching user data:", error);
                  return { ...bid, userName: "Unknown User" };
                }
              })
            );

            bidsData[auction.id] = bidsWithNames;
          }

          // Updated loop to handle status transitions and ending auctions
          for (const auction of auctionsData) {
            if (
              auction.status === "upcoming" &&
              (new Date(auction.startTime).getTime() <= Date.now() || bids[auction.id]?.length > 0)
            ) {
              await updateDoc(doc(db, "auctions", auction.id), {
                status: "active",
                updatedAt: serverTimestamp(),
              });
            }
            if (
              auction.status === "active" &&
              new Date(auction.endTime).getTime() <= Date.now()
            ) {
              await handleEndAuction(auction, true);
            }
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
    return auctionBids.reduce(
      (highest, current) =>
        current.amount > highest.amount ? current : highest,
      auctionBids[0]
    );
  };

  const handleEndAuction = async (auction: Auction, isAutomatic: boolean = false) => {
  setIsProcessing(true);
  try {
    const highestBid = getHighestBid(auction.id);

    if (!highestBid) {
      await updateDoc(doc(db, "auctions", auction.id), {
        status: "ended",
        endedAt: serverTimestamp(),
      });

      toast({
        title: "Auction Ended",
        description: "The auction has been ended. There were no bids.",
      });

      await deleteDoc(doc(db, "auctions", auction.id));
      return;
    }

    let buyerEmail = "";
    let buyerFcmToken = "";
    let buyerName = highestBid.userName || "Unknown User";
    try {
      const userDoc = await getDoc(doc(db, "users", highestBid.userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        buyerEmail = userData.email || "";
        buyerFcmToken = userData.fcmToken || "";
        buyerName = userData.fullName || userData.email || "Unknown User";
      }
    } catch (error) {
      console.error("Error fetching buyer data:", error);
      toast({
        title: "Warning",
        description: "Could not fetch buyer details, but auction will proceed.",
        variant: "default",
      });
    }

    const bidsQuery = query(
      collection(db, "auctions", auction.id, "bids"),
      orderBy("amount", "desc")
    );
    const bidsSnapshot = await getDocs(bidsQuery);
    const outbidUsers = bidsSnapshot.docs
      .map((doc) => doc.data() as Bid)
      .filter((bid) => bid.userId !== highestBid.userId)
      .map((bid) => bid.userId)
      .filter((userId, index, self) => self.indexOf(userId) === index);

    await updateDoc(doc(db, "auctions", auction.id), {
      status: "ended",
      endedAt: serverTimestamp(),
      winningBidId: highestBid.id,
      winningUserId: highestBid.userId,
      finalPrice: highestBid.amount,
    });

    const productRef = doc(collection(db, "products"));
    await setDoc(productRef, {
      title: auction.title,
      price: highestBid.amount,
      description: auction.title,
      imageUrl: auction.imageUrl,
      stock: 1,
      category: "Auction Item",
      size: "N/A",
      isAuction: true,
      sellerId: auction.sellerId,
      sellerEmail: buyerEmail,
      createdAt: serverTimestamp(),
    });

    const winnerNotification = {
      userId: highestBid.userId,
      type: "won",
      message: `Congratulations! You won the auction for ${auction.title} with your bid of ${formatCurrency(
        highestBid.amount
      )}. Proceed to payment.`,
      auctionId: auction.id,
      productId: productRef.id,
      timestamp: new Date().toISOString(),
      status: "unread",
      actionUrl: `/shop/${productRef.id}`,
    };
    console.log("Sending winner notification with userId:", highestBid.userId, winnerNotification);
    await addDoc(collection(db, "notifications"), winnerNotification);

    for (const userId of outbidUsers) {
      const outbidNotification = {
        userId: userId,
        type: "outbid",
        message: `The auction for ${auction.title} has ended. You were outbid. The winning bid was ${formatCurrency(
          highestBid.amount
        )}.`,
        auctionId: auction.id,
        timestamp: new Date().toISOString(),
        status: "unread",
        actionUrl: `/auctions#${auction.id}`,
      };
      console.log("Sending outbid notification with userId:", userId, outbidNotification);
      await addDoc(collection(db, "notifications"), outbidNotification);
    }

    // Rest of the function (email, push notifications, toast) remains unchanged
  } catch (error: any) {
    console.error("Error ending auction:", error);
    toast({
      title: "Error",
      description: `Failed to end auction: ${error.message}. Please try again.`,
      variant: "destructive",
    });
  } finally {
    setIsProcessing(false);
  }
};
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">My Auctions</h1>
        <Button
          onClick={handleSetAuction}
          className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md"
        >
          Set Auction
        </Button>
      </div>
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <span className="text-gray-600 text-lg">Loading...</span>
        </div>
      ) : auctions.length === 0 ? (
        <p className="text-gray-600 text-center py-8">No auctions found. Create one to get started!</p>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="px-4 py-3 text-left text-teal-600 font-medium">
                  Image
                </TableHead>
                <TableHead className="px-4 py-3 text-left text-teal-600 font-medium">
                  Title
                </TableHead>
                <TableHead className="px-4 py-3 text-left text-teal-600 font-medium">
                  Current Price
                </TableHead>
                <TableHead className="px-4 py-3 text-left text-teal-600 font-medium">
                  End Time
                </TableHead>
                <TableHead className="px-4 py-3 text-left text-teal-600 font-medium">
                  Status
                </TableHead>
                <TableHead className="px-4 py-3 text-left text-teal-600 font-medium">
                  Bids
                </TableHead>
                <TableHead className="px-4 py-3 text-left text-teal-600 font-medium">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auctions.map((auction) => (
                <TableRow
                  key={auction.id}
                  className="border-t border-gray-200 hover:bg-gray-50"
                >
                  <TableCell className="px-4 py-3">
                    <img
                      src={auction.imageUrl || "https://placehold.co/50x50"}
                      alt={auction.title}
                      className="w-12 h-12 object-cover rounded"
                    />
                  </TableCell>
                  <TableCell className="px-4 py-3 text-gray-800">{auction.title}</TableCell>
                  <TableCell className="px-4 py-3 text-gray-800">
                    {formatCurrency(auction.price)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-gray-800">
                    {new Date(auction.endTime).toLocaleString()}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-gray-800">{auction.status}</TableCell>
                  <TableCell className="px-4 py-3 text-gray-800">
                    {bids[auction.id]?.length || 0}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedAuction(auction)}
                          className="border-teal-600 text-teal-600 hover:bg-teal-50"
                        >
                          View Bids
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md bg-white rounded-lg">
                        <DialogHeader>
                          <DialogTitle className="text-lg font-semibold text-teal-600">
                            Bids for {auction.title}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="max-h-[60vh] overflow-y-auto">
                          {bids[auction.id]?.length > 0 ? (
                            <div className="overflow-hidden rounded-md border border-gray-200">
                              <div className="bg-teal-600 text-white py-3 px-4 grid grid-cols-3">
                                <div className="font-medium">USER</div>
                                <div className="font-medium">AMOUNT</div>
                                <div className="font-medium">DATE</div>
                              </div>
                              <div className="divide-y divide-gray-200">
                                {bids[auction.id]
                                  ?.sort((a, b) => b.amount - a.amount)
                                  .map((bid, index) => {
                                    const isHighestBid = index === 0;
                                    return (
                                      <div
                                        key={bid.id}
                                        className={`grid grid-cols-3 py-3 px-4 ${
                                          isHighestBid
                                            ? "bg-teal-50 font-medium"
                                            : index % 2 === 0
                                            ? "bg-gray-50"
                                            : "bg-white"
                                        }`}
                                      >
                                        <div>{bid.userName}</div>
                                        <div>{formatCurrency(bid.amount)}</div>
                                        <div>
                                          {new Date(bid.timestamp).toLocaleString()}
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          ) : (
                            <p className="text-center p-4 text-gray-500">
                              No bids for this auction yet
                            </p>
                          )}
                        </div>
                        {auction.status === "active" && (
                          <div className="mt-4 flex justify-end space-x-2">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  disabled={isProcessing}
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                  End Auction
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-white rounded-lg">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-lg font-semibold text-gray-800">
                                    End Auction
                                  </AlertDialogTitle>
                                  <AlertDialogDescription className="text-gray-600">
                                    Are you sure you want to end this auction? This will
                                    notify the highest bidder and end the auction
                                    immediately.
                                    {getHighestBid(auction.id) ? (
                                      ` The highest bid is ${formatCurrency(
                                        getHighestBid(auction.id)!.amount
                                      )} by ${getHighestBid(auction.id)!.userName}.`
                                    ) : (
                                      " There are currently no bids on this auction."
                                    )}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel
                                    disabled={isProcessing}
                                    className="border-gray-300"
                                  >
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleEndAuction(auction)}
                                    disabled={isProcessing}
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                  >
                                    {isProcessing ? "Processing..." : "End Auction"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default MyAuctions;