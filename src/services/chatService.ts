import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  getDoc,
  doc, 
  updateDoc, 
  serverTimestamp, 
  onSnapshot,
  orderBy,
  Timestamp,
  setDoc,
  arrayUnion,
  limit,
  deleteDoc,
  deleteField
} from "firebase/firestore";
import { db, auth } from "../pages/firebase";
import { ChatConversation, Message, ChatPreview } from "../models/chat";

// Check if a user is an admin
export const isAdminUser = async (userId: string): Promise<boolean> => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.role === "admin";
    }
    return false;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
};

// Get or create a conversation between two users
export const getOrCreateConversation = async (
  userId1: string, 
  userId2: string,
  productId?: string,
  auctionId?: string
): Promise<string> => {
  try {
    // Validate user IDs to ensure they're not empty
    if (!userId1 || !userId2) {
      throw new Error("User IDs cannot be empty");
    }
    
    // Check if either user is an admin - if so, block chat creation
    const [isUser1Admin, isUser2Admin] = await Promise.all([
      isAdminUser(userId1),
      isAdminUser(userId2)
    ]);
    
    if (isUser1Admin || isUser2Admin) {
      throw new Error("Chat with admin users is not allowed");
    }

    // Check if a conversation already exists
    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", userId1)
    );
    
    const querySnapshot = await getDocs(q);
    let existingConversation: ChatConversation | null = null;
    
    querySnapshot.forEach((doc) => {
      const data = doc.data() as ChatConversation;
      if (data.participants.includes(userId2)) {
        existingConversation = { ...data, id: doc.id };
      }
    });
    
    if (existingConversation) {
      return existingConversation.id;
    }
    
    // Create a new conversation
    const unreadCountObj: Record<string, number> = {};
    unreadCountObj[userId1] = 0;
    unreadCountObj[userId2] = 0;

    // Define conversation with proper typing
    const newConversation: any = {
      participants: [userId1, userId2],
      unreadCount: unreadCountObj,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessage: {
        content: "",
        timestamp: new Date().toISOString(),
        senderId: "system"
      },
      typing: {}
    };
    
    // Add productId and auctionId only if they are valid strings
    if (productId && typeof productId === 'string' && productId.trim() !== '') {
      newConversation.productId = productId;
    }
    
    if (auctionId && typeof auctionId === 'string' && auctionId.trim() !== '') {
      newConversation.auctionId = auctionId;
    }
    
    const conversationRef = await addDoc(collection(db, "conversations"), newConversation);
    return conversationRef.id;
  } catch (error) {
    console.error("Error getting/creating conversation:", error);
    throw error;
  }
};

