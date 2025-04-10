import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { auth, db } from "../pages/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { ShoppingBag, Heart, User as UserIcon, Menu, X, MessageSquare } from "lucide-react";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
    });
    return () => unsubscribe();
  }, []);

  const toggleMenu = (): void => setIsMenuOpen(!isMenuOpen);

  const handleLogout = async (): Promise<void> => {
    await signOut(auth);
    setUser(null);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-brand-green whitespace-nowrap">
            Bid<span className="text-brand-accent-yellow">N</span>thrifT
          </Link>

          <nav className="hidden md:flex items-center gap-6 mx-6">
            <Link to="/shop" className="text-gray-700 hover:text-brand-green transition-colors">
              Shop
            </Link>
            <Link to="/auctions" className="text-gray-700 hover:text-brand-green transition-colors">
              Auctions
            </Link>
            <Link to="/about" className="text-gray-700 hover:text-brand-green transition-colors">
              About
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild className="text-gray-700 hover:text-brand-green">
              <Link to="/favorites">
                <Heart className="h-5 w-5" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild className="text-gray-700 hover:text-brand-green">
              <Link to="/cart">
                <ShoppingBag className="h-5 w-5" />
              </Link>
            </Button>
            {user ? (
              <>
                <Button variant="ghost" size="icon" asChild className="text-gray-700 hover:text-brand-green">
                  <Link to="/chat">
                    <MessageSquare className="h-5 w-5" />
                  </Link>
                </Button>
                <Button variant="ghost" size="icon" asChild className="text-gray-700 hover:text-brand-green">
                  <Link to="/user-details">
                    <UserIcon className="h-5 w-5" />
                  </Link>
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleLogout}
                  className="bg-red-500 hover:bg-red-600 text-white"
                >
                  Logout
                </Button>
              </>
            ) : (
              <Button 
                asChild 
                className="bg-brand-green hover:bg-brand-green/90 text-white"
              >
                <Link to="/login">Sign In</Link>
              </Button>
            )}
          </div>

          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden text-gray-700" 
            onClick={toggleMenu}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200 p-4">
            {/* Mobile Navigation */}
            <div className="flex flex-col gap-3">
              <Link 
                to="/shop" 
                className="text-gray-700 hover:text-brand-green py-2"
                onClick={toggleMenu}
              >
                Shop
              </Link>
              <Link 
                to="/auctions" 
                className="text-gray-700 hover:text-brand-green py-2"
                onClick={toggleMenu}
              >
                Auctions
              </Link>
              <Link 
                to="/about" 
                className="text-gray-700 hover:text-brand-green py-2"
                onClick={toggleMenu}
              >
                About
              </Link>
              {user ? (
                <>
                  <Link 
                    to="/favorites" 
                    className="text-gray-700 hover:text-brand-green py-2"
                    onClick={toggleMenu}
                  >
                    Favorites
                  </Link>
                  <Link 
                    to="/cart" 
                    className="text-gray-700 hover:text-brand-green py-2"
                    onClick={toggleMenu}
                  >
                    Cart
                  </Link>
                  <Link 
                    to="/chat" 
                    className="text-gray-700 hover:text-brand-green py-2"
                    onClick={toggleMenu}
                  >
                    Chat
                  </Link>
                  <Link 
                    to="/profile" 
                    className="text-gray-700 hover:text-brand-green py-2"
                    onClick={toggleMenu}
                  >
                    Profile
                  </Link>
                  <Button 
                    variant="destructive" 
                    onClick={async () => {
                      await handleLogout();
                      toggleMenu();
                    }}
                    className="w-full mt-2"
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <Button asChild className="w-full mt-2">
                  <Link to="/login" onClick={toggleMenu}>Sign In</Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
