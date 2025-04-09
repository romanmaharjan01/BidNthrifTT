// src/pages/user/UserChatWrapper.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; // Added useLocation
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import UserChat from './UserChat';
import './UserChat.css';

interface Chat {
  id: string;
  sellerId: string;
  buyerId: string;
  lastMessage: string;
  timestamp: number;
}

const UserChatWrapper: React.FC = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        navigate('/login');
        return;
      }

      const q = query(
        collection(db, 'chats'),
        where('buyerId', '==', user.uid)
      );

      const unsubscribeChats = onSnapshot(q, (snapshot) => {
        const chatData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Chat));
        console.log("Chat data loaded:", chatData);
        setChats(chatData);

        // Auto-select chat from navigation state if provided
        const selectedChatId = location.state?.selectedChatId;
        if (selectedChatId && chatData.some(chat => chat.id === selectedChatId)) {
          setSelectedChat(selectedChatId);
        }
      }, (error) => {
        console.error("Error fetching chats:", error);
      });

      return () => unsubscribeChats();
    });

    return () => unsubscribeAuth();
  }, [navigate, location.state]); // Added location.state to dependencies

  return (
    <div className="chat-wrapper">
      <div className="chat-list">
        <h3>Your Conversations</h3>
        {chats.length > 0 ? (
          chats.map(chat => (
            <div
              key={chat.id}
              className={`chat-item ${selectedChat === chat.id ? 'active' : ''}`}
              onClick={() => setSelectedChat(chat.id)}
            >
              <span>Seller #{chat.sellerId}</span>
              <p>{chat.lastMessage}</p>
            </div>
          ))
        ) : (
          <p>No conversations yet.</p>
        )}
      </div>
      <div className="chat-content">
        {selectedChat ? (
          <UserChat 
            chatId={selectedChat} 
            sellerId={chats.find(c => c.id === selectedChat)?.sellerId || ''} 
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

export default UserChatWrapper;