// src/pages/user/UserChat.tsx
import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, doc, setDoc } from 'firebase/firestore';
import './UserChat.css';

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: number;
}

const UserChat: React.FC<{ chatId: string; sellerId: string }> = ({ chatId, sellerId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, `chats/${chatId}/messages`),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Message));
      setMessages(loadedMessages);
      scrollToBottom();
      console.log("Loaded messages:", loadedMessages); // Debug log
    }, (error) => {
      console.error("Error in snapshot listener:", error);
    });

    return () => unsubscribe();
  }, [chatId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !auth.currentUser) return;

    const timestamp = Date.now();
    const messageData = {
      text: newMessage,
      senderId: auth.currentUser.uid,
      timestamp
    };

    try {
      await addDoc(collection(db, `chats/${chatId}/messages`), messageData);

      const chatRef = doc(db, "chats", chatId);
      await setDoc(chatRef, {
        sellerId,
        buyerId: auth.currentUser.uid,
        lastMessage: newMessage,
        timestamp
      }, { merge: true });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>BidNthrifT Chat - Buyer View</h2>
        <p>Chatting with Seller #{sellerId}</p>
      </div>
      <div className="messages-container">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.senderId === auth.currentUser?.uid ? 'sent' : 'received'}`}
          >
            <div className="message-content">
              {message.text}
              <span className="timestamp">
                {new Date(message.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={sendMessage} className="message-form">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className="message-input"
        />
        <button type="submit" className="send-button">
          Send
        </button>
      </form>
    </div>
  );
};

export default UserChat;