// Send a message in a conversation
export const sendMessage = async (
  conversationId: string, 
  senderId: string, 
  receiverId: string, 
  content: string,
  imageUrl?: string,
  emoji?: string
): Promise<string> => {
  try {
    // Validate required fields
    if (!conversationId || !senderId || !receiverId || !content.trim()) {
      throw new Error("Required message fields are missing or empty");
    }
    
    // Check if sender is an admin
    const isAdmin = await isAdminUser(senderId);
    if (isAdmin) {
      throw new Error("Admin users cannot send messages");
    }

    // Create the message with proper typing
    const message: any = {
      senderId,
      receiverId,
      content,
      timestamp: new Date().toISOString(),
      read: false
    };
    
    // Add optional fields only if they have actual values
    if (imageUrl && imageUrl.trim() !== '') {
      message.imageUrl = imageUrl;
    }
    
    if (emoji && emoji.trim() !== '') {
      message.emoji = emoji;
    }
    
    // Clear typing indicator when sending a message
    await updateTypingStatus(conversationId, senderId, false);
    
    // Add message to the messages subcollection
    const messageRef = await addDoc(
      collection(db, "conversations", conversationId, "messages"), 
      message
    );
    
    // Get the current conversation document
    const conversationDoc = await getDoc(doc(db, "conversations", conversationId));
    if (!conversationDoc.exists()) {
      throw new Error("Conversation not found");
    }
    
    const conversationData = conversationDoc.data();
    
    // Ensure unreadCount exists and has a valid value for the receiver
    let unreadCounts = {};
    if (conversationData.unreadCount && typeof conversationData.unreadCount === 'object') {
      unreadCounts = conversationData.unreadCount;
    } else {
      // If unreadCount is missing or invalid, initialize it
      unreadCounts = {};
      unreadCounts[senderId] = 0;
      unreadCounts[receiverId] = 0;
    }
    
    // Update the unread count for the receiver
    const currentUnreadCount = unreadCounts[receiverId] || 0;
    unreadCounts[receiverId] = currentUnreadCount + 1;
    
    // Update conversation with last message and increment unread count
    await updateDoc(doc(db, "conversations", conversationId), {
      lastMessage: {
        content,
        timestamp: new Date().toISOString(),
        senderId
      },
      updatedAt: serverTimestamp(),
      unreadCount: unreadCounts
    });
    
    console.log(`Message sent in conversation ${conversationId}. Unread count for ${receiverId} updated to ${currentUnreadCount + 1}`);
    
    return messageRef.id;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

// Set typing status for a user in a conversation
export const updateTypingStatus = async (
  conversationId: string,
  userId: string,
  isTyping: boolean
): Promise<void> => {
  try {
    if (!conversationId || !userId) return;
    
    const updates: any = {};
    if (isTyping) {
      updates[`typing.${userId}`] = new Date().toISOString();
    } else {
      updates[`typing.${userId}`] = deleteField();
    }
    
    await updateDoc(doc(db, "conversations", conversationId), updates);
  } catch (error) {
    console.error("Error updating typing status:", error);
  }
};

// Get real-time typing status for a conversation
export const getTypingStatus = (
  conversationId: string,
  callback: (typingUsers: Record<string, string>) => void
): (() => void) => {
  const conversationRef = doc(db, "conversations", conversationId);
  
  return onSnapshot(conversationRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      const typing = data.typing || {};
      
      // Filter out null values and recently expired typing indicators (older than 5 seconds)
      const now = new Date().getTime();
      const activeTyping: Record<string, string> = {};
      
      Object.entries(typing).forEach(([userId, timestamp]) => {
        if (timestamp) {
          const typingTime = new Date(timestamp as string).getTime();
          if (now - typingTime < 5000) { 
            activeTyping[userId] = timestamp as string;
          }
        }
      });
      
      callback(activeTyping);
    } else {
      callback({});
    }
  }, (error) => {
    console.error("Error getting typing status:", error);
    callback({});
  });
};

// Get messages for a conversation
export const getMessages = (
  conversationId: string,
  callback: (messages: Message[]) => void
): (() => void) => {
  const q = query(
    collection(db, "conversations", conversationId, "messages"),
    orderBy("timestamp", "asc")
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const messages: Message[] = [];
    querySnapshot.forEach((doc) => {
      messages.push({ id: doc.id, ...doc.data() } as Message);
    });
    callback(messages);
  }, (error) => {
    console.error("Error getting messages:", error);
  });
};

// Mark messages as read
export const markMessagesAsRead = async (conversationId: string, userId: string): Promise<void> => {
  try {
    // Update conversation unread count
    await updateDoc(doc(db, "conversations", conversationId), {
      [`unreadCount.${userId}`]: 0
    });
    
    // Get unread messages
    const messagesQuery = query(
      collection(db, "conversations", conversationId, "messages"),
      where("receiverId", "==", userId),
      where("read", "==", false)
    );
    
    const querySnapshot = await getDocs(messagesQuery);
    
    // Update each message
    const batch = [];
    querySnapshot.forEach((doc) => {
      batch.push(updateDoc(doc.ref, { read: true }));
    });
    
    await Promise.all(batch);
  } catch (error) {
    console.error("Error marking messages as read:", error);
    throw error;
  }
};

// Delete a message (mark as deleted)
export const deleteMessage = async (conversationId: string, messageId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, "conversations", conversationId, "messages", messageId), {
      content: "This message was deleted",
      deleted: true
    });
  } catch (error) {
    console.error("Error deleting message:", error);
    throw error;
  }
};

