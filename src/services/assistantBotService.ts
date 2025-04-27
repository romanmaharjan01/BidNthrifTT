import { db, auth } from "../pages/firebase";
import { collection, addDoc, serverTimestamp, query, where, orderBy, onSnapshot, doc, getDoc, getDocs, writeBatch } from "firebase/firestore";

// Types for bot messages
export interface BotMessage {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

// Fashion brand database with style information
const fashionBrands = {
  luxury: {
    brands: ["Gucci", "Prada", "Louis Vuitton", "Chanel", "Dior", "Versace", "Balenciaga", "Hermès", "Fendi", "Burberry"],
    styles: "High-end, statement pieces with distinctive designs and premium quality materials.",
    sizingNotes: "Luxury brands often run smaller than standard sizing. Consider sizing up."
  },
  highStreet: {
    brands: ["Zara", "H&M", "Mango", "Uniqlo", "Topshop", "ASOS", "Urban Outfitters", "Massimo Dutti", "COS", "& Other Stories"],
    styles: "Trendy, affordable pieces that follow current fashion trends.",
    sizingNotes: "Varies by brand - Zara tends to run small, while H&M and ASOS are more true to size."
  },
  athleisure: {
    brands: ["Nike", "Adidas", "Lululemon", "Gymshark", "Under Armour", "Puma", "Reebok", "Champion", "Fila", "New Balance"],
    styles: "Performance-focused sportswear that doubles as casual everyday clothing.",
    sizingNotes: "Athletic brands often have detailed size guides with measurements for fit."
  },
  sustainable: {
    brands: ["Patagonia", "Reformation", "Everlane", "Eileen Fisher", "Veja", "Stella McCartney", "HUBA", "Thought Clothing", "People Tree", "Girlfriend Collective"],
    styles: "Eco-friendly materials with classic, timeless designs meant to last for years.",
    sizingNotes: "Sustainable brands often use natural fibers which may shrink more than synthetic materials."
  },
  vintage: {
    brands: ["Levi's", "Wrangler", "Calvin Klein", "Ralph Lauren", "Tommy Hilfiger", "Guess", "Dior", "YSL", "Chanel", "Versace"],
    styles: "Authentic period pieces from previous decades, offering unique style and quality craftsmanship.",
    sizingNotes: "Vintage sizing typically runs smaller than modern sizing. Check measurements carefully."
  },
  plusSize: {
    brands: ["Torrid", "ELOQUII", "Universal Standard", "Lane Bryant", "ASOS Curve", "City Chic", "Fashion to Figure", "Girlfriend Collective", "Good American", "ModCloth"],
    styles: "Fashion-forward styles designed specifically for curvy bodies with proper proportions.",
    sizingNotes: "Specialized plus-size brands offer more consistent sizing for curvy figures."
  },
  petite: {
    brands: ["Anthropologie Petite", "ASOS Petite", "Reformation Petite", "J.Crew Petite", "Banana Republic Petite", "Topshop Petite", "Ann Taylor Petite", "Loft Petite", "H&M Petite", "Express Petite"],
    styles: "Properly proportioned pieces for those under 5'4\" with adjusted sleeve and hem lengths.",
    sizingNotes: "Designed for frames under 5'4\" with proportionally adjusted details."
  },
  tall: {
    brands: ["ASOS Tall", "Long Tall Sally", "Gap Tall", "Banana Republic Tall", "J.Crew Tall", "Old Navy Tall", "AllSaints", "American Tall", "Next Tall", "New Look Tall"],
    styles: "Extended lengths and adjusted proportions for those 5'8\" and above.",
    sizingNotes: "Offers longer inseams, sleeves, and torso lengths for taller frames."
  }
};

// Body type recommendations
const bodyTypeRecommendations = {
  apple: {
    description: "Carries weight around the midsection with slimmer legs and hips.",
    recommendations: "Empire waists, A-line dresses, vertical stripes, and tops that elongate the torso. Avoid clingy fabrics around the midsection.",
    brands: ["Old Navy", "Eileen Fisher", "Calvin Klein", "ELOQUII", "Universal Standard"]
  },
  pear: {
    description: "Narrower shoulders and wider hips, with weight carried in the lower body.",
    recommendations: "A-line skirts, boat necks, statement tops, and dresses with fitted tops and flowy bottoms. Dark colors on bottom, lighter on top.",
    brands: ["J.Crew", "Reformation", "Madewell", "LOFT", "Anthropologie"]
  },
  hourglass: {
    description: "Proportionate bust and hips with a defined waist.",
    recommendations: "Wrap dresses, high-waisted bottoms, fitted clothing that accentuates the waist. Avoid boxy or shapeless styles.",
    brands: ["Good American", "Reformation", "Boden", "Karen Millen", "Diane von Furstenberg"]
  },
  rectangle: {
    description: "Balanced proportions with less defined waist.",
    recommendations: "Belted dresses and tops, peplum styles, layers to create dimension. Avoid shapeless sack dresses.",
    brands: ["Mango", "Banana Republic", "COS", "& Other Stories", "Theory"]
  },
  inverted_triangle: {
    description: "Broader shoulders and narrower hips.",
    recommendations: "Full skirts, wide-leg pants, details on the lower half to balance proportions. Avoid embellished tops and caps sleeves.",
    brands: ["Everlane", "Gap", "White House Black Market", "Ann Taylor", "Express"]
  }
};

// Color recommendations based on seasons
const colorRecommendations = {
  spring: {
    palette: "Light, warm, and clear colors",
    colors: ["Peach", "Coral", "Warm Yellow", "Bright Green", "Light Blue", "Apricot"],
    avoid: "Dark, muted colors and black"
  },
  summer: {
    palette: "Cool, soft, muted colors",
    colors: ["Lavender", "Powder Blue", "Rose Pink", "Soft Gray", "Periwinkle", "Mauve"],
    avoid: "Harsh bright colors and black"
  },
  autumn: {
    palette: "Warm, rich, earthy colors",
    colors: ["Olive Green", "Terracotta", "Mustard Yellow", "Rust", "Camel", "Warm Brown"],
    avoid: "Icy colors and black"
  },
  winter: {
    palette: "Clear, cool, bright colors",
    colors: ["Pure White", "Black", "Navy", "Royal Blue", "Emerald Green", "Fuchsia"],
    avoid: "Muted, earthy tones"
  }
};

// Height-specific styling recommendations
const heightRecommendations = {
  petite: {
    heightRange: "Under 5'4\" (163cm)",
    recommendations: "High-waisted bottoms, cropped jackets, vertical details, monochromatic outfits, and proper hem lengths.",
    avoid: "Oversized clothing, long dresses without breaks, chunky shoes, drop waists."
  },
  average: {
    heightRange: "5'4\" - 5'7\" (163-170cm)",
    recommendations: "Most styles work well, focus on proper proportions and fit.",
    avoid: "Extremes in proportion that can throw off your natural balance."
  },
  tall: {
    heightRange: "5'8\" and above (173cm+)",
    recommendations: "Horizontal stripes, longer hemlines, belted styles to break up height, layers.",
    avoid: "Too-short hemlines that make clothes look outgrown."
  }
};

// Categories with sample responses
const botResponses = {
  greeting: [
    "Hello! I'm your BidNthrifT fashion assistant. I can help with style advice and brand recommendations based on your body type, coloring, and preferences. What are you looking for today?",
    "Welcome to BidNthrifT! I'm here to help you find perfect pieces for your unique style. I can recommend brands and styles based on your height, body type, and color preferences.",
    "Hi there! Looking for fashion advice? I can suggest brands and styles that would flatter your body type and coloring. What would you like help with today?"
  ],
  
  style: [
    "Based on your style preferences, I would recommend trying our vintage collection. We have several items that would complement your look perfectly.",
    "For your body type, A-line dresses and high-waisted items would look fantastic. We have several options in our 'Recommended for You' section.",
    "If you're looking for a business casual look, check out our blazer and slacks combinations. They're trending this season!",
    "For your height, midi dresses and vertical stripes would be most flattering. We have several new arrivals that match this style."
  ],
  
  outfit: [
    "For a casual day out, pair our vintage jeans with the white linen top and add a statement necklace for a pop of color.",
    "For an office look, our navy blazer with a cream blouse and tailored pants would be perfect - professional yet stylish.",
    "For a wedding guest outfit, consider our floral midi dress paired with nude heels and a small clutch.",
    "For a first date, I'd suggest our black jeans paired with our burgundy top - casual but put-together, and the color is universally flattering."
  ],
  
  bodyType: [
    "For an apple body shape, look for styles that elongate your torso and show off your legs. Empire waist tops, A-line dresses, and straight-leg pants would be flattering choices.",
    "With a pear-shaped body, balance your proportions with boat necks, statement tops, and A-line skirts. Brands like Reformation and J.Crew offer great options for your shape.",
    "For an hourglass figure, wrap dresses and high-waisted styles accentuate your natural curves beautifully. Reformation and Good American are excellent brand choices.",
    "If you have a rectangular body shape, create definition with belted pieces and peplum tops. Mango and COS offer stylish options that add dimension."
  ],
  
  height: [
    "For petite frames under 5'4\", look for high-waisted styles and proper hem lengths. Brands like ASOS Petite and Anthropologie Petite offer specially proportioned pieces.",
    "At your tall height, you can carry longer hemlines and horizontal patterns beautifully. Check out ASOS Tall and Long Tall Sally for pieces designed for your frame.",
    "With your average height, most styles will work well. Focus on getting the right proportions and fit for your body type rather than height-specific styles.",
    "For someone of your height, proper inseam lengths are important. Our brands offer various length options to ensure the perfect fit."
  ],
  
  colorAnalysis: [
    "With your warm undertones, you likely fall into the Spring or Autumn color season. Colors like coral, peach, warm greens, and camel would enhance your natural coloring.",
    "Your cool undertones suggest a Summer or Winter palette. Try colors like lavender, powder blue, mauve, or true white to complement your coloring.",
    "With your high contrast features, jewel tones like emerald, sapphire, and ruby would look stunning on you. These Winter palette colors highlight your natural contrast.",
    "Your soft, muted coloring pairs beautifully with the Summer palette. Lavender, dusty rose, and powder blue will enhance your natural beauty."
  ],
  
  product: [
    "This item is made from sustainable materials and features hand-stitched details. It's one of our popular choices for your body type!",
    "This product is a limited edition piece, with only 50 made. It features premium materials and would complement your coloring beautifully.",
    "This is a vintage piece from the 1980s in excellent condition. The A-line silhouette would flatter your figure perfectly.",
    "This item is designed by a local artisan who specializes in sustainable fashion. The cut would be ideal for your height and proportions."
  ],
  
  // Add specific brands/products category
  brands: [
    "We carry a curated selection of both mainstream and independent brands. Is there a specific brand you're looking for? Or would you like recommendations based on your body type and style preferences?",
    "Our most popular brands include Reformation, Everlane, and Levi's, each offering different fits and styles. Would you like me to recommend specific brands for your body type and height?",
    "We specialize in sustainable and ethical brands that prioritize fair labor practices and eco-friendly materials. Brands like Reformation and Patagonia would offer excellent options for your body type.",
    "Our vintage collection includes authentic pieces from brands like Levi's, Calvin Klein, and many others from different eras. Vintage shopping requires attention to measurements, as sizing differs from modern standards."
  ],
  
  // Add HUBA specific responses
  huba: [
    "HUBA is one of our partner brands that focuses on sustainable fashion. They're known for their minimalist designs and eco-friendly materials. Their cuts tend to flatter a variety of body types.",
    "HUBA's collection features casual wear made from organic cotton and recycled materials. They offer styles that work particularly well for your body type, with adjustable features for a custom fit.",
    "HUBA items typically run true to size and are known for their durability. Their pieces are designed to flatter various heights and body types, with thoughtful details for enhanced fit.",
    "HUBA is a local designer brand exclusive to BidNthrifT. They specialize in gender-neutral streetwear with bold patterns, and their adjustable designs work well for different body types."
  ],
  
  size: [
    "For your body measurements, I'd recommend our size Medium in most brands, though sizing varies between manufacturers. If you're between sizes, consider your body shape - apple shapes might size up, while pear shapes might consider your upper body measurement.",
    "For this style and your height, customers often recommend sizing up for a more comfortable fit, especially if you're between sizes or have a fuller bust.",
    "This brand tends to run slightly small. With your measurements, I'd recommend going one size up from your usual for the perfect fit. Their size guide suggests this would accommodate your proportions best.",
    "With your tall frame, you might need to look for brands with 'Tall' options for proper sleeve and inseam lengths. Standard sizes might be too short in the arms and legs."
  ],
  
  shipping: [
    "We typically ship orders within 1-2 business days. Standard shipping takes 3-5 business days, while express shipping is 1-2 business days.",
    "International shipping usually takes 7-14 business days, depending on your location and customs processing times.",
    "Shipping is free for orders over $50 within the continental US. International shipping rates vary by destination.",
    "You can track your order through the link in your confirmation email or by logging into your account and checking your order status."
  ],
  
  returns: [
    "We offer a 30-day return policy for most items. The product must be unworn with original tags attached.",
    "For sale items, we offer exchanges or store credit within 14 days of receiving your order.",
    "To initiate a return, please log into your account, go to your orders, and select the items you wish to return.",
    "Return shipping is free for exchanges. For refunds, the return shipping cost will be deducted from your refund amount."
  ],
  
  payment: [
    "We accept all major credit cards, PayPal, and Apple Pay. All transactions are secure and encrypted.",
    "For orders over $100, we offer a 'Buy Now, Pay Later' option through Klarna, allowing you to split your payment into 4 interest-free installments.",
    "Gift cards can be used in combination with other payment methods. Simply enter the gift card code at checkout.",
    "We process refunds back to the original payment method, which typically takes 5-10 business days to appear in your account."
  ],
  
  auction: [
    "Our auction system lets you bid on unique items. The highest bidder at the end of the auction period wins the item.",
    "You can set up automatic bidding by entering your maximum bid amount. The system will automatically increase your bid as needed up to your maximum.",
    "You'll receive notifications when you're outbid or when auctions you're watching are ending soon.",
    "If you win an auction, payment is due within 48 hours. The item will be shipped once payment is confirmed."
  ],
  
  sustainability: [
    "Many of our items are from sustainable brands that use eco-friendly materials and ethical manufacturing processes.",
    "Our vintage and second-hand selections help reduce fashion waste by giving beautiful items a second life.",
    "We use plastic-free packaging made from recycled materials for all our shipments.",
    "We have a clothing recycling program where you can send us your old clothes for store credit, and we'll ensure they're properly recycled or donated."
  ],
  
  fallback: [
    "I'd love to help with your fashion needs. Could you tell me a bit about your body type, height, or color preferences so I can make better recommendations?",
    "I'm not familiar with that particular item or topic. Would it help if I suggested brands based on your body type or height? Just let me know your measurements or preferences.",
    "While I don't have details on that specific request, I can help you find clothing that flatters your body type and coloring. What are your measurements or color preferences?",
    "I'm still learning about our inventory! I could give you better recommendations if you share your body type, height, or style preferences. What kind of look are you going for?"
  ]
};

// Function to get brand recommendations based on body type
const getBrandRecommendations = (bodyType) => {
  if (bodyTypeRecommendations[bodyType]) {
    return bodyTypeRecommendations[bodyType].brands.join(", ");
  }
  return null;
};

// Function to get style recommendations based on height
const getHeightRecommendations = (height) => {
  let category = "average";
  if (height < 64) { // 5'4" in inches
    category = "petite";
  } else if (height >= 68) { // 5'8" in inches
    category = "tall";
  }
  return heightRecommendations[category].recommendations;
};

// Function to get color recommendations based on season
const getColorRecommendations = (season) => {
  if (colorRecommendations[season]) {
    return colorRecommendations[season].colors.join(", ");
  }
  return null;
};

// Function to select a response based on intent detection
const getResponse = (userMessage: string): string => {
  const message = userMessage.toLowerCase();
  
  // Extract height if mentioned (format: 5'4", 5ft4, 5 foot 4, etc.)
  const heightRegex = /(\d+)[\s']*(?:ft|foot|feet|')?[\s]*(\d+)?(?:in|inch|inches|")?/i;
  const heightMatch = message.match(heightRegex);
  let heightResponse = "";
  
  if (heightMatch) {
    const feet = parseInt(heightMatch[1]);
    const inches = heightMatch[2] ? parseInt(heightMatch[2]) : 0;
    const totalInches = feet * 12 + inches;
    
    if (totalInches < 64) {
      heightResponse = `At ${feet}'${inches ? inches : 0}", you'd be considered petite. ${heightRecommendations.petite.recommendations} Brands like ${fashionBrands.petite.brands.slice(0, 3).join(", ")} offer dedicated petite lines.`;
    } else if (totalInches >= 68) {
      heightResponse = `At ${feet}'${inches ? inches : 0}", you'd benefit from tall sizing options. ${heightRecommendations.tall.recommendations} Brands like ${fashionBrands.tall.brands.slice(0, 3).join(", ")} offer dedicated tall lines.`;
    } else {
      heightResponse = `At ${feet}'${inches ? inches : 0}", you're at an average height. ${heightRecommendations.average.recommendations} Most brands should fit you well in regular sizes.`;
    }
    return heightResponse;
  }
  
  // Extract weight or body type if mentioned
  const bodyTypeKeywords = {
    apple: ['apple', 'round', 'fuller middle', 'tummy', 'stomach', 'carries weight in middle'],
    pear: ['pear', 'triangle', 'bigger hips', 'bigger thighs', 'smaller on top'],
    hourglass: ['hourglass', 'curvy', 'equal bust and hips', 'defined waist', 'curves'],
    rectangle: ['rectangle', 'straight', 'athletic', 'boyish', 'not curvy', 'no curves'],
    inverted_triangle: ['inverted triangle', 'broad shoulders', 'wider shoulders', 'top heavy']
  };
  
  for (const [type, keywords] of Object.entries(bodyTypeKeywords)) {
    if (keywords.some(keyword => message.includes(keyword))) {
      return `For your ${type} body shape, ${bodyTypeRecommendations[type].recommendations} Brands like ${bodyTypeRecommendations[type].brands.slice(0, 3).join(", ")} offer flattering options for your figure.`;
    }
  }
  
  // Check for color preference mentions
  const colorKeywords = {
    spring: ['warm', 'golden', 'peach', 'warm skin', 'yellow undertone', 'golden skin'],
    summer: ['cool', 'pink', 'blue undertone', 'rose', 'cool skin'],
    autumn: ['warm', 'earthy', 'golden', 'autumn', 'warm skin', 'earthy colors'],
    winter: ['cool', 'high contrast', 'blue undertone', 'sharp', 'bold colors']
  };
  
  for (const [season, keywords] of Object.entries(colorKeywords)) {
    if (keywords.some(keyword => message.includes(keyword))) {
      return `Based on your coloring, you seem to have a ${season} color palette. ${colorRecommendations[season].palette} looks best on you. Try colors like ${colorRecommendations[season].colors.slice(0, 3).join(", ")} for your most flattering look.`;
    }
  }
  
  // Check for specific brand mentions
  if (message.includes('huba')) {
    return getRandomResponse('huba');
  }
  
  // Check for brand category mentions
  for (const [category, info] of Object.entries(fashionBrands)) {
    if (message.includes(category) || info.brands.some(brand => message.toLowerCase().includes(brand.toLowerCase()))) {
      return `For ${category} fashion, popular brands include ${info.brands.slice(0, 5).join(", ")}. ${info.styles} ${info.sizingNotes}`;
    }
  }
  
  // Simple keyword matching for general intent detection
  if (message.includes('hi') || message.includes('hello') || message.includes('hey')) {
    return getRandomResponse('greeting');
  } 
  else if (message.includes('body') || message.includes('shape') || message.includes('figure')) {
    return getRandomResponse('bodyType');
  }
  else if (message.includes('height') || message.includes('tall') || message.includes('short') || message.includes('petite')) {
    return getRandomResponse('height');
  }
  else if (message.includes('color') || message.includes('tone') || message.includes('palette') || message.includes('skin tone')) {
    return getRandomResponse('colorAnalysis');
  }
  else if (message.includes('style') || message.includes('look') || message.includes('fashion') || message.includes('trend')) {
    return getRandomResponse('style');
  }
  else if (message.includes('outfit') || message.includes('wear') || message.includes('dress') || message.includes('match')) {
    return getRandomResponse('outfit');
  }
  else if (message.includes('product') || message.includes('item') || message.includes('quality') || message.includes('material')) {
    return getRandomResponse('product');
  }
  else if (message.includes('brand') || message.includes('designer') || message.includes('collection')) {
    return getRandomResponse('brands');
  }
  else if (message.includes('size') || message.includes('fit') || message.includes('measurement')) {
    return getRandomResponse('size');
  }
  else if (message.includes('ship') || message.includes('delivery') || message.includes('arrive') || message.includes('track')) {
    return getRandomResponse('shipping');
  }
  else if (message.includes('return') || message.includes('exchange') || message.includes('refund')) {
    return getRandomResponse('returns');
  }
  else if (message.includes('pay') || message.includes('payment') || message.includes('card') || message.includes('checkout')) {
    return getRandomResponse('payment');
  }
  else if (message.includes('auction') || message.includes('bid') || message.includes('bidding')) {
    return getRandomResponse('auction');
  }
  else if (message.includes('sustainable') || message.includes('eco') || message.includes('environment') || message.includes('green')) {
    return getRandomResponse('sustainability');
  }
  else {
    // Added logic to handle product inquiries not explicitly matched
    if (message.match(/tell me (about|something about) ([a-z0-9\s]+)/i)) {
      const match = message.match(/tell me (about|something about) ([a-z0-9\s]+)/i);
      if (match && match[2]) {
        const productName = match[2].trim();
        
        // Check if it's a brand we know
        for (const category of Object.values(fashionBrands)) {
          const matchedBrand = category.brands.find(brand => 
            brand.toLowerCase() === productName.toLowerCase() || 
            productName.toLowerCase().includes(brand.toLowerCase())
          );
          
          if (matchedBrand) {
            return `${matchedBrand} is known for ${category.styles} ${category.sizingNotes} Would you like recommendations for specific items from this brand?`;
          }
        }
        
        return `I don't have specific information about ${productName} at the moment, but I'd be happy to help you find similar items based on your body type and preferences. Could you tell me more about what you're looking for?`;
      }
    }
    return getRandomResponse('fallback');
  }
};

// Get a random response from a category
function getRandomResponse(category: string): string {
  const responses = botResponses[category as keyof typeof botResponses] || botResponses.fallback;
  return responses[Math.floor(Math.random() * responses.length)];
}

// Check if bot is available for this user
export async function isBotAvailableForUser(userId: string): Promise<boolean> {
  if (!userId) return false;
  
  // Check if user is authenticated and has consumer role
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists() && userDoc.data().role === 'consumer') {
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error checking bot availability:", error);
    return false;
  }
}

// Process a message from the user and generate a response
export async function processBotMessage(userId: string, userMessage: string): Promise<string> {
  try {
    // Save user message
    await addDoc(collection(db, 'botMessages', userId, 'messages'), {
      content: userMessage,
      sender: 'user',
      timestamp: new Date()
    });
    
    // Generate response using the fashion knowledge database
    const botResponse = getResponse(userMessage);
    
    // Save bot response
    await addDoc(collection(db, 'botMessages', userId, 'messages'), {
      content: botResponse,
      sender: 'bot',
      timestamp: new Date()
    });
    
    return botResponse;
  } catch (error) {
    console.error("Error processing bot message:", error);
    return "I'm sorry, I'm having trouble responding right now. Please try again later.";
  }
}

// Get conversation history with the bot
export async function getBotConversationHistory(userId: string): Promise<BotMessage[]> {
  try {
    const messagesRef = collection(db, 'botMessages', userId, 'messages');
    const q = query(messagesRef, orderBy("timestamp", "asc"));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      content: doc.data().content,
      sender: doc.data().sender,
      timestamp: doc.data().timestamp.toDate()
    }));
  } catch (error) {
    console.error("Error getting bot conversation history:", error);
    return [];
  }
}

// Clear conversation history with the bot
export async function clearBotConversationHistory(userId: string): Promise<boolean> {
  try {
    const messagesRef = collection(db, 'botMessages', userId, 'messages');
    const querySnapshot = await getDocs(messagesRef);
    
    const batch = writeBatch(db);
    querySnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error("Error clearing bot conversation history:", error);
    return false;
  }
} 