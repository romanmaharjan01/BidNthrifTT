import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useToast } from '@/hooks/use-toast';
import { sendAutomatedAuctionMessage } from '@/services/chatService';
import { Loader2, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const AuctionCompleted: React.FC = () => {
  const { auctionId } = useParams<{ auctionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [completed, setCompleted] = React.useState(false);
  const [auctionTitle, setAuctionTitle] = React.useState('');

  useEffect(() => {
    const processAuctionWin = async () => {
      if (!auctionId) {
        toast({
          title: 'Error',
          description: 'Auction ID not found',
          variant: 'destructive',
        });
        navigate('/auctions');
        return;
      }

      try {
        const user = auth.currentUser;
        if (!user) {
          toast({
            title: 'Error',
            description: 'You must be logged in to complete this action',
            variant: 'destructive',
          });
          navigate('/login');
          return;
        }

        // Get auction details
        const auctionDoc = await getDoc(doc(db, 'auctions', auctionId));
        if (!auctionDoc.exists()) {
          toast({
            title: 'Error',
            description: 'Auction not found',
            variant: 'destructive',
          });
          navigate('/auctions');
          return;
        }

        const auctionData = auctionDoc.data();
        setAuctionTitle(auctionData.title || 'Auction Item');

        // Verify this user is the winner
        if (auctionData.winnerId !== user.uid) {
          toast({
            title: 'Error',
            description: 'You are not the winner of this auction',
            variant: 'destructive',
          });
          navigate('/auctions');
          return;
        }

        // Check if already processed
        if (auctionData.status === 'sold') {
          setCompleted(true);
          setLoading(false);
          return;
        }

        // Update auction status
        await updateDoc(doc(db, 'auctions', auctionId), {
          status: 'sold',
          buyerId: user.uid,
          completedAt: new Date().toISOString()
        });

        // Send automated message
        await sendAutomatedAuctionMessage(
          user.uid,
          auctionData.sellerId,
          auctionData.title,
          auctionId,
          auctionData.currentBid || auctionData.price
        );

        setCompleted(true);
        toast({
          title: 'Success',
          description: 'Auction completed successfully! A message has been sent to the seller.',
        });
      } catch (error) {
        console.error('Error processing auction win:', error);
        toast({
          title: 'Error',
          description: 'Failed to process auction win',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    processAuctionWin();
  }, [auctionId, navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            ) : (
              <CheckCircle className="h-6 w-6 text-green-500" />
            )}
            <span>
              {loading ? 'Processing' : 'Auction Completed'}
            </span>
          </CardTitle>
          <CardDescription>
            {loading ? 'Please wait while we process your auction win...' : 'Congratulations on winning the auction!'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!loading && (
            <p className="text-sm text-gray-500">
              You've successfully won the auction for <strong>{auctionTitle}</strong>. A message has been sent to the seller to coordinate the next steps.
              You can now chat with the seller directly.
            </p>
          )}
        </CardContent>
        <CardFooter className="flex gap-2">
          {!loading && (
            <>
              <Button
                onClick={() => navigate('/messages')}
                variant="outline"
                className="flex-1"
              >
                View Messages
              </Button>
              <Button
                onClick={() => navigate('/auctions')}
                className="flex-1"
              >
                Back to Auctions
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default AuctionCompleted; 