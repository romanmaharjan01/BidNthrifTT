// src/pages/user/OrderConfirmation.tsx
import { useLocation } from "react-router-dom";

const OrderConfirmation = () => {
  const { state } = useLocation();
  const orderId = state?.orderId;

  return (
    <div className="min-h-screen flex flex-col">
      
      <main className="flex-1 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Order Confirmed!</h1>
        <p>Your order #{orderId} has been placed successfully.</p>
        <p>You'll receive your item soon via Cash on Delivery.</p>
      </main>
      
    </div>
  );
};

export default OrderConfirmation;