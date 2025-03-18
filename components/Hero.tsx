
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Hero = () => {
  return (
    <section className="relative py-12 md:py-24 overflow-hidden bg-gradient-to-b from-brand-neutral-lightest to-background">
      <div className="container relative z-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-16 items-center">
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                Give Fashion a 
                <span className="text-brand-green"> Second </span>
                Chance
              </h1>
              <p className="mt-4 text-lg text-muted-foreground max-w-md">
                Bid on unique second-hand fashion items and discover sustainable style at affordable prices.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 mt-2">
              <Button asChild size="lg" className="bg-brand-green hover:bg-brand-green-dark">
                <Link to="/auctions">
                  Explore Auctions
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/register">
                  Start Selling
                </Link>
              </Button>
            </div>
            
            <div className="grid grid-cols-3 gap-4 pt-4 md:pt-8 border-t">
              <div>
                <p className="text-3xl font-bold">1500+</p>
                <p className="text-sm text-muted-foreground">Active Listings</p>
              </div>
              <div>
                <p className="text-3xl font-bold">5000+</p>
                <p className="text-sm text-muted-foreground">Happy Customers</p>
              </div>
              <div>
                <p className="text-3xl font-bold">95%</p>
                <p className="text-sm text-muted-foreground">Positive Reviews</p>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="rounded-xl overflow-hidden shadow-lg transform translate-y-10">
                  <img 
                    src="https://images.unsplash.com/photo-1532453288672-3a27e9be9efd?q=80&w=1964&auto=format&fit=crop" 
                    alt="Sustainable fashion" 
                    className="w-full h-64 object-cover" 
                  />
                </div>
                <div className="rounded-xl overflow-hidden shadow-lg">
                  <img 
                    src="https://images.unsplash.com/photo-1581044777550-4cfa60707c03?q=80&w=1972&auto=format&fit=crop" 
                    alt="Fashion auction" 
                    className="w-full h-48 object-cover" 
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div className="rounded-xl overflow-hidden shadow-lg">
                  <img 
                    src="https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=2070&auto=format&fit=crop" 
                    alt="Thrift fashion" 
                    className="w-full h-48 object-cover" 
                  />
                </div>
                <div className="rounded-xl overflow-hidden shadow-lg transform translate-y-6">
                  <img 
                    src="https://images.unsplash.com/photo-1609505848912-b7c3b8b4beda?q=80&w=1965&auto=format&fit=crop" 
                    alt="Second hand clothes" 
                    className="w-full h-64 object-cover" 
                  />
                </div>
              </div>
            </div>
            
            {/* Decorative badge */}
            <div className="absolute -right-4 top-1/2 transform -translate-y-1/2 rotate-12 bg-brand-accent-yellow text-foreground py-2 px-4 rounded-lg shadow-lg hidden md:block">
              <p className="font-medium">Eco-friendly</p>
              <p className="text-xs">Reduce, Reuse, Restyle</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-brand-green/10 blur-3xl"></div>
      <div className="absolute top-1/4 -right-16 w-64 h-64 rounded-full bg-brand-accent-yellow/10 blur-3xl"></div>
    </section>
  );
};

export default Hero;
