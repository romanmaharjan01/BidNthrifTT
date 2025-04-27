import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, X, Send, Minimize, Maximize } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { auth, db } from '../pages/firebase';
import { getDoc, doc } from 'firebase/firestore';
import { 
  getOrCreateConversation, 
  sendMessage, 
  getMessages,
  markMessagesAsRead 
} from '@/services/chatService';
import { Message } from '@/models/chat';
import { useNavigate } from 'react-router-dom';

interface QuickChatProps {
  sellerId: string;
  productId: string;
  productName: string;
}

const QuickChat: React.FC<QuickChatProps> = ({
  sellerId,
  productId,
  productName
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [sellerInfo, setSellerInfo] = useState<{ name: string; photoURL: string } | null>(null);
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUserId(user ? user.uid : null);
    });
    return () => unsubscribe();
  }, []);

  // Get seller info when component mounts
  useEffect(() => {
    const getSellerInfo = async () => {
      try {
        const sellerDoc = await getDoc(doc(db, 'users', sellerId));
        if (sellerDoc.exists()) {
          const sellerData = sellerDoc.data();
          setSellerInfo({
            name: sellerData.displayName || sellerData.email || 'Seller',
            photoURL: sellerData.photoURL || '',
          });
        }
      } catch (error) {
        console.error('Error getting seller info:', error);
      }
    };

    if (sellerId) {
      getSellerInfo();
    }
  }, [sellerId]);

  // Initialize chat and subscribe to messages when opened
  useEffect(() => {
    let unsubscribe = () => {};
    
    const initializeChat = async () => {
      if (!userId || !isOpen) return;
      
      // Validate that seller ID exists and is not empty
      if (!sellerId || sellerId.trim() === '') {
        setIsLoading(false);
        toast({
          title: "Error",
          description: "Seller information is missing. Unable to chat.",
          variant: "destructive"
        });
        setIsOpen(false);
        return;
      }
      
      try {
        setIsLoading(true);
        
        // Create or get conversation
        const chatId = await getOrCreateConversation(userId, sellerId, productId);
        setConversationId(chatId);
        
        // Subscribe to messages
        unsubscribe = getMessages(chatId, (chatMessages) => {
          setMessages(chatMessages);
          setIsLoading(false);
        });
        
        // Mark messages as read
        await markMessagesAsRead(chatId, userId);
      } catch (error) {
        console.error('Error initializing chat:', error);
        setIsLoading(false);
        toast({
          title: "Error",
          description: "Failed to initialize chat. Please try again.",
          variant: "destructive"
        });
      }
    };
    
    if (isOpen && userId && sellerId) {
      initializeChat();
    }
    
    return () => unsubscribe();
  }, [userId, sellerId, productId, isOpen, toast]);

  // Scroll to bottom of messages when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const toggleChat = () => {
    // Only allow if user is logged in
    if (!userId) {
      toast({
        title: "Login Required",
        description: "Please login to chat with the seller",
        variant: "destructive"
      });
      navigate('/login');
      return;
    }
    
    // Validate that seller ID exists and is not empty
    if (!sellerId || sellerId.trim() === '') {
      toast({
        title: "Error",
        description: "Seller information is missing. Unable to chat.",
        variant: "destructive"
      });
      return;
    }
    
    // Prevent opening chat with yourself
    if (userId === sellerId) {
      toast({
        title: "Cannot message yourself",
        description: "You cannot chat with yourself as a seller",
        variant: "destructive"
      });
      return;
    }
    
    setIsOpen(prev => !prev);
    setIsMinimized(false);
  };

  const handleMinimize = () => {
    setIsMinimized(true);
  };

  const handleMaximize = () => {
    setIsMinimized(false);
  };

  const handleSendMessage = async () => {
    if (!conversationId || !userId || !sellerId || !messageText.trim()) return;
    
    try {
      await sendMessage(
        conversationId,
        userId,
        sellerId,
        messageText.trim()
      );
      setMessageText('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  };

  const openFullChat = () => {
    navigate('/chat');
  };

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <Button 
          className="fixed bottom-6 right-6 rounded-full shadow-lg z-50"
          onClick={toggleChat}
        >
          <MessageCircle className="mr-2 h-5 w-5" />
          Chat with Seller
        </Button>
      )}
      
      {/* Quick Chat Interface */}
      {isOpen && (
        <Card 
          className={`fixed ${isMinimized ? 'w-64 h-auto' : 'w-80 sm:w-96 h-96'} bottom-6 right-6 shadow-lg z-50 flex flex-col`}
        >
          <CardHeader className="p-3 border-b flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center">
              <Avatar className="h-8 w-8 mr-2">
                <AvatarImage src={sellerInfo?.photoURL} />
                <AvatarFallback>{sellerInfo?.name?.[0] || 'S'}</AvatarFallback>
              </Avatar>
              <CardTitle className="text-sm">{sellerInfo?.name || 'Seller'}</CardTitle>
            </div>
            <div className="flex space-x-1">
              {isMinimized ? (
                <Button variant="ghost" size="icon" onClick={handleMaximize} className="h-7 w-7">
                  <Maximize className="h-4 w-4" />
                </Button>
              ) : (
                <Button variant="ghost" size="icon" onClick={handleMinimize} className="h-7 w-7">
                  <Minimize className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={toggleChat} className="h-7 w-7">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          {!isMinimized && (
            <>
              <CardContent className="flex-1 overflow-y-auto p-3 space-y-3">
                {isLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <p className="text-sm text-gray-500">Loading messages...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="text-center text-gray-500">
                      <MessageCircle className="mx-auto h-10 w-10 mb-2 text-gray-300" />
                      <p className="text-sm">Start chatting about:</p>
                      <p className="text-xs font-medium">{productName}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => {
                      const isOwnMessage = message.senderId === userId;
                      const isSystemMessage = message.senderId === 'system';
                      
                      return (
                        <div 
                          key={message.id} 
                          className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                        >
                          {isSystemMessage ? (
                            <div className="bg-blue-50 p-2 rounded text-xs w-full text-center">
                              {message.content}
                            </div>
                          ) : (
                            <div 
                              className={`max-w-[80%] p-2 rounded-lg ${
                                isOwnMessage 
                                  ? 'bg-primary text-primary-foreground rounded-br-none ml-auto' 
                                  : 'bg-gray-100 rounded-bl-none'
                              }`}
                            >
                              <p className="text-sm">{message.content}</p>
                              <span className={`text-[10px] ${isOwnMessage ? 'text-primary-foreground/70' : 'text-gray-500'}`}>
                                {formatTime(message.timestamp)}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </CardContent>
              
              <CardFooter className="p-3 pt-0">
                <div className="flex w-full gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1"
                  />
                  <Button 
                    size="icon" 
                    onClick={handleSendMessage}
                    disabled={!messageText.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <Button 
                  variant="link" 
                  size="sm" 
                  onClick={openFullChat} 
                  className="text-xs mt-2 w-full"
                >
                  Open full chat
                </Button>
              </CardFooter>
            </>
          )}
        </Card>
      )}
    </>
  );
};

export default QuickChat; 