import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  MessageCircle, 
  Send, 
  Loader2, 
  X, 
  MinusCircle, 
  Bot 
} from "lucide-react";
import { 
  processBotMessage, 
  getBotConversationHistory, 
  BotMessage,
  isConsumerUser 
} from "@/services/assistantBotService";
import { auth } from "../pages/firebase";
import { useToast } from "@/components/ui/use-toast";

const ShoppingAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<BotMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isConsumer, setIsConsumer] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Get current user
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUserId(user.uid);
        // Check if user is a consumer
        const consumer = await isConsumerUser(user.uid);
        setIsConsumer(consumer);
      } else {
        setUserId(null);
        setIsConsumer(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Load messages when component mounts and userId changes
  useEffect(() => {
    if (!userId || !isConsumer) return () => {};

    // If no messages, send a greeting
    if (messages.length === 0) {
      handleGreeting();
    }

    // Get message history
    const unsubscribe = getBotConversationHistory(userId, (chatMessages) => {
      setMessages(chatMessages);
    });

    return () => unsubscribe();
  }, [userId, isConsumer]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initial greeting
  const handleGreeting = async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      await processBotMessage(userId, "hi");
    } catch (error) {
      console.error("Error sending greeting:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Send message to bot
  const handleSendMessage = async () => {
    if (!message.trim() || !userId) return;

    setIsLoading(true);
    const userInput = message;
    setMessage("");

    try {
      await processBotMessage(userId, userInput);
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle the chat window
  const toggleChat = () => {
    if (!isOpen && !userId) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to use the shopping assistant.",
      });
      return;
    }

    if (!isOpen && !isConsumer) {
      toast({
        title: "Not Available",
        description: "The shopping assistant is only available for customers.",
      });
      return;
    }

    setIsOpen(!isOpen);
    setIsMinimized(false);
  };

  // Toggle minimized state
  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  // Format timestamp
  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Add a handler for suggestion clicks
  const handleSuggestionClick = async (question: string) => {
    if (!userId) return;
    
    setIsLoading(true);
    setMessage("");
    
    try {
      await processBotMessage(userId, question);
    } catch (error) {
      console.error("Error sending suggestion:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Check if bot is available
  if (!isConsumer && userId !== null) {
    return null; // Don't show for non-consumers
  }

  return (
    <>
      {/* Chat toggle button */}
      <Button
        onClick={toggleChat}
        className="fixed bottom-4 right-4 rounded-full w-12 h-12 p-0 shadow-lg bg-brand-green text-white"
        aria-label="Open shopping assistant"
      >
        <MessageCircle size={24} />
      </Button>

      {/* Chat window */}
      {isOpen && (
        <Card className={`fixed bottom-20 right-4 w-80 md:w-96 shadow-xl z-50 transition-all duration-300 ${
          isMinimized ? 'h-16' : 'h-[500px]'
        }`}>
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0 border-b">
            <CardTitle className="text-md font-medium flex items-center">
              <Bot className="h-5 w-5 mr-2 text-brand-green" />
              Shopping Assistant
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full" 
                onClick={toggleMinimize}
              >
                <MinusCircle className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full" 
                onClick={toggleChat}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          {!isMinimized && (
            <>
              <CardContent className="p-4 overflow-y-auto flex-1" style={{ height: "calc(100% - 130px)" }}>
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.sender === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {msg.sender === "bot" && (
                        <Avatar className="h-8 w-8 mr-2">
                          <AvatarFallback className="bg-brand-green text-white">
                            <Bot className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          msg.sender === "user"
                            ? "bg-brand-green text-white rounded-br-none"
                            : "bg-gray-100 rounded-bl-none"
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p className={`text-xs mt-1 ${
                          msg.sender === "user" ? "text-white/70" : "text-gray-500"
                        }`}>
                          {formatTimestamp(msg.timestamp)}
                        </p>
                      </div>
                      {msg.sender === "user" && (
                        <Avatar className="h-8 w-8 ml-2">
                          <AvatarImage src={auth.currentUser?.photoURL || ""} alt="User" />
                          <AvatarFallback>
                            {auth.currentUser?.displayName?.[0] || "U"}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <Avatar className="h-8 w-8 mr-2">
                        <AvatarFallback className="bg-brand-green text-white">
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-gray-100 rounded-lg p-3 rounded-bl-none">
                        <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                  
                  {/* Suggestion chips */}
                  {!isLoading && messages.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2 justify-center">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs"
                        onClick={() => handleSuggestionClick("Tell me about HUBA")}
                        disabled={isLoading}
                      >
                        About HUBA
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs"
                        onClick={() => handleSuggestionClick("What's your shipping policy?")}
                        disabled={isLoading}
                      >
                        Shipping
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs"
                        onClick={() => handleSuggestionClick("I need outfit ideas")}
                        disabled={isLoading}
                      >
                        Outfit Ideas
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs"
                        onClick={() => handleSuggestionClick("Tell me about your sustainable products")}
                        disabled={isLoading}
                      >
                        Sustainable Products
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
              
              <CardFooter className="p-3 border-t">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex w-full items-center space-x-2"
                >
                  <Input
                    placeholder="Type your question..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="flex-1"
                    disabled={isLoading || !userId}
                  />
                  <Button 
                    type="submit" 
                    size="icon" 
                    disabled={isLoading || !message.trim() || !userId}
                    className="rounded-full"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              </CardFooter>
            </>
          )}
        </Card>
      )}
    </>
  );
};

export default ShoppingAssistant; 