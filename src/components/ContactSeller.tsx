import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getOrCreateConversation } from '@/services/chatService';
import { auth } from '../pages/firebase';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../pages/firebase';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { sendMessage } from '@/services/chatService';
import { useToast } from '@/components/ui/use-toast';

interface ContactSellerProps {
  sellerId: string;
  productId: string;
  productName: string;
  variant?: 'button' | 'link';
  buttonText?: string;
  className?: string;
}

const ContactSeller: React.FC<ContactSellerProps> = ({
  sellerId,
  productId,
  productName,
  variant = 'button',
  buttonText = 'Contact Seller',
  className = ''
}) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [sellerName, setSellerName] = useState<string>('Seller');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  // Get current user
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUserId(user ? user.uid : null);
    });
    return () => unsubscribe();
  }, []);

  // Get seller info
  useEffect(() => {
    const getSellerInfo = async () => {
      try {
        const sellerDoc = await getDoc(doc(db, 'users', sellerId));
        if (sellerDoc.exists()) {
          const sellerData = sellerDoc.data();
          setSellerName(sellerData.displayName || sellerData.email || 'Seller');
        }
      } catch (error) {
        console.error('Error getting seller info:', error);
      }
    };

    if (sellerId) {
      getSellerInfo();
    }
  }, [sellerId]);

  const handleContact = async () => {
    if (!userId) {
      toast({
        title: "Login Required",
        description: "Please login to contact the seller",
        variant: "destructive"
      });
      navigate('/login');
      return;
    }

    if (userId === sellerId) {
      toast({
        title: "Cannot message yourself",
        description: "You cannot contact yourself as a seller",
        variant: "destructive"
      });
      return;
    }

    setIsOpen(true);
  };

  const handleSendMessage = async () => {
    if (!userId || !message.trim()) return;
    
    // Check if sellerId exists and is not empty
    if (!sellerId || sellerId.trim() === '') {
      toast({
        title: "Error",
        description: "Seller information is missing. Unable to contact.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Create or get conversation
      const conversationId = await getOrCreateConversation(userId, sellerId, productId);
      
      // Send the message
      await sendMessage(conversationId, userId, sellerId, message.trim());
      
      toast({
        title: "Message Sent",
        description: "Your message has been sent to the seller"
      });
      
      // Close dialog and reset message
      setIsOpen(false);
      setMessage('');
      
      // Optional: Navigate to chat
      navigate('/chat');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setMessage('');
  };

  return (
    <>
      {variant === 'button' ? (
        <Button 
          onClick={handleContact} 
          className={className}
          variant="outline"
        >
          <MessageCircle className="mr-2 h-4 w-4" />
          {buttonText}
        </Button>
      ) : (
        <span 
          onClick={handleContact}
          className={`cursor-pointer text-blue-500 hover:underline flex items-center ${className}`}
        >
          <MessageCircle className="mr-1 h-4 w-4" />
          {buttonText}
        </span>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Message to {sellerName}</DialogTitle>
            <DialogDescription>
              Regarding product: {productName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <Textarea
              placeholder="Write your message to the seller..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[120px]"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendMessage} 
              disabled={isLoading || !message.trim()}
            >
              {isLoading ? 'Sending...' : 'Send Message'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ContactSeller; 