import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import SellerChat from './SellerChat';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

interface Chat {
  id: string;
  buyerId: string;
  sellerId: string;
  lastMessage: string;
  timestamp: number;
  unreadBySeller: boolean;
}

interface User {
  id: string;
  fullName: string;
  profileImage?: string;
}

const SellerChatWrapper: React.FC = () => {
  const { userId } = useOutletContext<{ userId: string }>();
  const [chats, setChats] = useState<Chat[]>([]);
  const [buyers, setBuyers] = useState<Map<string, User>>(new Map());
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      console.log('No userId provided, skipping fetch.');
      setError('No user authenticated. Please log in.');
      setLoading(false);
      return;
    }

    console.log('Fetching chats for sellerId:', userId);
    const q = query(collection(db, 'chats'), where('sellerId', '==', userId));
    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const chatData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as Chat));
        setChats(chatData);

        const buyerIds = [...new Set(chatData.map((chat) => chat.buyerId))];
        const buyerPromises = buyerIds.map(async (buyerId) => {
          try {
            const userDoc = await getDoc(doc(db, 'users', buyerId));
            if (userDoc.exists()) {
              return {
                id: buyerId,
                fullName: userDoc.data().fullName || `Buyer #${buyerId}`,
                profileImage: userDoc.data().profileImage || 'https://placehold.co/50x50',
              } as User;
            }
            return { id: buyerId, fullName: `Buyer #${buyerId}`, profileImage: 'https://placehold.co/50x50' } as User;
          } catch (error) {
            console.error(`Error fetching user data for buyer ${buyerId}:`, error);
            return { id: buyerId, fullName: `Buyer #${buyerId}`, profileImage: 'https://placehold.co/50x50' } as User;
          }
        });

        const buyerData = await Promise.all(buyerPromises);
        setBuyers(new Map(buyerData.map((buyer) => [buyer.id, buyer])));
        setError(null);
        setLoading(false);
      },
      (error: any) => {
        console.error('Error fetching chats:', error.message, error.code);
        setError('Failed to load conversations: ' + error.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  const markChatAsRead = async (chatId: string) => {
    try {
      console.log('Marking chat as read:', chatId);
      await updateDoc(doc(db, 'chats', chatId), {
        unreadBySeller: false,
      });
    } catch (error: any) {
      console.error('Error marking chat as read:', error.message, error.code);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    if (!window.confirm('Are you sure you want to delete this conversation?')) return;

    try {
      console.log('Deleting chat:', chatId);
      // Delete the chat document
      await deleteDoc(doc(db, 'chats', chatId));

      // Delete all messages in the chat
      const messagesQuery = query(collection(db, 'chats', chatId, 'messages'));
      const messagesSnapshot = await getDocs(messagesQuery);
      const deletePromises = messagesSnapshot.docs.map((messageDoc) =>
        deleteDoc(doc(db, 'chats', chatId, 'messages', messageDoc.id))
      );
      await Promise.all(deletePromises);

      // If this was the selected chat, clear the selection
      if (selectedChat === chatId) {
        setSelectedChat(null);
      }
    } catch (error: any) {
      console.error('Error deleting chat:', error.message, error.code);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return <div className="loading">Loading conversations...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="chat-wrapper">
      <div className={`chat-list ${selectedChat ? 'chat-hidden' : ''}`}>
        <h3>Messages</h3>
        {chats.length > 0 ? (
          chats.map((chat) => {
            const buyer = buyers.get(chat.buyerId);
            return (
              <div
                key={chat.id}
                className={`chat-item ${selectedChat === chat.id ? 'active' : ''}`}
                onClick={() => setSelectedChat(chat.id)}
              >
                <div className="profile-circle">
                  {buyer?.profileImage ? (
                    <img src={buyer.profileImage} alt={buyer.fullName} />
                  ) : (
                    <div className="default-profile">{buyer?.fullName?.charAt(0) || '?'}</div>
                  )}
                </div>
                <div className="chat-info">
                  <div className="chat-header">
                    <span className="buyer-name">{buyer?.fullName || `Buyer #${chat.buyerId}`}</span>
                    <span className="timestamp">{formatTimestamp(chat.timestamp)}</span>
                  </div>
                  <p className="last-message">{chat.lastMessage}</p>
                  {chat.unreadBySeller && <span className="unread-dot"></span>}
                </div>
                <button
                  className="delete-chat"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteChat(chat.id);
                  }}
                >
                  🗑️
                </button>
              </div>
            );
          })
        ) : (
          <p>No conversations yet.</p>
        )}
      </div>
      <div className={`chat-content ${selectedChat ? 'chat-visible' : ''}`}>
        {selectedChat ? (
          <SellerChat
            chatId={selectedChat}
            buyerId={chats.find((c) => c.id === selectedChat)?.buyerId || ''}
            buyerName={
              buyers.get(chats.find((c) => c.id === selectedChat)?.buyerId || '')?.fullName ||
              `Buyer #${chats.find((c) => c.id === selectedChat)?.buyerId || ''}`
            }
            onRead={() => markChatAsRead(selectedChat)}
          />
        ) : (
          <div className="no-chat-selected">Select a conversation to start chatting</div>
        )}
      </div>
    </div>
  );
};

export default SellerChatWrapper;