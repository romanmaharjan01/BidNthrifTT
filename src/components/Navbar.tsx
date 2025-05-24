import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ShoppingBag,
  Heart,
  User,
  Menu,
  X,
  Bell,
  MessageCircle,
  Image,
  Smile,
  Send,
  Trash,
  Check,
  LogOut,
} from "lucide-react";
import { auth, db } from "../pages/firebase";
import { signOut } from "firebase/auth";
import { collection, onSnapshot, query, where, updateDoc, doc } from "firebase/firestore";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  getUnreadMessageCount,
  getConversationPreviews,
  markMessagesAsRead,
  sendMessage,
  getMessages,
  deleteMessage,
} from "@/services/chatService";
import { ChatPreview, Message } from "@/models/chat";
import { formatChatTime } from "@/utils/dateUtils";
import { Textarea } from "@/components/ui/textarea";
import EmojiPicker from "emoji-picker-react";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  userId: string;
  auctionId: string;
  message: string;
  status: "unread" | "read";
  timestamp: string;
  type: "won" | "outbid" | "payment";
  actionUrl?: string; // Maps to 'link' in Firestore
  orderId?: string; // Add orderId for payment notifications related to orders
}

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [chatPreviews, setChatPreviews] = useState<ChatPreview[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [selectedChatUser, setSelectedChatUser] = useState<{ id: string; name: string; image: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUserId(user.uid);
        setIsAuthenticated(true);
      } else {
        setUserId(null);
        setIsAuthenticated(false);
        setNotifications([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      return;
    }

    const notificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", userId)
    );

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const notificationList = snapshot.docs.map((doc) => {
          const data = doc.data();
          // Dynamically construct actionUrl based on notification type if link is missing or incorrect
          let computedActionUrl = data.link;
          if (!computedActionUrl || computedActionUrl === "/user-details/purchases") {
            if (data.type === "payment") {
              // For payment notifications, redirect to /payment with orderId or auctionId
              computedActionUrl = data.orderId
                ? `/payment/order_${data.orderId}`
                : data.auctionId
                ? `/payment/auction_${data.auctionId}`
                : "/user-details/purchases"; // Fallback
            } else if (data.type === "won" || data.type === "outbid") {
              // For auction-related notifications, redirect to auction page
              computedActionUrl = data.auctionId ? `/auctions/${data.auctionId}` : "/auctions";
            }
          }

          return {
            id: doc.id,
            userId: data.userId,
            auctionId: data.auctionId || "",
            message: data.message,
            status: data.status,
            timestamp: data.timestamp,
            type: data.type,
            actionUrl: computedActionUrl,
            orderId: data.orderId || "", // Extract orderId if present
          } as Notification;
        });
        const sortedNotifications = notificationList.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setNotifications(sortedNotifications);

        sortedNotifications.forEach((notification) => {
          if (notification.status === "unread") {
            toast.info(`${notification.message} (${formatNotificationDate(notification.timestamp)})`, {
              position: "top-right",
              autoClose: 5000,
              onClick: () => handleNotificationClick(notification),
            });
          }
        });
      },
      (error) => {
        toast.error(`Error fetching notifications: ${error.message}`, {
          position: "top-right",
          autoClose: 5000,
        });
      }
    );

    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setUnreadMessages(0);
      return () => {};
    }
    const unsubscribe = getUnreadMessageCount(userId, (count) => {
      setUnreadMessages(count);
    });
    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setChatPreviews([]);
      return () => {};
    }
    const unsubscribe = getConversationPreviews(userId, (previews) => {
      setChatPreviews(previews);
    });
    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    if (!selectedChat) {
      setMessages([]);
      return () => {};
    }
    const unsubscribe = getMessages(selectedChat, (chatMessages) => {
      setMessages(chatMessages);
    });
    if (userId) {
      markMessagesAsRead(selectedChat, userId);
    }
    return () => unsubscribe();
  }, [selectedChat, userId]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, "notifications", notificationId), { status: "read" });
    } catch (error) {
      toast.error(`Failed to mark notification as read: ${error.message}`, {
        position: "top-right",
        autoClose: 5000,
      });
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    console.log("Notification clicked:", notification); // Debug log
    console.log("Redirecting to:", notification.actionUrl); // Debug log
    await markAsRead(notification.id);
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      setIsNotificationsOpen(false);
    } else {
      // Fallback redirection if actionUrl is missing
      if (notification.type === "payment") {
        const redirectUrl = notification.orderId
          ? `/payment/order_${notification.orderId}`
          : notification.auctionId
          ? `/payment/auction_${notification.auctionId}`
          : "/user-details/purchases";
        navigate(redirectUrl);
      } else if (notification.type === "won" || notification.type === "outbid") {
        const redirectUrl = notification.auctionId ? `/auctions/${notification.auctionId}` : "/auctions";
        navigate(redirectUrl);
      }
      setIsNotificationsOpen(false);
    }
  };

  const formatNotificationDate = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return "Invalid date";
    }
  };

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const toggleNotifications = () => setIsNotificationsOpen(!isNotificationsOpen);
  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
    setSelectedChat(null);
  };

  const openChat = async (preview: ChatPreview) => {
    setSelectedChat(preview.id);
    setSelectedChatUser({
      id: preview.participantId,
      name: preview.participantName,
      image: preview.participantImage,
    });
    if (userId) {
      await markMessagesAsRead(preview.id, userId);
    }
  };

  const backToConversations = () => {
    setSelectedChat(null);
    setSelectedChatUser(null);
  };

  const handleSendMessage = async () => {
    if (!userId || !selectedChat || !selectedChatUser || !messageText.trim()) return;
    try {
      await sendMessage(selectedChat, userId, selectedChatUser.id, messageText.trim());
      setMessageText("");
    } catch (error) {
      toast.error(`Failed to send message: ${error.message}`, {
        position: "top-right",
        autoClose: 5000,
      });
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!selectedChat) return;
    try {
      await deleteMessage(selectedChat, messageId);
    } catch (error) {
      toast.error(`Failed to delete message: ${error.message}`, {
        position: "top-right",
        autoClose: 5000,
      });
    }
  };

  const handleEmojiSelect = (emojiData: any) => {
    setMessageText((prev) => prev + emojiData.emoji);
    setIsEmojiPickerOpen(false);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("You have been successfully logged out.", {
        position: "top-right",
        autoClose: 5000,
      });
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to log out. Please try again.", {
        position: "top-right",
        autoClose: 5000,
      });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <ToastContainer />
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl font-bold tracking-tight text-brand-green">
            Bid<span className="text-brand-accent-yellow">N</span>thrifT
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link to="/shop" className="text-sm font-medium hover:text-brand-green transition-colors">
            Shop
          </Link>
          <Link to="/auctions" className="text-sm font-medium hover:text-brand-green transition-colors">
            Auctions
          </Link>
          <Link to="/about" className="text-sm font-medium hover:text-brand-green transition-colors">
            About
          </Link>
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <div className="relative">
            <Button variant="ghost" size="icon" onClick={toggleChat}>
              <MessageCircle className="h-5 w-5" />
              {unreadMessages > 0 && (
                <span className="absolute top-0 right-0 h-2 w-2 bg-red-600 rounded-full"></span>
              )}
              <span className="sr-only">Messages</span>
            </Button>

            {isChatOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border rounded-md shadow-lg z-50">
                <div className="h-96 flex flex-col">
                  <div className="p-3 border-b flex justify-between items-center">
                    <h3 className="text-sm font-semibold">
                      {selectedChat ? (
                        <button onClick={backToConversations} className="flex items-center">
                          <X className="h-4 w-4 mr-2" /> {selectedChatUser?.name}
                        </button>
                      ) : (
                        "Messages"
                      )}
                    </h3>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {!selectedChat ? (
                      chatPreviews.length > 0 ? (
                        <div className="divide-y">
                          {chatPreviews.map((preview) => (
                            <div
                              key={preview.id}
                              className={`p-3 hover:bg-gray-50 cursor-pointer ${
                                preview.unreadCount > 0 ? "bg-gray-100" : ""
                              }`}
                              onClick={() => openChat(preview)}
                            >
                              <div className="flex items-center">
                                <Avatar className="h-10 w-10 mr-3">
                                  <AvatarImage src={preview.participantImage} />
                                  <AvatarFallback>{preview.participantName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-baseline">
                                    <p className="text-sm font-medium truncate">{preview.participantName}</p>
                                    {preview.timestamp && (
                                      <p className="text-xs text-gray-500">{formatChatTime(preview.timestamp)}</p>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 truncate">{preview.lastMessage || "No messages yet"}</p>
                                </div>
                                {preview.unreadCount > 0 && (
                                  <span className="ml-2 bg-brand-green text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                    {preview.unreadCount}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-6 text-center text-sm text-gray-500">
                          <p>No conversations yet</p>
                        </div>
                      )
                    ) : (
                      <div className="flex flex-col h-full">
                        <div className="flex-1 p-3 overflow-y-auto">
                          {messages.map((message) => {
                            const isOwnMessage = message.senderId === userId;
                            const isSystemMessage = message.senderId === "system";

                            return (
                              <div
                                key={message.id}
                                className={`mb-2 flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                              >
                                {isSystemMessage ? (
                                  <div className="bg-gray-100 p-2 rounded-md text-xs text-center w-full">
                                    {message.content}
                                  </div>
                                ) : (
                                  <div className="max-w-[80%]">
                                    <div
                                      className={`relative group p-2 rounded-lg ${
                                        isOwnMessage
                                          ? "bg-brand-green text-white rounded-br-none"
                                          : "bg-gray-200 rounded-bl-none"
                                      }`}
                                    >
                                      {message.content}
                                      {message.imageUrl && (
                                        <img
                                          src={message.imageUrl}
                                          alt="Shared"
                                          className="mt-2 rounded-md max-w-full"
                                        />
                                      )}
                                      <div className="text-xs text-right mt-1 opacity-70">
                                        {formatChatTime(message.timestamp)}
                                        {message.read && isOwnMessage && (
                                          <Check className="inline-block ml-1 h-3 w-3" />
                                        )}
                                      </div>

                                      {isOwnMessage && (
                                        <button
                                          onClick={() => handleDeleteMessage(message.id)}
                                          className="absolute -top-3 -right-3 bg-white rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          <Trash className="h-3 w-3 text-red-500" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          <div ref={messagesEndRef} />
                        </div>

                        <div className="p-3 border-t">
                          <div className="relative">
                            <Textarea
                              value={messageText}
                              onChange={(e) => setMessageText(e.target.value)}
                              placeholder="Type a message..."
                              className="resize-none pr-20"
                              rows={1}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSendMessage();
                                }
                              }}
                            />
                            <div className="absolute right-2 bottom-2 flex space-x-1">
                              <button
                                type="button"
                                onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                                className="p-1 text-gray-500 hover:text-gray-700"
                              >
                                <Smile className="h-5 w-5" />
                              </button>
                              <button
                                type="button"
                                onClick={handleSendMessage}
                                disabled={!messageText.trim()}
                                className={`p-1 ${messageText.trim() ? "text-brand-green" : "text-gray-300"}`}
                              >
                                <Send className="h-5 w-5" />
                              </button>
                            </div>
                            {isEmojiPickerOpen && (
                              <div className="absolute bottom-full right-0 mb-2 z-10">
                                <EmojiPicker onEmojiClick={handleEmojiSelect} />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <Button variant="ghost" size="icon" onClick={toggleNotifications}>
              <Bell className="h-5 w-5" />
              {notifications.filter((n) => n.status === "unread").length > 0 && (
                <span className="absolute top-0 right-0 h-2 w-2 bg-red-600 rounded-full"></span>
              )}
              <span className="sr-only">Notifications</span>
            </Button>

            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border rounded-md shadow-lg z-50">
                <div className="p-4">
                  <h3 className="text-sm font-semibold">Notifications</h3>
                  {notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-2 border-b text-sm cursor-pointer ${
                          notification.status === "unread" ? "bg-gray-100 font-semibold" : ""
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <p>{notification.message}</p>
                        <p className="text-xs text-gray-500">{formatNotificationDate(notification.timestamp)}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No notifications</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <Button variant="ghost" size="icon" asChild>
            <Link to="/favorites">
              <Heart className="h-5 w-5" />
              <span className="sr-only">Favorites</span>
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link to="/cart">
              <ShoppingBag className="h-5 w-5" />
              <span className="sr-only">Cart</span>
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link to="/user-details/profile">
              <User className="h-5 w-5" />
              <span className="sr-only">Profile</span>
            </Link>
          </Button>

          {isAuthenticated ? (
            <Button onClick={handleLogout} className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              Log Out
            </Button>
          ) : (
            <Button asChild>
              <Link to="/login">Sign In</Link>
            </Button>
          )}
        </div>

        <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleMenu}>
          {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          <span className="sr-only">Menu</span>
        </Button>
      </div>

      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 z-50 bg-background p-4">
          <nav className="flex flex-col gap-4 pt-4">
            <Link
              to="/shop"
              className="flex h-10 items-center border-b border-border px-4 text-sm font-medium"
              onClick={toggleMenu}
            >
              Shop
            </Link>
            <Link
              to="/auctions"
              className="flex h-10 items-center border-b border-border px-4 text-sm font-medium"
              onClick={toggleMenu}
            >
              Auctions
            </Link>
            <Link
              to="/about"
              className="flex h-10 items-center border-b border-border px-4 text-sm font-medium"
              onClick={toggleMenu}
            >
              About
            </Link>
            <Link
              to="/messages"
              className="flex h-10 items-center border-b border-border px-4 text-sm font-medium"
              onClick={toggleMenu}
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Messages
              {unreadMessages > 0 && <span className="ml-2 h-2 w-2 bg-red-600 rounded-full"></span>}
            </Link>
            <Link
              to="/notifications"
              className="flex h-10 items-center border-b border-border px-4 text-sm font-medium"
              onClick={toggleMenu}
            >
              <Bell className="mr-2 h-4 w-4" />
              Notifications
              {notifications.filter((n) => n.status === "unread").length > 0 && (
                <span className="ml-2 h-2 w-2 bg-red-600 rounded-full"></span>
              )}
            </Link>
            <Link
              to="/favorites"
              className="flex h-10 items-center border-b border-border px-4 text-sm font-medium"
              onClick={toggleMenu}
            >
              <Heart className="mr-2 h-4 w-4" />
              Favorites
            </Link>
            <Link
              to="/cart"
              className="flex h-10 items-center border-b border-border px-4 text-sm font-medium"
              onClick={toggleMenu}
            >
              <ShoppingBag className="mr-2 h-4 w-4" />
              Cart
            </Link>
            <Link
              to="/user-details/profile"
              className="flex h-10 items-center border-b border-border px-4 text-sm font-medium"
              onClick={toggleMenu}
            >
              <User className="mr-2 h-4 w-4" />
              Profile
            </Link>
            <div className="flex flex-col gap-2 pt-4">
              {isAuthenticated ? (
                <Button
                  onClick={() => {
                    handleLogout();
                    toggleMenu();
                  }}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Log Out
                </Button>
              ) : (
                <>
                  <Button asChild className="w-full">
                    <Link to="/login" onClick={toggleMenu}>
                      Sign In
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/register" onClick={toggleMenu}>
                      Create Account
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;