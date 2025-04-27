import React, { useEffect } from 'react';
import { initializeOrderChat } from "@/services/chatService";
import { useToast } from "@/components/ui/use-toast";
import Chat from '@/components/Chat';

interface OrderChatProps {
  buyerId: string;
  sellerId: string;
  orderId: string;
  productId: string;
  productName: string;
}

const OrderChat: React.FC<OrderChatProps> = ({ buyerId, sellerId, orderId, productId, productName }) => {
  const { toast } = useToast();
  const [initialized, setInitialized] = React.useState(false);

  // Initialize the order chat on component mount
  useEffect(() => {
    const initChat = async () => {
      try {
        console.log("Initializing order chat between buyer and seller", { buyerId, sellerId, productId, orderId });
        
        // Initialize order chat with automated messages
        await initializeOrderChat(buyerId, sellerId, productId, productName, orderId);
        setInitialized(true);
      } catch (error) {
        console.error("Error initializing order chat:", error);
        toast({
          title: "Error",
          description: "Failed to initialize chat. Please try again.",
          variant: "destructive"
        });
      }
    };

    if (buyerId && sellerId && productId && orderId) {
      initChat();
    }
  }, [buyerId, sellerId, productId, productName, orderId, toast]);

  if (!initialized) {
    return <div>Initializing chat...</div>;
  }

  return (
    <Chat 
      userId={buyerId} 
      recipientId={sellerId}
      productId={productId}
      orderId={orderId}
    />
  );
};

export default OrderChat; 