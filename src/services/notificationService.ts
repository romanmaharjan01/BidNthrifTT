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
  deleteDoc,
  limit
} from "firebase/firestore";
import { db } from "../pages/firebase";

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'order' | 'message' | 'payment' | 'system';
  read: boolean;
  link?: string;
  createdAt: any;
}

// Create a notification
export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: 'order' | 'message' | 'payment' | 'system',
  link?: string
): Promise<string> => {
  try {
    const notification = {
      userId,
      title,
      message,
      type,
      read: false,
      link,
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, "notifications"), notification);
    return docRef.id;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

// Get notifications for a user
export const getNotifications = (
  userId: string,
  callback: (notifications: Notification[]) => void
): (() => void) => {
  const q = query(
    collection(db, "notifications"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const notifications: Notification[] = [];
    querySnapshot.forEach((doc) => {
      notifications.push({ id: doc.id, ...doc.data() } as Notification);
    });
    callback(notifications);
  }, (error) => {
    console.error("Error getting notifications:", error);
  });
};

// Mark a notification as read
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, "notifications", notificationId), {
      read: true
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
};

// Mark all notifications as read for a user
export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  try {
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      where("read", "==", false)
    );
    
    const querySnapshot = await getDocs(q);
    const batch = [];
    
    querySnapshot.forEach((doc) => {
      batch.push(updateDoc(doc.ref, { read: true }));
    });
    
    await Promise.all(batch);
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    throw error;
  }
};

// Delete a notification
export const deleteNotification = async (notificationId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, "notifications", notificationId));
  } catch (error) {
    console.error("Error deleting notification:", error);
    throw error;
  }
};

// Create order notification for seller
export const createOrderNotification = async (
  sellerId: string,
  orderId: string,
  productName: string,
  buyerName: string
): Promise<string> => {
  try {
    return await createNotification(
      sellerId,
      "New Order Received",
      `${buyerName} has purchased ${productName}. Please confirm and check chat for delivery details.`,
      "order",
      `/seller/orders/${orderId}`
    );
  } catch (error) {
    console.error("Error creating order notification:", error);
    throw error;
  }
};

// Create payment notification
export const createPaymentNotification = async (
  userId: string,
  amount: number,
  orderNumber: string
): Promise<string> => {
  try {
    return await createNotification(
      userId,
      "Payment Successful",
      `Your payment of NPR ${amount.toFixed(2)} for order #${orderNumber} was successful. Check your purchase history for details.`,
      "payment",
      `/user-details/purchases`
    );
  } catch (error) {
    console.error("Error creating payment notification:", error);
    throw error;
  }
}; 