// Delete an entire conversation
export const deleteConversation = async (conversationId: string): Promise<void> => {
  try {
    // First, get all messages in the conversation
    const messagesQuery = query(collection(db, "conversations", conversationId, "messages"));
    const messagesSnapshot = await getDocs(messagesQuery);
    
    // Delete all message documents
    const messageDeletions = messagesSnapshot.docs.map(doc => 
      deleteDoc(doc.ref)
    );
    
    await Promise.all(messageDeletions);
    
    // Then delete the conversation document itself
    await deleteDoc(doc(db, "conversations", conversationId));
    
  } catch (error) {
    console.error("Error deleting conversation:", error);
    throw error;
  }
};

// Get conversation previews for a user (filtered to exclude admin users)
export const getConversationPreviews = (
  userId: string,
  callback: (previews: ChatPreview[]) => void
): (() => void) => {
  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", userId),
    orderBy("updatedAt", "desc")
  );
  
  return onSnapshot(q, async (querySnapshot) => {
    const previews: ChatPreview[] = [];
    const adminUserIds = new Set<string>();
    
    // First pass - identify all user IDs to check
    const userIdsToCheck: string[] = [];
    querySnapshot.docs.forEach(doc => {
      const data = doc.data() as ChatConversation;
      data.participants.forEach(participantId => {
        if (participantId !== userId && !userIdsToCheck.includes(participantId)) {
          userIdsToCheck.push(participantId);
        }
      });
    });
    
    // Batch check which users are admins
    for (const uid of userIdsToCheck) {
      const isAdmin = await isAdminUser(uid);
      if (isAdmin) {
        adminUserIds.add(uid);
      }
    }
    
    // Now process the conversations, excluding those with admin users
    for (const docSnap of querySnapshot.docs) {
      const conversation = { id: docSnap.id, ...docSnap.data() } as ChatConversation;
      
      // Find the other participant
      const otherParticipantId = conversation.participants.find(id => id !== userId);
      
      if (otherParticipantId && !adminUserIds.has(otherParticipantId)) {
        try {
          // Get user info for other participant
          const userDoc = await getDoc(doc(db, "users", otherParticipantId));
          let participantName = "Unknown User";
          let participantImage = "";
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            // Check for fullName first (from DB screenshot), then fall back to other options
            if (userData.fullName) {
              participantName = userData.fullName;
            } else if (userData.firstName && userData.lastName) {
              participantName = `${userData.firstName} ${userData.lastName}`;
            } else if (userData.displayName) {
              participantName = userData.displayName;
            } else if (userData.email) {
              participantName = userData.email;
            }
            // Check for profileImage first, then fall back to photoURL
            participantImage = userData.profileImage || userData.photoURL || "";
          }
          
          // Check if this conversation has an associated order
          let hasOrder = false;
          let orderId = conversation.orderId;
          
          if (!orderId && (conversation.productId || conversation.auctionId)) {
            // Try to find an order that matches this conversation
            const orderQuery = query(
              collection(db, "orders"),
              where("buyerId", "in", conversation.participants),
              where("sellerId", "in", conversation.participants),
              limit(1)
            );
            
            const orderSnapshot = await getDocs(orderQuery);
            if (!orderSnapshot.empty) {
              orderId = orderSnapshot.docs[0].id;
              hasOrder = true;
            }
          } else if (orderId) {
            hasOrder = true;
          }
          
          // Build the preview
          previews.push({
            id: conversation.id,
            participantId: otherParticipantId,
            participantName,
            participantImage,
            lastMessage: conversation.lastMessage?.content,
            lastMessageSender: conversation.lastMessage?.senderId,
            lastMessageTimestamp: conversation.lastMessage?.timestamp,
            unreadCount: conversation.unreadCount?.[userId] || 0,
            hasOrder,
            orderId,
            productId: conversation.productId,
            auctionId: conversation.auctionId
          });
        } catch (error) {
          console.error("Error getting user details for chat preview:", error);
        }
      }
    }
    
    callback(previews);
  }, (error) => {
    console.error("Error getting conversation previews:", error);
  });
};

// Get total unread message count for a user
export const getUnreadMessageCount = (
  userId: string,
  callback: (count: number) => void
): (() => void) => {
  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", userId)
  );
  
  return onSnapshot(q, (querySnapshot) => {
    let totalUnread = 0;
    
    querySnapshot.forEach((doc) => {
      const conversation = doc.data() as ChatConversation;
      totalUnread += conversation.unreadCount?.[userId] || 0;
    });
    
    callback(totalUnread);
  }, (error) => {
    console.error("Error getting unread message count:", error);
  });
};

