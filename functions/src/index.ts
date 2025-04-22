import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import Stripe from "stripe";

admin.initializeApp();

const stripe = new Stripe(process.env.STRIPE_SECRET as string, {
  apiVersion: "2025-03-31.basil", // 🟢 Match your installed Stripe type version
});

export const createPaymentIntent = onCall(async (request) => {
  const { amount } = request.data;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: "usd", // or "npr" if your account supports it
    });

    return {
      clientSecret: paymentIntent.client_secret,
    };
  } catch (error) {
    logger.error("Payment Intent Creation Failed:", error);

    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "Unknown error occurred" };
  }
});
