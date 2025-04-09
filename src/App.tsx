// src/App.tsx
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
<<<<<<< HEAD
import Auctions from "./pages/auction/Auctions";
import Sell from "./pages/seller/Sell";
import About from "./pages/About";
import Profile from "./pages/user/Profile"; // Main Profile page
import Favorites from "./pages/Favorites";
import Cart from "./pages/Cart";
import Payment from "./pages/Payment";
import Admin from "./pages/Admin/Admin";

// Import User Details and its child components
import UserDetails from "./pages/user/UserDetails";
import ProfileSection from "./pages/user/Profile"; // For /user-details/profile
import PurchasedProducts from "./pages/user/PurchasedProducts"; // For /user-details/purchases
import CartItems from "./pages/user/CartItems"; // For /user-details/cart
import UserFavorites from "./pages/user/Favourites"; // For /user-details/favorites
=======
import ProductDetail from "./pages/ProductDetail";
import Auctions from "./pages/auction/Auctions";
import Sell from "./pages/seller/Sell";
import About from "./pages/About";
import Profile from "./pages/user/Profile";
import Favorites from "./pages/Favorites";
import Cart from "./pages/Cart";
import Payment from "./pages/user/Payment";
import PaymentSuccess from "./pages/user/PaymentSuccess";
import PaymentCancel from "./pages/user/PaymentCancel";
import Admin from "./pages/Admin/Admin";
import UserChatWrapper from "./pages/user/UserChatWrapper"; // Updated import

// Import User Details and its child components
import UserDetails from "./pages/user/UserDetails";
import ProfileSection from "./pages/user/Profile";
import PurchasedProducts from "./pages/user/PurchasedProducts";
import CartItems from "./pages/user/CartItems";
import UserFavorites from "./pages/user/Favourites";
>>>>>>> e553efe (Initial commit after fixing corruption)

// Import Seller Dashboard and its child components
import SellerDashboard from "./pages/seller/SellerDashboard";
import Dashboard from "./pages/seller/Dashboard";
import Listings from "./pages/seller/Listing";
import AddListing from "./pages/seller/AddListing";
import SellerProfile from "./pages/seller/SellerProfile";
<<<<<<< HEAD

=======
import SellerChatWrapper from "./pages/seller/SellerChatWrapper";
import SetAuction from "./pages/Admin/setAuction";
>>>>>>> e553efe (Initial commit after fixing corruption)
// Import Authentication & Protected Route
import ProtectedRoute from "./pages/ProtectedRoute";

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
<<<<<<< HEAD
          <Route path="/auctions" element={<Auctions />} />
          <Route path="/sell" element={<Sell />} />
          <Route path="/about" element={<About />} />

=======
          <Route path="/product-detail/:id" element={<ProductDetail />} />
          <Route path="/auctions" element={<Auctions />} />
          <Route path="/sell" element={<Sell />} />
          <Route path="/about" element={<About />} />
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment/cancel" element={<PaymentCancel />} />
        
          <Route path="/setauction" element={<SetAuction />} />
>>>>>>> e553efe (Initial commit after fixing corruption)
          {/* 🔒 Protected Routes */}
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
          <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
          <Route path="/payment/:productId" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
<<<<<<< HEAD
=======
          <Route path="/chat" element={<ProtectedRoute><UserChatWrapper /></ProtectedRoute>} /> {/* Updated component */}
>>>>>>> e553efe (Initial commit after fixing corruption)

          {/* User Details with Nested Routes */}
          <Route path="/user-details" element={<ProtectedRoute><UserDetails /></ProtectedRoute>}>
            <Route path="profile" element={<ProfileSection />} />
            <Route path="purchases" element={<PurchasedProducts />} />
            <Route path="cart" element={<CartItems />} />
            <Route path="favorites" element={<UserFavorites />} />
<<<<<<< HEAD
            <Route index element={<ProfileSection />} /> {/* Default to Profile */}
=======
            <Route index element={<ProfileSection />} />
>>>>>>> e553efe (Initial commit after fixing corruption)
          </Route>

          {/* Seller Dashboard with Nested Routes */}
          <Route path="/seller" element={<ProtectedRoute><SellerDashboard /></ProtectedRoute>}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="listings" element={<Listings />} />
            <Route path="add" element={<AddListing />} />
            <Route path="sellerprofile" element={<SellerProfile />} />
<<<<<<< HEAD
=======
            <Route path="chat" element={<SellerChatWrapper />} />
>>>>>>> e553efe (Initial commit after fixing corruption)
          </Route>

          {/* 🚫 404 Catch-All */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;