
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Category {
  id: string;
  name: string;
  image: string;
  itemCount: number;
}

const Categories = () => {
  const categories: Category[] = [
    {
      id: "tops",
      name: "Tops & T-shirts",
      image: "https://images.unsplash.com/photo-1562157873-818bc0726f68?q=80&w=2127&auto=format&fit=crop",
      itemCount: 320
    },
    {
      id: "dresses",
      name: "Dresses",
      image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=2083&auto=format&fit=crop",
      itemCount: 245
    },
    {
      id: "outerwear",
      name: "Outerwear",
      image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=1972&auto=format&fit=crop",
      itemCount: 187
    },
    {
      id: "pants",
      name: "Pants & Jeans",
      image: "https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=1926&auto=format&fit=crop",
      itemCount: 276
    },
    {
      id: "footwear",
      name: "Footwear",
      image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?q=80&w=2080&auto=format&fit=crop",
      itemCount: 298
    },
    {
      id: "accessories",
      name: "Accessories",
      image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=1935&auto=format&fit=crop",
      itemCount: 342
    }
  ];
  
  return (
    <section className="py-12 bg-background">
      <div className="container">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            Shop By Category
          </h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            Browse our curated collection of second-hand fashion items, organized by category for easy discovery
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <Link 
              key={category.id}
              to={`/category/${category.id}`}
              className="group relative overflow-hidden rounded-lg bg-cover bg-center h-64"
              style={{ backgroundImage: `url(${category.image})` }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent transition-opacity group-hover:opacity-90"></div>
              <div className="absolute bottom-0 left-0 p-6 text-white">
                <h3 className="text-xl font-medium">{category.name}</h3>
                <p className="text-sm opacity-80">{category.itemCount} items</p>
              </div>
            </Link>
          ))}
        </div>
        
        <div className="flex justify-center mt-10">
          <Button asChild>
            <Link to="/categories">View All Categories</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Categories;
