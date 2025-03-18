
import { Star } from "lucide-react";

interface Testimonial {
  id: number;
  name: string;
  role: string;
  image: string;
  rating: number;
  content: string;
}

const Testimonials = () => {
  const testimonials: Testimonial[] = [
    {
      id: 1,
      name: "Emma Thompson",
      role: "Frequent Buyer",
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1974&auto=format&fit=crop",
      rating: 5,
      content: "BidNthrifT has completely changed how I shop for clothes. I've found unique pieces at great prices while reducing my environmental footprint. The bidding process is fun and addictive!"
    },
    {
      id: 2,
      name: "Michael Chen",
      role: "Seller & Buyer",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1974&auto=format&fit=crop",
      rating: 4,
      content: "As both a seller and buyer on BidNthrifT, I'm impressed with how easy it is to list items and participate in auctions. The platform has helped me declutter my wardrobe and refresh my style sustainably."
    },
    {
      id: 3,
      name: "Sarah Johnson",
      role: "Fashion Enthusiast",
      image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=1961&auto=format&fit=crop",
      rating: 5,
      content: "I've found designer pieces for a fraction of the retail price. The quality verification process ensures that what you see is what you get. This platform makes sustainable fashion accessible to everyone."
    }
  ];
  
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star 
        key={i}
        className={`h-4 w-4 ${i < rating ? 'text-brand-accent-yellow fill-brand-accent-yellow' : 'text-muted'}`}
      />
    ));
  };
  
  return (
    <section className="py-16 bg-brand-neutral-lightest">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            What Our Community Says
          </h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            Join thousands of fashion enthusiasts who are making sustainable choices while finding unique styles
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="bg-background rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-4 mb-4">
                <img 
                  src={testimonial.image} 
                  alt={testimonial.name}
                  className="h-12 w-12 rounded-full object-cover" 
                />
                <div>
                  <h4 className="font-medium">{testimonial.name}</h4>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
              
              <div className="flex mb-4">
                {renderStars(testimonial.rating)}
              </div>
              
              <p className="text-muted-foreground">
                "{testimonial.content}"
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
