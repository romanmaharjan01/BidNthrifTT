import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auth } from "../pages/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { db } from "../pages/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Search, ShoppingBag, Heart, User as UserIcon, Menu, X } from "lucide-react";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);

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

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    const productsRef = collection(db, "products");
    const q = query(productsRef, where("name", ">=", searchTerm), where("name", "<=", searchTerm + "\uf8ff"));
    const querySnapshot = await getDocs(q);

    const results = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setSearchResults(results);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl font-bold tracking-tight text-brand-green">
            Bid<span className="text-brand-accent-yellow">N</span>thrifT
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link to="/shop" className="text-sm font-medium hover:text-brand-green transition-colors">Shop</Link>
          <Link to="/auctions" className="text-sm font-medium hover:text-brand-green transition-colors">Auctions</Link>
          <Link to="/about" className="text-sm font-medium hover:text-brand-green transition-colors">About</Link>
        </nav>

        <form onSubmit={handleSearch} className="hidden md:flex relative w-full max-w-sm mx-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search for sustainable fashion..."
            className="pl-8 bg-muted"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button type="submit" variant="ghost">Search</Button>
        </form>

        <div className="hidden md:flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/favorites">
              <Heart className="h-5 w-5" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link to="/cart">
              <ShoppingBag className="h-5 w-5" />
            </Link>
          </Button>
          {user ? (
            <>
              <Button variant="ghost" size="icon" asChild>
                <Link to="/profile">
                  <UserIcon className="h-5 w-5" />
                </Link>
              </Button>
              <Button variant="destructive" onClick={handleLogout}>Logout</Button>
            </>
          ) : (
            <Button asChild>
              <Link to="/login">Sign In</Link>
            </Button>
          )}
        </div>

        <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleMenu}>
          {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>
    </header>
  );
};

export default Navbar;
