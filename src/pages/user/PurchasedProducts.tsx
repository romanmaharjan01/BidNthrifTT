// src/pages/user/PurchasedProducts.tsx
<<<<<<< HEAD
import React from "react";
import { useOutletContext } from "react-router-dom";

import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import { db, auth } from "../firebase"; // Adjust path to your Firebase config
import { useToast } from "@/hooks/use-toast";
import "./PurchasedProducts.css"; // Adjust path to your CSS file
import { Button } from "@/components/ui/button";


interface Purchase {
  id: string;
  productId: string;
  title: string;
  price: number;
  purchaseDate: string;

}

interface Context {
  purchases: Purchase[];
}

const PurchasedProducts: React.FC = () => {
  const { purchases } = useOutletContext<Context>();

  sellerId?: string;
}

interface Product {
  id: string;
  title: string;
  price: number;
  sellerId: string;
}

const PurchasedProducts: React.FC = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchPurchases = async () => {
      if (!auth.currentUser) {
        toast({ title: "Error", description: "You must be logged in to view purchases.", variant: "destructive" });
        return;
      }

      try {
        setLoading(true);
        const purchasesRef = collection(db, `users/${auth.currentUser.uid}/purchases`);
        const purchasesSnap = await getDocs(purchasesRef);
        const purchasesData = await Promise.all(
          purchasesSnap.docs.map(async (purchaseDoc) => {
            const purchase = { id: purchaseDoc.id, ...purchaseDoc.data() } as Purchase; // Fixed: Use purchaseDoc.data()
            const productRef = doc(db, "products", purchase.productId);
            const productSnap = await getDoc(productRef);
            if (productSnap.exists()) {
              const productData = productSnap.data() as Product;
              purchase.sellerId = productData.sellerId;
            }
            return purchase;
          })
        );
        console.log("Fetched purchases:", purchasesData); // Debug log
        setPurchases(purchasesData);
      } catch (error) {
        toast({ title: "Error", description: "Failed to load purchases.", variant: "destructive" });
        console.error("Error fetching purchases:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPurchases();
  }, [toast]);

 // src/pages/user/PurchasedProducts.tsx (partial update)
const handleChatWithSeller = async (purchase: Purchase) => {
  if (!auth.currentUser) {
    toast({ title: "Error", description: "You must be logged in to chat.", variant: "destructive" });
    return;
  }
  if (!purchase.sellerId) {
    toast({ title: "Error", description: "Seller information not available.", variant: "destructive" });
    return;
  }

  try {
    const chatId = [auth.currentUser.uid, purchase.sellerId].sort().join("_");
    const timestamp = new Date().toISOString();
    const messageData = {
      senderId: auth.currentUser.uid,
      receiverId: purchase.sellerId,
      message: `Hi, I recently purchased "${purchase.title}". Can we discuss this further?`,
      timestamp,
      read: false,
    };

    // Add message to messages subcollection
    const messageRef = doc(collection(db, `chats/${chatId}/messages`));
    await setDoc(messageRef, messageData);

    // Create/Update top-level chat document
    const chatRef = doc(db, "chats", chatId);
    await setDoc(chatRef, {
      sellerId: purchase.sellerId,
      buyerId: auth.currentUser.uid,
      lastMessage: messageData.message,
      timestamp: Date.parse(timestamp), // Use numeric timestamp for ordering
    }, { merge: true }); // Merge to update if exists

    toast({
      title: "Message Sent",
      description: "An automated message has been sent to the seller.",
    });
  } catch (error) {
    toast({ title: "Error", description: "Failed to send message.", variant: "destructive" });
    console.error("Error sending message:", error);
  }
};

  if (loading) {
    return <div className="text-center py-20">Loading purchases...</div>;
  }


  return (
    <section className="section">
      <h2 className="section-title">Purchased Products</h2>
      {purchases.length > 0 ? (
        <ul className="items-list">
          {purchases.map((purchase) => (
            <li key={purchase.id} className="item">
              <span className="item-title">{purchase.title}</span>

              <span className="item-price">${purchase.price.toFixed(2)}</span>
              <span className="item-date">
                Purchased: {new Date(purchase.purchaseDate).toLocaleDateString()}
              </span>

              <span className="item-price">₨{purchase.price.toFixed(2)}</span>
              <span className="item-date">
                Purchased: {new Date(purchase.purchaseDate).toLocaleDateString()}
              </span>
              <Button
                onClick={() => handleChatWithSeller(purchase)}
                className="mt-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Chat with Seller
              </Button>

            </li>
          ))}
        </ul>
      ) : (
        <p className="no-items">No purchases yet.</p>
      )}
    </section>
  );
};

export default PurchasedProducts;