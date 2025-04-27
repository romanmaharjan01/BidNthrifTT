import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card } from '@/components/ui/card';
import ChatList from '@/components/ChatList';
import Chat from '@/components/Chat';
import { auth, db } from '../firebase';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getOrCreateConversation } from '@/services/chatService';
import { getDoc, doc } from 'firebase/firestore';

const UserChatWrapper: React.FC = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const [isInitializing, setIsInitializing] = useState(true);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUserId(user ? user.uid : null);
    });
    return () => unsubscribe();
  }, []);

  // Check for openChatWith in session storage when component mounts and userId is available
  useEffect(() => {
    const initializeChat = async () => {
      if (!userId) return;
      
      const openChatWith = sessionStorage.getItem('openChatWith');
      if (openChatWith) {
        try {
          // Check if user exists
          const userDoc = await getDoc(doc(db, 'users', openChatWith));
          if (userDoc.exists()) {
            // Create or get conversation
            const conversationId = await getOrCreateConversation(userId, openChatWith);
            
            // Set selected chat
            setSelectedChatId(conversationId);
            setSelectedRecipientId(openChatWith);
          }
        } catch (error) {
          console.error('Error initializing chat from redirect:', error);
        } finally {
          // Clear session storage
          sessionStorage.removeItem('openChatWith');
        }
      }
      
      setIsInitializing(false);
    };
    
    if (userId) {
      initializeChat();
    } else {
      setIsInitializing(false);
    }
  }, [userId]);

  // Listen for window resize to handle mobile/desktop views
  useEffect(() => {
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
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Card className="p-6 shadow-lg text-center">
            <h1 className="text-2xl font-bold mb-4">Sign in to view your messages</h1>
            <p className="mb-6 text-gray-500">
              You need to be signed in to access your messages.
            </p>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (isInitializing) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8 flex justify-center items-center">
          <div className="text-center">
            <p>Loading your conversations...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Your Messages</h1>
        
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
                <p>Choose a conversation from the list to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default UserChatWrapper; 