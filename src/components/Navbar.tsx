import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auth } from "../pages/firebase"; // Ensure correct firebase import
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { 
  Search, 
  ShoppingBag, 
  Heart, 
  User as UserIcon,
  Menu,
  X
} from "lucide-react";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setUser(authUser);
    });

    return () => unsubscribe();
  }, []);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl font-bold tracking-tight text-brand-green">
            Bid<span className="text-brand-accent-yellow">N</span>thrifT
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/shop" className="text-sm font-medium hover:text-brand-green transition-colors">
            Shop
          </Link>
          <Link to="/auctions" className="text-sm font-medium hover:text-brand-green transition-colors">
            Auctions
          </Link>
          <Link to="/sell" className="text-sm font-medium hover:text-brand-green transition-colors">
            Sell
          </Link>
          <Link to="/about" className="text-sm font-medium hover:text-brand-green transition-colors">
            About
          </Link>
        </nav>

        {/* Search */}
        <div className="hidden md:flex relative w-full max-w-sm mx-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search for sustainable fashion..."
            className="pl-8 bg-muted"
          />
        </div>

        {/* Desktop Action Buttons */}
        <div className="hidden md:flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/favorites">
              <Heart className="h-5 w-5" />
              <span className="sr-only">Favorites</span>
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link to="/cart">
              <ShoppingBag className="h-5 w-5" />
              <span className="sr-only">Cart</span>
            </Link>
          </Button>
          {user ? (
            <>
              <Button variant="ghost" size="icon" asChild>
                <Link to="/profile">
                  <UserIcon className="h-5 w-5" />
                  <span className="sr-only">Profile</span>
                </Link>
              </Button>
              <Button variant="destructive" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <Button asChild>
              <Link to="/login">Sign In</Link>
            </Button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden"
          onClick={toggleMenu}
        >
          {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          <span className="sr-only">Menu</span>
        </Button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 z-50 bg-background p-4">
          <div className="relative w-full py-2">
            <Search className="absolute left-2.5 top-4.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search for sustainable fashion..."
              className="pl-8 bg-muted"
            />
          </div>

          <nav className="flex flex-col gap-4 pt-4">
            <Link 
              to="/shop" 
              className="flex h-10 items-center border-b border-border px-4 text-sm font-medium"
              onClick={toggleMenu}
            >
              Shop
            </Link>
            <Link 
              to="/auctions" 
              className="flex h-10 items-center border-b border-border px-4 text-sm font-medium"
              onClick={toggleMenu}
            >
              Auctions
            </Link>
            <Link 
              to="/sell" 
              className="flex h-10 items-center border-b border-border px-4 text-sm font-medium"
              onClick={toggleMenu}
            >
              Sell
            </Link>
            <Link 
              to="/about" 
              className="flex h-10 items-center border-b border-border px-4 text-sm font-medium"
              onClick={toggleMenu}
            >
              About
            </Link>
            <Link 
              to="/favorites" 
              className="flex h-10 items-center border-b border-border px-4 text-sm font-medium"
              onClick={toggleMenu}
            >
              <Heart className="mr-2 h-4 w-4" />
              Favorites
            </Link>
            <Link 
              to="/cart" 
              className="flex h-10 items-center border-b border-border px-4 text-sm font-medium"
              onClick={toggleMenu}
            >
              <ShoppingBag className="mr-2 h-4 w-4" />
              Cart
            </Link>
            {user ? (
              <>
                <Link 
                  to="/profile" 
                  className="flex h-10 items-center border-b border-border px-4 text-sm font-medium"
                  onClick={toggleMenu}
                >
                  <UserIcon className="mr-2 h-4 w-4" />
                  Profile
                </Link>
                <Button variant="destructive" className="w-full mt-2" onClick={handleLogout}>
                  Logout
                </Button>
              </>
            ) : (
              <div className="flex flex-col gap-2 pt-4">
                <Button asChild className="w-full">
                  <Link to="/login" onClick={toggleMenu}>Sign In</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link to="/register" onClick={toggleMenu}>Create Account</Link>
                </Button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
