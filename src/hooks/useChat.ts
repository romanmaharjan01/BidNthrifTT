import { useState, useEffect, useCallback } from 'react';
import { auth, db } from '../pages/firebase';
import { 
  getOrCreateConversation, 
  sendMessage, 
  getUnreadMessageCount 
} from '@/services/chatService';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

interface UseChatOptions {
  redirectAfterSend?: boolean;
}

const useChat = ({ redirectAfterSend = true }: UseChatOptions = {}) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUserId(user ? user.uid : null);
    });
    return () => unsubscribe();
  }, []);

  // Get unread message count
  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
      return () => {};
    }

    const unsubscribe = getUnreadMessageCount(userId, (count) => {
      setUnreadCount(count);
    });

    return () => unsubscribe();
  }, [userId]);

  // Send message to a seller/buyer
  const sendMessageToUser = useCallback(async (
    recipientId: string,
    message: string,
    productId?: string,
    auctionId?: string
  ) => {
    if (!userId) {
      toast({
        title: 'Login Required',
        description: 'Please login to send messages',
        variant: 'destructive'
      });
      navigate('/login');
      return false;
    }

    if (userId === recipientId) {
      toast({
        title: 'Cannot message yourself',
        description: 'You cannot send messages to yourself',
        variant: 'destructive'
      });
      return false;
    }

    if (!message.trim()) {
      toast({
        title: 'Empty Message',
        description: 'Please enter a message to send',
        variant: 'destructive'
      });
      return false;
    }

    try {
      setIsLoading(true);
      
      // Get or create conversation
      const conversationId = await getOrCreateConversation(userId, recipientId, productId, auctionId);
      
      // Send message
      await sendMessage(conversationId, userId, recipientId, message.trim());
      
      toast({
        title: 'Message Sent',
        description: 'Your message has been sent successfully'
      });
      
      if (redirectAfterSend) {
        navigate('/chat');
      }
      
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userId, toast, navigate, redirectAfterSend]);

  // Initiate chat with a user
  const startChatWith = useCallback((recipientId: string) => {
    if (!userId) {
      toast({
        title: 'Login Required',
        description: 'Please login to start a chat',
        variant: 'destructive'
      });
      navigate('/login');
      return;
    }

    navigate('/chat');
    
    // We'll need to add logic in the ChatWrapper to open this specific chat
    sessionStorage.setItem('openChatWith', recipientId);
  }, [userId, navigate, toast]);

  return {
    userId,
    unreadCount,
    isLoading,
    sendMessageToUser,
    startChatWith
  };
};

export default useChat; 