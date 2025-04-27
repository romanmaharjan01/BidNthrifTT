import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Heart, MessageCircle } from 'lucide-react';
import ContactSeller from '@/components/ContactSeller';
import QuickChat from '@/components/QuickChat';
import useChat from '@/hooks/useChat';

// This is just an example component to demonstrate the chat functionality
const ProductDetailExample: React.FC = () => {
  // Example product data - in a real app, this would come from your API or database
  const product = {
    id: 'product123',
    title: 'Vintage Denim Jacket',
    price: 4500,
    description: 'A stylish vintage denim jacket in excellent condition. Size M. Perfect for layering in fall weather.',
    seller: {
      id: 'seller456',
      name: 'VintageFinds',
      rating: 4.8,
    },
    images: ['https://images.unsplash.com/photo-1601333144130-8cbb312386b6?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8ZGVuaW0lMjBqYWNrZXR8ZW58MHx8MHx8fDA%3D'],
    category: 'Clothing',
    condition: 'Used - Like New',
    size: 'M',
  };

  // Use our custom hook for chat functionality
  const { startChatWith } = useChat();

  const handleChatWithSeller = () => {
    startChatWith(product.seller.id);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Product Image */}
          <div className="rounded-lg overflow-hidden">
            <img 
              src={product.images[0]} 
              alt={product.title} 
              className="w-full h-auto object-cover aspect-square"
            />
          </div>
          
          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold">{product.title}</h1>
              <p className="text-2xl font-semibold mt-2">₹ {product.price}</p>
              
              <div className="flex flex-wrap gap-2 mt-4">
                <Badge variant="outline">{product.category}</Badge>
                <Badge variant="outline">{product.condition}</Badge>
                <Badge variant="outline">Size: {product.size}</Badge>
              </div>
            </div>
            
            <p className="text-gray-700">{product.description}</p>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Seller Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{product.seller.name}</p>
                    <p className="text-sm text-gray-500">Rating: {product.seller.rating}/5.0</p>
                  </div>
                  
                  {/* Using our ContactSeller component */}
                  <ContactSeller 
                    sellerId={product.seller.id}
                    productId={product.id}
                    productName={product.title}
                  />
                </div>
              </CardContent>
            </Card>
            
            <div className="flex gap-4">
              <Button className="flex-1">
                <ShoppingBag className="mr-2 h-5 w-5" />
                Add to Cart
              </Button>
              <Button variant="outline" className="flex-1">
                <Heart className="mr-2 h-5 w-5" />
                Add to Favorites
              </Button>
              <Button 
                variant="outline" 
                onClick={handleChatWithSeller}
              >
                <MessageCircle className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      
      {/* Quick Chat Component - fixed to bottom right */}
      <QuickChat 
        sellerId={product.seller.id}
        productId={product.id}
        productName={product.title}
      />
    </div>
  );
};

export default ProductDetailExample; 