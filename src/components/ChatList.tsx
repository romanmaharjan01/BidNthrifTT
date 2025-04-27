import React, { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageCircle, Search, Filter, Clock, Check } from "lucide-react";
import { getConversationPreviews } from "@/services/chatService";
import { ChatPreview } from "@/models/chat";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ChatListProps {
  userId: string;
  onChatSelect: (chatId: string, participantId: string) => void;
  selectedChatId?: string;
  className?: string;
}

const ChatList: React.FC<ChatListProps> = ({
  userId,
  onChatSelect,
  selectedChatId,
  className = ""
}) => {
  const [chatPreviews, setChatPreviews] = useState<ChatPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "orders">("all");

  // Subscribe to chat previews for the current user
  useEffect(() => {
    if (!userId) {
      setChatPreviews([]);
      setIsLoading(false);
      return () => {};
    }

    setIsLoading(true);
    const unsubscribe = getConversationPreviews(userId, (previews) => {
      setChatPreviews(previews);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const formatLastActive = (timestamp: any) => {
    if (!timestamp) return "Unknown";

    const now = new Date();
    const messageDate = new Date(timestamp);
    const diffMs = now.getTime() - messageDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return messageDate.toLocaleDateString();
  };

  // Filter and search chat previews
  const filteredChatPreviews = chatPreviews
    .filter(preview => {
      if (filter === "unread") return preview.unreadCount > 0;
      if (filter === "orders") return preview.hasOrder;
      return true;
    })
    .filter(preview => {
      if (!searchQuery.trim()) return true;
      const searchLower = searchQuery.toLowerCase();
      return (
        preview.participantName.toLowerCase().includes(searchLower) ||
        (preview.lastMessage && preview.lastMessage.toLowerCase().includes(searchLower))
      );
    })
    .sort((a, b) => {
      // Sort unread conversations first, then by most recent
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
      
      // Then sort by timestamp (most recent first)
      const timeA = a.lastMessageTimestamp ? new Date(a.lastMessageTimestamp).getTime() : 0;
      const timeB = b.lastMessageTimestamp ? new Date(b.lastMessageTimestamp).getTime() : 0;
      return timeB - timeA;
    });

  const handleChatSelect = (chatId: string, participantId: string) => {
    onChatSelect(chatId, participantId);
  };

  if (isLoading) {
    return (
      <Card className={`h-[500px] flex items-center justify-center ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </Card>
    );
  }

  return (
    <Card className={`h-[500px] flex flex-col ${className}`}>
      <CardHeader className="py-3 border-b space-y-2">
        <CardTitle className="flex justify-between items-center">
          <span>Messages</span>
          <Badge variant="outline" className="flex items-center">
            <Clock className="mr-1 h-3 w-3" /> Live
          </Badge>
        </CardTitle>
        
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search messages..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Tabs defaultValue="all" className="w-full" onValueChange={(value) => setFilter(value as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">Unread</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-0 overflow-hidden">
        <div className="overflow-y-auto h-full">
          {filteredChatPreviews.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <MessageCircle className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>No conversations found</p>
              <p className="text-xs mt-2">
                {searchQuery 
                  ? "Try a different search term" 
                  : filter !== "all" 
                    ? "Try a different filter" 
                    : "Start a conversation to see it here"}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredChatPreviews.map((preview) => (
                <div
                  key={preview.id}
                  className={`p-3 flex gap-3 hover:bg-gray-50 cursor-pointer ${
                    selectedChatId === preview.id ? "bg-gray-50" : ""
                  }`}
                  onClick={() => handleChatSelect(preview.id, preview.participantId)}
                >
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={preview.participantImage} alt={preview.participantName} />
                      <AvatarFallback>{preview.participantName?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                    {preview.unreadCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center">
                        {preview.unreadCount}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium truncate">{preview.participantName}</h3>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatLastActive(preview.lastMessageTimestamp)}
                      </span>
                    </div>
                    
                    <div className="flex items-center">
                      <p className={`text-sm truncate flex-1 ${
                        preview.unreadCount > 0 ? "font-medium text-black" : "text-gray-500"
                      }`}>
                        {preview.lastMessageSender === userId ? (
                          <>
                            <span>You: </span>
                            {preview.lastMessage && (
                              <span className="ml-1 inline-flex items-center">
                                {preview.unreadCount === 0 && <Check className="h-3 w-3 text-gray-400 inline ml-1" />}
                              </span>
                            )}
                          </>
                        ) : ""}
                        <span>{preview.lastMessage || "No messages yet"}</span>
                      </p>
                    </div>
                    
                    {preview.hasOrder && (
                      <Badge variant="outline" className="mt-1 text-xs">
                        Order
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatList; 