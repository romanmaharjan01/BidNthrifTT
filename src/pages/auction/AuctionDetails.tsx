import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Clock, Gavel } from "lucide-react";
import { formatDistanceToNow, differenceInSeconds } from "date-fns";
import { useState, useEffect } from "react";
import { toast } from "@/components/ui/use-toast";
import config from "@/config";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface Auction {
  id: string;
  title: string;
  description: string;
  currentBid: number;
  endTime: string;
  images: string[];
  status: "active" | "completed" | "cancelled";
}

const fetchAuction = async (id: string): Promise<Auction> => {
  const response = await fetch(`${config.apiUrl}/auctions/${id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch auction details");
  }
  return response.json();
};

const AuctionDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState<string>("");

  const { data: auction, isLoading, error } = useQuery({
    queryKey: ["auction", id],
    queryFn: () => fetchAuction(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (!auction) return;

    const updateTimer = () => {
      const endTime = new Date(auction.endTime);
      const now = new Date("2025-05-25T03:06:00+05:45"); // Updated to current time
      const secondsLeft = differenceInSeconds(endTime, now);

      if (secondsLeft <= 0) {
        setTimeLeft("Auction ended");
        return;
      }

      setTimeLeft(formatDistanceToNow(endTime, { addSuffix: true }));
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [auction]);

  const handlePlaceBid = async () => {
    try {
      toast({
        title: "Bid Placed",
        description: "Your bid has been successfully placed!",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to place bid. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading auction details...</span>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !auction) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Auction Not Found</h2>
            <p className="text-gray-600 mb-4">
              {error ? (error as Error).message : "The auction could not be found."}
            </p>
            <Button onClick={() => navigate("/auctions")} className="bg-blue-600 hover:bg-blue-700">
              Back to Auctions
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isAuctionActive = auction.status === "active" && timeLeft !== "Auction ended";

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl font-bold">{auction.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  {auction.images && auction.images.length > 0 ? (
                    <img
                      src={auction.images[0]}
                      alt={auction.title}
                      className="w-full h-64 object-cover rounded-md"
                    />
                  ) : (
                    <div className="w-full h-64 bg-gray-200 flex items-center justify-center rounded-md">
                      <span className="text-gray-500">No image available</span>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <p className="text-gray-600">{auction.description}</p>
                  <div className="flex items-center gap-2">
                    <Gavel className="h-5 w-5 text-blue-600" />
                    <p>
                      <span className="font-semibold">Current Bid:</span> NPR {auction.currentBid.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-red-600" />
                    <p>
                      <span className="font-semibold">Time Left:</span> {timeLeft}
                    </p>
                  </div>
                  {isAuctionActive ? (
                    <Button
                      onClick={handlePlaceBid}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      Place Bid
                    </Button>
                  ) : (
                    <p className="text-red-600 font-semibold">This auction has ended.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AuctionDetails;