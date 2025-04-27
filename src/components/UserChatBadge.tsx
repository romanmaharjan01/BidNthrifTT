import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getUnreadMessageCount } from '@/services/chatService';
import { auth } from '../pages/firebase';

interface UserChatBadgeProps {
  className?: string;
  iconSize?: number;
}

const UserChatBadge: React.FC<UserChatBadgeProps> = ({
  className = '',
  iconSize = 24
}) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUserId(user ? user.uid : null);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to unread message count
  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
      return () => {};
    }

    const unsubscribe = getUnreadMessageCount(userId, (count) => {
      setUnreadCount(count);
    });

    return () => unsubscribe();
  }, [userId]);

  if (!userId) return null;

  return (
    <Link to="/chat" className={`relative ${className}`}>
      <MessageCircle size={iconSize} />
      {unreadCount > 0 && (
        <Badge 
          className="absolute -top-2 -right-2 h-5 min-w-[20px] px-1 flex items-center justify-center bg-red-500 text-white" 
          variant="destructive"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Link>
  );
};

export default UserChatBadge; 