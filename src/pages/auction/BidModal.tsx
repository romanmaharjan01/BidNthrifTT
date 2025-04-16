import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

interface BidModalProps {
  auction: { id: string; title: string; price: number };
  onClose: () => void;
  onPlaceBid: (id: string, newBid: number, currentBid: number) => void;
}

const BidModal = ({ auction, onClose, onPlaceBid }: BidModalProps) => {
  const [bid, setBid] = useState(auction.price + 1);

  const handleSubmit = () => {
    onPlaceBid(auction.id, bid, auction.price);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-white w-full max-w-md">
            <CardHeader>
              <h2 className="text-2xl font-bold text-gray-900">
                Place Bid: {auction.title}
              </h2>
              <p className="text-gray-600">
                Current Bid: <span className="font-semibold">${auction.price}</span>
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <label htmlFor="bid" className="block text-sm font-medium text-gray-700">
                  Your Bid
                </label>
                <Input
                  id="bid"
                  type="number"
                  value={bid}
                  onChange={(e) => setBid(parseFloat(e.target.value))}
                  min={auction.price + 1}
                  step="0.01"
                  className="w-full"
                  placeholder={`Minimum bid: $${auction.price + 1}`}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
              >
                Place Bid
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BidModal;