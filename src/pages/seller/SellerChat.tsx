// src/pages/seller/SellerChat.tsx
import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: number;
}

interface SellerChatProps {
  chatId: string;
  buyerId: string;
  buyerName: string;
}

const SellerChat: React.FC<SellerChatProps> = ({ chatId, buyerId, buyerName }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messageData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Message));
      setMessages(messageData);
    }, (error) => {
      console.error("Error fetching messages:", error);
    });

    return () => unsubscribe();
  }, [chatId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    await addDoc(collection(db, 'chats', chatId, 'messages'), {
      text: newMessage,
      senderId: 'seller',
      timestamp: Date.now(),
    });

    await updateDoc(doc(db, 'chats', chatId), {
      lastMessage: newMessage,
      timestamp: Date.now(),
    });

    setNewMessage('');
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="seller-chat">
      <h3>Chatting with {buyerName}</h3>
      <div className="messages">
        {messages.map(message => (
          <div
            key={message.id}
            className={`message ${message.senderId === 'seller' ? 'sent' : 'received'}`}
          >
            <div className="message-content">
              <p>{message.text}</p>
              <span className="message-timestamp">{formatTimestamp(message.timestamp)}</span>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleSendMessage} className="message-form">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
};

export default SellerChat;