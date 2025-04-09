// src/pages/user/PaymentCancel.tsx
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

const PaymentCancel = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-12 flex items-center justify-center">
        <div className="max-w-lg w-full p-6 bg-white shadow-lg rounded-lg text-center">
          <h2 className="text-2xl font-bold mb-4">Payment Canceled</h2>
          <p className="text-gray-600 mb-6">Your payment was canceled. You can try again or continue shopping.</p>
          <div className="flex gap-4 justify-center">
            <Button
              onClick={() => navigate("/cart")}
              className="bg-green-600 hover:bg-green-700"
            >
              Try Again
            </Button>
            <Button
              onClick={() => navigate("/shop")}
              variant="outline"
              className="border-gray-300"
            >
              Continue Shopping
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PaymentCancel;