import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Import Pages
import Index from "./pages/Index";
import Login from "./pages/regestratiion/Login";
import Register from "./pages/regestratiion/Register";
import ForgotPassword from "./pages/regestratiion/ForgotPassword";
import NotFound from "./pages/NotFound";
import Shop from "./pages/Shop";
import Auctions from "./pages/auction/Auctions";
import Sell from "./pages/seller/Sell";
import About from "./pages/About";
import Profile from "./pages/Profile";
import Favorites from "./pages/Favorites";
import Cart from "./pages/Cart";
import Payment from "./pages/Payment";
import Admin from "./pages/Admin/Admin";
import User from "./pages/User";

// Import Authentication & Protected Route
import ProtectedRoute from "./pages/ProtectedRoute";
import SellerDashboard from "./pages/seller/seller"; // Fixed import issue

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* 🏠 Public Pages */}
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/auctions" element={<Auctions />} />
          <Route path="/sell" element={<Sell />} />
          <Route path="/about" element={<About />} />

          {/* 🔒 Protected Routes */}
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
          <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
          <Route path="/payment/:productId" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
          <Route path="/user" element={<ProtectedRoute><User /></ProtectedRoute>} />
          <Route path="/seller" element={<ProtectedRoute><SellerDashboard /></ProtectedRoute>} />

          {/* 🚫 404 Catch-All */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
