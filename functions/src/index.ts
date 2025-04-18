import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { QueryDocumentSnapshot, DocumentData } from "firebase-admin/firestore";
import { FirestoreEvent } from "firebase-functions/v2/firestore";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Define the Cloud Function
export const updateAuctionPrice = onDocumentCreated(
  "auctions/{auctionId}/bids/{bidId}",
  async (event: FirestoreEvent<QueryDocumentSnapshot<DocumentData> | undefined, { auctionId: string, bidId: string }>) => {
    // Extract the snapshot and params from the event
    const snap = event.data;
    const auctionId = event.params.auctionId;

    // Check if the snapshot exists
    if (!snap) {
      console.error("No snapshot data available for bid");
      return;
    }

    const bid = snap.data();

    // Update the auction document with the new bid amount
    const auctionRef = admin.firestore().collection("auctions").doc(auctionId);
    try {
      await auctionRef.update({
        price: bid.amount,
      });
      console.log(`Updated auction ${auctionId} price to ${bid.amount}`);
    } catch (error) {
      console.error(`Error updating auction ${auctionId} price:`, error);
    }
  }
);