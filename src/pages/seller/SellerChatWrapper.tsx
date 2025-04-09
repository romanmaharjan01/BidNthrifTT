// src/pages/seller/SellerChatWrapper.tsx
import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import SellerChat from './SellerChat';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface Chat {
  id: string;
  buyerId: string;
  sellerId: string;
  lastMessage: string;
  timestamp: number;
}

interface User {
  id: string;
  fullName: string;
  profileImage?: string; // Updated to match the field name in your database
}

const SellerChatWrapper: React.FC = () => {
  const { userId } = useOutletContext<{ userId: string }>();
  const [chats, setChats] = useState<Chat[]>([]);
  const [buyers, setBuyers] = useState<Map<string, User>>(new Map());
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); // Added loading state

  useEffect(() => {
    if (!userId) {
      console.log('No userId provided, skipping fetch.');
      setLoading(false);
      return;
    }

    console.log('Fetching chats for sellerId:', userId);

    const q = query(
      collection(db, 'chats'),
      where('sellerId', '==', userId)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Chat));
      console.log('Fetched chats:', chatData);
      setChats(chatData);

      // Fetch buyer information for all chats
      const buyerIds = [...new Set(chatData.map(chat => chat.buyerId))];
      console.log('Buyer IDs to fetch:', buyerIds);

      const buyerPromises = buyerIds.map(async (buyerId) => {
        try {
          const userDoc = await getDoc(doc(db, 'users', buyerId));
          if (userDoc.exists()) {
            const userData = { id: buyerId, ...userDoc.data() } as User;
            console.log(`Fetched user data for buyer ${buyerId}:`, userData);
            return userData;
          } else {
            console.warn(`No user found for buyerId: ${buyerId}`);
            return { id: buyerId, fullName: `Buyer #${buyerId}` } as User;
          }
        } catch (error) {
          console.error(`Error fetching user data for buyer ${buyerId}:`, error);
          return { id: buyerId, fullName: `Buyer #${buyerId}` } as User;
        }
      });

      const buyerData = await Promise.all(buyerPromises);
      console.log('Fetched buyer data:', buyerData);
      setBuyers(new Map(buyerData.map(buyer => [buyer.id, buyer])));
      setLoading(false); // Set loading to false after data is fetched
    }, (error) => {
      console.error("Error fetching chats:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return <div>Loading conversations...</div>;
  }

  return (
    <div className="chat-wrapper">
      <div className="chat-list">
        <h3>Your Conversations</h3>
        {chats.length > 0 ? (
          chats.map(chat => {
            const buyer = buyers.get(chat.buyerId);
            console.log(`Rendering chat for buyerId ${chat.buyerId}, buyer data:`, buyer); // Debugging
            return (
              <div
                key={chat.id}
                className={`chat-item ${selectedChat === chat.id ? 'active' : ''}`}
                onClick={() => setSelectedChat(chat.id)}
              >
                <div className="chat-item-content">
                  <div className="profile-circle">
                    {buyer?.profileImage ? (
                      <img src={buyer.profileImage} alt={buyer.fullName} />
                    ) : (
                      <div className="default-profile">
                        {buyer?.fullName?.charAt(0) || '?'}
                      </div>
                    )}
                  </div>
                  <div className="chat-info">
                    <div className="chat-header">
                      <span>{buyer?.fullName || `Buyer #${chat.buyerId}`}</span>
                      <span className="timestamp">{formatTimestamp(chat.timestamp)}</span>
                    </div>
                    <p>{chat.lastMessage}</p>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <p>No conversations yet.</p>
        )}
      </div>
      <div className="chat-content">
        {selectedChat ? (
          <SellerChat
            chatId={selectedChat}
            buyerId={chats.find(c => c.id === selectedChat)?.buyerId || ''}
            buyerName={buyers.get(chats.find(c => c.id === selectedChat)?.buyerId || '')?.fullName || `Buyer #${chats.find(c => c.id === selectedChat)?.buyerId || ''}`}
          />
        ) : (
          <div className="no-chat-selected">
            Select a conversation to start chatting
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerChatWrapper;