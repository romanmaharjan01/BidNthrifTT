/**
 * Format a timestamp for display in chat messages
 */
export const formatChatTime = (timestamp: string): string => {
  if (!timestamp) return '';
  
  const messageDate = new Date(timestamp);
  const now = new Date();
  
  // Check if message is from today
  if (messageDate.toDateString() === now.toDateString()) {
    return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // Check if message is from yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (messageDate.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  
  // Check if message is from this week
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  if (messageDate > weekAgo) {
    return messageDate.toLocaleDateString([], { weekday: 'long' });
  }
  
  // Otherwise return the date
  return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
}; 