import React, { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Send, MapPin, Smile, Image as ImageIcon, MoreVertical, Check, Trash, Package, AlertTriangle, MessageCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  getOrCreateConversation,
  getMessages,
  sendMessage,
  markMessagesAsRead,
  deleteMessage,
  updateTypingStatus,
  getTypingStatus,
  deleteConversation
} from "@/services/chatService";
import { Message } from "@/models/chat";
import { auth, db } from "../pages/firebase";
import { getDoc, doc } from "firebase/firestore";
import EmojiPicker from "emoji-picker-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";

interface ChatProps {
  userId: string; // Current user ID
  recipientId: string; // Other user ID (seller or buyer)
  productId?: string; // Optional product ID
  orderId?: string; // Optional order ID
  auctionId?: string; // Optional auction ID
  className?: string; // Additional styling
}

const Chat: React.FC<ChatProps> = ({
  userId,
  recipientId,
  productId,
  orderId,
  auctionId,
  className = ""
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [recipientInfo, setRecipientInfo] = useState<{ name: string; photoURL: string, isSeller: boolean } | null>(null);
  const [userInfo, setUserInfo] = useState<{ name: string; photoURL: string, isSeller: boolean } | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Initialize chat conversation
  useEffect(() => {
    const initializeChat = async () => {
      if (!userId || !recipientId) return;
      
      try {
        setIsLoading(true);
        console.log(`Initializing chat between ${userId} and ${recipientId}`);
        
        // Get or create a conversation
        const chatId = await getOrCreateConversation(userId, recipientId, productId, auctionId);
        setConversationId(chatId);
        
        // Get recipient info
        const recipientDoc = await getDoc(doc(db, "users", recipientId));
        if (recipientDoc.exists()) {
          const recipientData = recipientDoc.data();
          setRecipientInfo({
            name: recipientData.fullName || 
                  (recipientData.firstName && recipientData.lastName
                    ? `${recipientData.firstName} ${recipientData.lastName}`
                    : recipientData.displayName || recipientData.email || "User"),
            photoURL: recipientData.profileImage || recipientData.photoURL || "",
            isSeller: recipientData.isSeller || recipientData.role === "seller" || false
          });
        }
        
        // Get current user info
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserInfo({
            name: userData.fullName || 
                  (userData.firstName && userData.lastName
                    ? `${userData.firstName} ${userData.lastName}`
                    : userData.displayName || userData.email || "User"),
            photoURL: userData.profileImage || userData.photoURL || "",
            isSeller: userData.isSeller || userData.role === "seller" || false
          });
        }
      } catch (error) {
        console.error("Error initializing chat:", error);
        toast({
          title: "Error",
          description: "Failed to initialize chat. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    initializeChat();
  }, [userId, recipientId, productId, auctionId, toast]);

  // Subscribe to messages
  useEffect(() => {
    if (!conversationId) return () => {};
    
    const unsubscribe = getMessages(conversationId, (chatMessages) => {
      setMessages(chatMessages);
    });
    
    // Mark messages as read
    if (conversationId && userId) {
      markMessagesAsRead(conversationId, userId);
    }
    
    return () => unsubscribe();
  }, [conversationId, userId]);

  // Subscribe to typing indicators
  useEffect(() => {
    if (!conversationId) return () => {};
    
    const unsubscribe = getTypingStatus(conversationId, (typingStatus) => {
      setTypingUsers(typingStatus);
    });
    
    return () => unsubscribe();
  }, [conversationId]);

  // Handle typing events with debounce
  useEffect(() => {
    if (!conversationId || !userId) return;
    
    // If the message is empty, immediately set typing to false and return
    if (!messageText) {
      updateTypingStatus(conversationId, userId, false);
      return;
    }
    
    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set typing status to true
    updateTypingStatus(conversationId, userId, true);
    
    // Set a timeout to clear typing status after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      updateTypingStatus(conversationId, userId, false);
    }, 3000);
    
    // Cleanup function
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId, userId, messageText]);

  // Scroll to bottom of messages when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!conversationId || !userId || !recipientId || !messageText.trim()) return;
    
    try {
      await sendMessage(
        conversationId,
        userId,
        recipientId,
        messageText.trim()
      );
      setMessageText("");
      setIsEmojiPickerOpen(false);
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);
  };

  const handleAddEmoji = (emojiData: any) => {
    setMessageText(prev => prev + emojiData.emoji);
    setIsEmojiPickerOpen(false);
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!conversationId) return;
    
    try {
      await deleteMessage(conversationId, messageId);
      toast({
        title: "Message deleted",
        description: "Your message was successfully deleted",
      });
    } catch (error) {
      console.error("Error deleting message:", error);
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive"
      });
    }
  };

  const handleDeleteConversation = async () => {
    if (!conversationId) return;
    
    try {
      setIsDeleteDialogOpen(false);
      setIsLoading(true);
      
      await deleteConversation(conversationId);
      
      toast({
        title: "Conversation deleted",
        description: "The conversation has been deleted successfully",
      });
      
      // Navigate back to conversations list
      navigate("/chat");
      
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };
  
  const handleLocationShare = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const locationMessage = `📍 My location: https://maps.google.com/?q=${position.coords.latitude},${position.coords.longitude}`;
          setMessageText(locationMessage);
        },
        (error) => {
          console.error("Error getting location:", error);
          toast({
            title: "Location Error",
            description: "Unable to access your location. Please check your browser permissions.",
            variant: "destructive"
          });
        }
      );
    } else {
      toast({
        title: "Location Not Supported",
        description: "Your browser doesn't support geolocation.",
        variant: "destructive"
      });
    }
  };

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch (e) {
      return "";
    }
  };

  const formatDate = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString();
    } catch (e) {
      return "";
    }
  };

  const shouldShowDate = (index: number) => {
    if (index === 0) return true;
    
    const currentMsg = messages[index];
    const prevMsg = messages[index - 1];
    
    const currentDate = new Date(currentMsg.timestamp).toDateString();
    const prevDate = new Date(prevMsg.timestamp).toDateString();
    
    return currentDate !== prevDate;
  };

  // Check if recipient is typing
  const isRecipientTyping = Boolean(typingUsers[recipientId]);

  // Add a function to render the read status indicator
  const renderReadStatus = (message: Message) => {
    if (message.senderId !== userId) return null;
    
    return (
      <div className="text-xs text-gray-500 mt-1 flex items-center justify-end">
        {message.read ? (
          <div className="flex items-center">
            <span className="mr-1">Seen</span>
            <div className="h-4 w-4 rounded-full overflow-hidden border border-blue-500">
              <img 
                src={recipientInfo?.photoURL} 
                alt="" 
                className="h-full w-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = ''; // Clear src to show fallback
                }} 
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center">
            <span>Sent</span>
            <Check className="h-3 w-3 text-gray-400 ml-1" />
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className={`flex flex-col h-[75vh] ${className}`}>
      <CardHeader className="border-b p-4 flex-shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Avatar className="h-10 w-10 mr-3">
              <AvatarImage src={recipientInfo?.photoURL} alt={recipientInfo?.name} />
              <AvatarFallback>{recipientInfo?.name?.[0] || "U"}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{recipientInfo?.name || "User"}</CardTitle>
              {recipientInfo?.isSeller && (
                <Badge variant="outline" className="text-xs">Seller</Badge>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => setIsDeleteDialogOpen(true)}
                className="text-red-500 cursor-pointer"
              >
                <Trash className="h-4 w-4 mr-2" />
                Delete Conversation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col justify-center items-center h-full text-center">
            <div className="bg-gray-100 rounded-full p-4 mb-3">
              <MessageCircle className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-1">No messages yet</p>
            <p className="text-gray-400 text-sm">Send a message to start the conversation</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const isOwnMessage = message.senderId === userId;
              const isSystem = message.senderId === "system";
              const showDate = shouldShowDate(index);
              
              return (
                <React.Fragment key={message.id}>
                  {showDate && (
                    <div className="flex justify-center my-4">
                      <Badge variant="outline" className="bg-gray-100">
                        {formatDate(message.timestamp)}
                      </Badge>
                    </div>
                  )}
                  
                  {isSystem ? (
                    <div className="flex justify-center">
                      <div className="bg-blue-50 rounded-lg p-2 px-3 text-sm text-center max-w-[80%]">
                        {message.content}
                      </div>
                    </div>
                  ) : (
                    <div className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} items-end mb-3`}>
                      {!isOwnMessage && (
                        <Avatar className="h-8 w-8 mr-2 flex-shrink-0">
                          <AvatarImage src={recipientInfo?.photoURL} alt={recipientInfo?.name} />
                          <AvatarFallback>{recipientInfo?.name?.[0] || "U"}</AvatarFallback>
                        </Avatar>
                      )}
                      <div className="flex flex-col max-w-[70%]">
                        {!isOwnMessage && (
                          <span className="text-xs text-gray-500 mb-1 ml-2">{recipientInfo?.name}</span>
                        )}
                        <div
                          className={`p-3 rounded-lg ${
                            isOwnMessage
                              ? "bg-primary text-primary-foreground rounded-br-none"
                              : "bg-gray-100 rounded-bl-none"
                          }`}
                        >
                          {message.deleted ? (
                            <div className="italic text-gray-500 text-sm flex items-center">
                              <Trash className="h-3 w-3 mr-1 opacity-70" />
                              This message was deleted
                            </div>
                          ) : (
                            <>
                              <div className="break-words">{message.content}</div>
                              {message.imageUrl && (
                                <img
                                  src={message.imageUrl}
                                  alt="Shared image"
                                  className="mt-2 rounded-md max-h-60 w-auto object-contain"
                                />
                              )}
                            </>
                          )}
                          <div
                            className={`text-xs mt-1 ${
                              isOwnMessage ? "text-primary-foreground/70" : "text-gray-500"
                            }`}
                          >
                            {formatTime(message.timestamp)}
                          </div>
                        </div>
                        
                        {/* Add read status indicator */}
                        {isOwnMessage && !message.deleted && renderReadStatus(message)}
                        
                        {isOwnMessage && !message.deleted && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="self-end px-2 h-6 text-xs mt-1 text-gray-500 hover:text-red-500"
                            onClick={() => handleDeleteMessage(message.id)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                      {isOwnMessage && (
                        <Avatar className="h-8 w-8 ml-2 flex-shrink-0">
                          <AvatarImage src={userInfo?.photoURL} alt={userInfo?.name} />
                          <AvatarFallback>{userInfo?.name?.[0] || "U"}</AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
            
            {/* Typing indicator */}
            {isRecipientTyping && (
              <div className="flex items-center">
                <div className="bg-gray-100 px-3 py-2 rounded-full text-gray-500 text-sm animate-pulse">
                  typing...
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </CardContent>
      
      <div className="p-3 border-t">
        <div className="flex gap-2">
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
            >
              <Smile className="h-5 w-5 text-gray-500" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={handleLocationShare}
            >
              <MapPin className="h-5 w-5 text-gray-500" />
            </Button>
          </div>
          
          <Input
            placeholder="Type a message..."
            value={messageText}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            className="flex-1"
          />
          
          <Button
            size="icon"
            className="rounded-full"
            onClick={handleSendMessage}
            disabled={!messageText.trim() || isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        {isEmojiPickerOpen && (
          <div className="mt-2 absolute bottom-16 z-10">
            <EmojiPicker onEmojiClick={handleAddEmoji} />
          </div>
        )}
      </div>
      
      {/* Delete conversation confirmation dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this entire conversation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConversation}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              <Trash className="h-4 w-4 mr-2" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default Chat; 