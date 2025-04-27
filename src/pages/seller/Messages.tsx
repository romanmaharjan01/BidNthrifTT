import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import ChatList from "@/components/ChatList";
import Chat from "@/components/Chat";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

interface ContextType {
  userId: string;
  formatCurrency: (amount: number) => string;
}

const Messages: React.FC = () => {
  const { userId } = useOutletContext<ContextType>();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);

  // Listen for window resize to handle mobile/desktop views
  React.useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleChatSelect = (chatId: string, recipientId: string) => {
    setSelectedChatId(chatId);
    setSelectedRecipientId(recipientId);
  };

  const handleBackToList = () => {
    setSelectedChatId(null);
    setSelectedRecipientId(null);
  };

  if (!userId) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Customer Messages</h1>
      
      <div className="flex flex-col md:flex-row gap-4">
        {/* Chat List - Hide on mobile when a chat is selected */}
        {(!isMobileView || !selectedChatId) && (
          <div className="w-full md:w-1/3">
            <ChatList 
              userId={userId} 
              onChatSelect={handleChatSelect}
              selectedChatId={selectedChatId}
            />
          </div>
        )}
        
        {/* Chat Area - Show when a chat is selected */}
        {selectedChatId && selectedRecipientId ? (
          <div className="w-full md:w-2/3">
            {isMobileView && (
              <Button 
                variant="outline" 
                className="mb-2"
                onClick={handleBackToList}
              >
                Back to conversations
              </Button>
            )}
            <Chat 
              userId={userId}
              recipientId={selectedRecipientId}
            />
          </div>
        ) : (
          // Show message to select a chat when none is selected
          <div className="hidden md:flex md:w-2/3 items-center justify-center">
            <div className="text-center text-gray-500">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h2 className="text-xl font-medium mb-2">Select a conversation</h2>
              <p>Choose a conversation from the list to start chatting with a customer</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages; 