
import { Link } from "react-router-dom";
import { 
  Instagram, 
  Facebook, 
  Twitter, 
  Mail,
  Recycle
} from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-brand-neutral-lightest border-t">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand and mission */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold tracking-tight text-brand-green">
                Bid<span className="text-brand-accent-yellow">N</span>thrifT
              </span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              A sustainable marketplace dedicated to second-hand fashion, reducing waste and promoting affordable style.
            </p>
            <div className="flex items-center gap-4 pt-2">
              <a href="https://instagram.com" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-brand-green transition-colors">
                <Instagram className="h-5 w-5" />
                <span className="sr-only">Instagram</span>
              </a>
              <a href="https://facebook.com" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-brand-green transition-colors">
                <Facebook className="h-5 w-5" />
                <span className="sr-only">Facebook</span>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-brand-green transition-colors">
                <Twitter className="h-5 w-5" />
                <span className="sr-only">Twitter</span>
              </a>
            </div>
          </div>
          
          {/* Shop */}
          <div>
            <h3 className="mb-4 text-sm font-medium">Shop</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/shop" className="text-muted-foreground hover:text-brand-green transition-colors">
                  All Products
                </Link>
              </li>
              <li>
                <Link to="/auctions" className="text-muted-foreground hover:text-brand-green transition-colors">
                  Live Auctions
                </Link>
              </li>
              <li>
                <Link to="/new-arrivals" className="text-muted-foreground hover:text-brand-green transition-colors">
                  New Arrivals
                </Link>
              </li>
              <li>
                <Link to="/categories" className="text-muted-foreground hover:text-brand-green transition-colors">
                  Categories
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Account */}
          <div>
            <h3 className="mb-4 text-sm font-medium">Account</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/login" className="text-muted-foreground hover:text-brand-green transition-colors">
                  Sign In
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-muted-foreground hover:text-brand-green transition-colors">
                  Create Account
                </Link>
              </li>
              <li>
                <Link to="/profile" className="text-muted-foreground hover:text-brand-green transition-colors">
                  My Profile
                </Link>
              </li>
              <li>
                <Link to="/orders" className="text-muted-foreground hover:text-brand-green transition-colors">
                  Order History
                </Link>
              </li>
            </ul>
          </div>
          
          {/* About */}
          <div>
            <h3 className="mb-4 text-sm font-medium">About</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/about" className="text-muted-foreground hover:text-brand-green transition-colors">
                  Our Story
                </Link>
              </li>
              <li>
                <Link to="/sustainability" className="text-muted-foreground hover:text-brand-green transition-colors">
                  Sustainability
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-muted-foreground hover:text-brand-green transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-muted-foreground hover:text-brand-green transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Recycle className="h-4 w-4 text-brand-green" />
            <span className="text-xs">Promoting sustainable fashion since 2023</span>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-4 text-xs text-muted-foreground">
            <Link to="/terms" className="hover:text-brand-green transition-colors">
              Terms of Service
            </Link>
            <Link to="/privacy" className="hover:text-brand-green transition-colors">
              Privacy Policy
            </Link>
            <Link to="/cookies" className="hover:text-brand-green transition-colors">
              Cookie Policy
            </Link>
            <p>© 2023 BidNthrifT. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
