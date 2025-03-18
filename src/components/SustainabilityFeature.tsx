
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Leaf, Recycle, Droplet } from "lucide-react";

const SustainabilityFeature = () => {
  return (
    <section className="py-16 bg-brand-green/5">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 bg-brand-green/10 text-brand-green px-4 py-2 rounded-full">
              <Leaf className="h-4 w-4" />
              <span className="text-sm font-medium">Sustainable Fashion</span>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Join the Fashion Revolution
            </h2>
            
            <p className="text-muted-foreground">
              Every purchase at BidNthrifT helps extend the lifecycle of clothing, reducing waste and environmental impact. By choosing second-hand, you're making a sustainable choice for our planet.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-brand-green/20 flex items-center justify-center">
                  <Recycle className="h-5 w-5 text-brand-green" />
                </div>
                <div>
                  <h3 className="font-medium">Reduce Waste</h3>
                  <p className="text-sm text-muted-foreground">
                    Extend the lifecycle of clothing items and prevent them from ending up in landfills.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-brand-green/20 flex items-center justify-center">
                  <Droplet className="h-5 w-5 text-brand-green" />
                </div>
                <div>
                  <h3 className="font-medium">Save Resources</h3>
                  <p className="text-sm text-muted-foreground">
                    Lower your carbon footprint as second-hand fashion requires no new production resources.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <Button asChild>
                <Link to="/sustainability">
                  Learn More About Our Impact
                </Link>
              </Button>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute -top-6 -left-6 w-64 h-64 rounded-full bg-brand-green/10 blur-3xl"></div>
            <div className="relative bg-white rounded-lg shadow-xl overflow-hidden">
              <div className="p-8">
                <div className="flex justify-between items-center border-b pb-4 mb-4">
                  <div>
                    <h3 className="font-medium text-xl">Environmental Impact</h3>
                    <p className="text-sm text-muted-foreground">BidNthrifT Community</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-brand-green/20 flex items-center justify-center">
                    <Leaf className="h-6 w-6 text-brand-green" />
                  </div>
                </div>
                
                <div className="space-y-8">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Water Saved</span>
                      <span className="font-medium">1.2 million liters</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-brand-green w-[85%]"></div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Equivalent to 20,000 showers</p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>CO₂ Emissions Reduced</span>
                      <span className="font-medium">54 tons</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-brand-green w-[70%]"></div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Equivalent to 12 cars off the road for a year</p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Clothing Recycled</span>
                      <span className="font-medium">8,500 items</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-brand-green w-[90%]"></div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Prevented from landfill disposal</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SustainabilityFeature;
