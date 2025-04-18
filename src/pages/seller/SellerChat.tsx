import React, { useState, useEffect, useRef } from 'react';
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
  onRead: () => void;
}

const SellerChat: React.FC<SellerChatProps> = ({ chatId, buyerId, buyerName, onRead }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const messageData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as Message));
        setMessages(messageData);
      },
      (error) => {
        console.error('Error fetching messages:', error);
      }
    );

    onRead();

    return () => unsubscribe();
  }, [chatId, onRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      unreadBySeller: false,
    });

    setNewMessage('');
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="seller-chat">
      <div className="chat-header">
        <h3>{buyerName}</h3>
      </div>
      <div className="messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.senderId === 'seller' ? 'sent' : 'received'}`}
          >
            <div className="message-bubble">
              <p>{message.text}</p>
              <span className="message-timestamp">{formatTimestamp(message.timestamp)}</span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSendMessage} className="message-form">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
};

export default SellerChat;