// Send an automated message when a purchase is made
export const sendAutomatedPurchaseMessage = async (
  buyerId: string,
  sellerId: string,
  productName: string,
  productId: string,
  orderId: string
): Promise<void> => {
  try {
    const conversationId = await getOrCreateConversation(buyerId, sellerId, productId);
    
    // First check if there are already messages in this conversation
    const messagesQuery = query(
      collection(db, "conversations", conversationId, "messages"),
      limit(1)
    );
    
    const messagesSnapshot = await getDocs(messagesQuery);
    
    // Only send welcome message if this is the first message
    if (messagesSnapshot.empty) {
      // Send welcome message to buyer
      const welcomeMessage = `Thank you for purchasing ${productName}! You can use this chat to communicate with the seller about your order #${orderId}.`;
      await sendMessage(conversationId, "system", buyerId, welcomeMessage);
      
      // Send notification to seller
      await sendMessage(
        conversationId,
        "system",
        sellerId,
        `A buyer has purchased ${productName} (Order #${orderId.substring(0, 8)}). Please await their delivery details.`
      );
      
      // Add location request message as a system message to buyer
      await sendMessage(
        conversationId,
        "system", 
        buyerId,
        `Please share your delivery location details so the seller can arrange shipping.`
      );
      
      // Add a notification message that will appear in both users' chats
      await sendMessage(
        conversationId,
        "system",
        "system",
        `This chat has been activated for order #${orderId.substring(0, 8)}. You can now communicate about delivery details.`
      );
    }
  } catch (error) {
    console.error("Error sending automated message:", error);
    throw error;
  }
};

// Send an automated message when an auction is won
export const sendAutomatedAuctionMessage = async (
  buyerId: string,
  sellerId: string,
  productName: string,
  auctionId: string
): Promise<void> => {
  try {
    const conversationId = await getOrCreateConversation(buyerId, sellerId, undefined, auctionId);
    
    const automatedMessage = `Congratulations on winning the auction for ${productName}! You can use this chat to communicate with the seller about payment and delivery details.`;
    
    await sendMessage(conversationId, "system", buyerId, automatedMessage);
  } catch (error) {
    console.error("Error sending automated auction message:", error);
    throw error;
  }
};

// Send location request message for order
export const sendLocationRequestMessage = async (
  conversationId: string,
  sellerId: string,
  buyerId: string
): Promise<void> => {
  try {
    const locationRequestMessage = "Please share your delivery location details to help with your order.";
    await sendMessage(conversationId, sellerId, buyerId, locationRequestMessage);
  } catch (error) {
    console.error("Error sending location request message:", error);
    throw error;
  }
};

// Initialize chat for order
export const initializeOrderChat = async (
  buyerId: string,
  sellerId: string,
  productId: string,
  productName: string,
  orderId: string
): Promise<string> => {
  try {
    // Get or create conversation
    const conversationId = await getOrCreateConversation(buyerId, sellerId, productId);
    
    // Check if this is a new conversation
    const messagesQuery = query(
      collection(db, "conversations", conversationId, "messages"),
      limit(1)
    );
    
    const messagesSnapshot = await getDocs(messagesQuery);
    
    // Only send automated messages if this is a new conversation
    if (messagesSnapshot.empty) {
      // Welcome message
      await sendMessage(
        conversationId, 
        "system", 
        buyerId, 
        `Thank you for purchasing ${productName}! This chat is now active for order #${orderId.substring(0, 8)}.`
      );
      
      // Location request message - first send a system message that both can see
      await sendMessage(
        conversationId,
        "system",
        sellerId,
        `Seller: Please wait for the buyer to share their delivery location.`
      );
      
      // Send message to buyer asking for location (appears in buyer's chat as from seller)
      await sendMessage(
        conversationId,
        "system",
        buyerId,
        `Please share your delivery location details so the seller can arrange shipping for your order.`
      );
      
      // Add a notification message that will appear in both users' chats
      await sendMessage(
        conversationId,
        "system",
        "system",
        `This chat has been activated for order #${orderId.substring(0, 8)}. You can now communicate about delivery details.`
      );
    }
    
    return conversationId;
  } catch (error) {
    console.error("Error initializing order chat:", error);
    throw error;
  }
}; 