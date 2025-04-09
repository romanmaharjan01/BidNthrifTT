<<<<<<< HEAD
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db, storage } from "./firebase";
import { User, signOut, updateProfile, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Pencil, Upload } from "lucide-react";

const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [profileImage, setProfileImage] = useState<string>("");
  const [newImage, setNewImage] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // 🔍 Check Auth State and Fetch User Data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (!authUser) {
        navigate("/login");
        return;
      }

      setUser(authUser);
      setEmail(authUser.email || "");

      const userDocRef = doc(db, "users", authUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        setName(userData.fullName || authUser.displayName || generateDefaultName(authUser.email));
        setProfileImage(userData.profileImage || authUser.photoURL || "https://via.placeholder.com/150");
      } else {
        const generatedName = generateDefaultName(authUser.email);
        await setDoc(userDocRef, { fullName: generatedName, profileImage: "" });
        setName(generatedName);
        setProfileImage("https://via.placeholder.com/150");
      }

      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  // 🔠 Generate Default Name from Email
  const generateDefaultName = (email: string): string => {
    return email.split("@")[0].replace(/[\._-]/g, " ");
  };

  // 🎨 Enable Edit Mode
  const handleEdit = () => {
    setIsEditing(true);
  };

  // 📸 Handle Image Selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewImage(file);
      setProfileImage(URL.createObjectURL(file)); // Temporary preview URL
    }
  };

  // 💾 Save Updated Name & Profile Image
  const handleSave = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      let imageURL = profileImage;

      if (newImage) {
        const imageRef = ref(storage, `profileImages/${user.uid}`);
        await uploadBytes(imageRef, newImage);
        imageURL = await getDownloadURL(imageRef); // Permanent URL after upload
        setProfileImage(imageURL); // Update state with the permanent URL
      }

      // 🔄 Update Firebase Auth Profile
      await updateProfile(user, { displayName: name, photoURL: imageURL });

      // 🔄 Update Firestore User Data
      await setDoc(doc(db, "users", user.uid), { fullName: name, profileImage: imageURL }, { merge: true });

      toast({ title: "Profile Updated!", description: "Your changes have been saved." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsEditing(false);
      setIsLoading(false);
    }
  };

  // 🚪 Logout User
  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="animate-spin w-8 h-8 text-brand-green" />
=======
// src/pages/ProductDetail.tsx
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc, arrayUnion, getDocs, query, collection, where } from "firebase/firestore";
import { db, auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import "./Shop.css";

// Utility function to remove undefined values from an object
const removeUndefined = (obj: any): any => {
  const newObj: any = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined) {
      newObj[key] = obj[key];
    }
  });
  return newObj;
};

interface Product {
  id: string;
  title: string;
  price: number | string;
  currentBid?: number | string;
  description: string;
  imageUrl: string;
  stock: number;
  category: string;
  size: string;
  isAuction: boolean;
  endsAt?: string;
  seller: string;
}

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) {
        setError("Product ID is missing.");
        setLoading(false);
        return;
      }

      try {
        const productRef = doc(db, "products", id);
        const productSnap = await getDoc(productRef);

        if (productSnap.exists()) {
          const data = productSnap.data();
          setProduct({
            id: productSnap.id,
            title: data.title || "",
            price: data.price !== undefined ? Number(data.price) : 0,
            currentBid: data.currentBid !== undefined ? Number(data.currentBid) : undefined,
            description: data.description || "",
            imageUrl: data.imageUrl || "",
            stock: data.stock || 0,
            category: data.category || "",
            size: data.size || "",
            isAuction: data.isAuction || false,
            endsAt: data.endsAt || undefined,
            seller: data.seller || "",
          } as Product);
        } else {
          setError("Product not found.");
        }
      } catch (err) {
        console.error("Error fetching product:", err);
        setError("Failed to load product. Please try again later.");
        toast({
          title: "Error",
          description: "Failed to load product. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, toast]);

  const handleAddToCart = async () => {
    if (!userId) {
      toast({
        title: "Please Log In",
        description: "You need to be logged in to add items to your cart.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    if (!product) return;

    try {
      // Clean the product object to remove undefined values
      const cleanedProduct = removeUndefined(product);

      const cartQuery = query(collection(db, "carts"), where("userId", "==", userId));
      const cartSnapshot = await getDocs(cartQuery);
      let cartRef;

      if (cartSnapshot.empty) {
        cartRef = doc(db, "carts", userId);
        await setDoc(cartRef, {
          userId,
          items: [{ productId: product.id, quantity: 1, ...cleanedProduct }],
        });
      } else {
        cartRef = doc(db, "carts", userId);
        await setDoc(
          cartRef,
          {
            items: arrayUnion({ productId: product.id, quantity: 1, ...cleanedProduct }),
          },
          { merge: true }
        );
      }

      toast({
        title: "Added to Cart",
        description: `${product.title} has been added to your cart.`,
      });

      navigate("/cart");
    } catch (err) {
      console.error("Error adding to cart:", err);
      toast({
        title: "Error",
        description: "Failed to add item to cart. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex justify-center items-center flex-1">
          <Loader2 className="animate-spin w-8 h-8 text-brand-green" />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 py-12 flex items-center justify-center">
          <div className="max-w-lg w-full p-6 bg-white shadow-lg rounded-lg text-center">
            <h2 className="text-2xl font-bold mb-4">{error || "Product not found."}</h2>
            <Button
              onClick={() => navigate("/shop")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Back to Shop
            </Button>
          </div>
        </main>
        <Footer />
>>>>>>> e553efe (Initial commit after fixing corruption)
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-12 flex items-center justify-center">
<<<<<<< HEAD
        <div className="max-w-lg w-full p-6 bg-white shadow-lg rounded-lg">
          <h2 className="text-2xl font-bold text-center mb-6">Profile</h2>

          {/* 🖼️ Profile Image Display */}
          <div className="flex flex-col items-center mb-6">
            <img
              src={profileImage}
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover border"
            />
          </div>

          {/* 📌 User Info */}
          <div className="space-y-4">
            {/* Profile Image URL Section */}
            <div>
              <Label htmlFor="profileImage">Profile Image URL</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="profileImage"
                  type="text"
                  value={profileImage}
                  disabled={!isEditing}
                  onChange={(e) => setProfileImage(e.target.value)} // Optional: allow manual URL editing
                  className="break-all"
                />
                {isEditing && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="imageUpload"
                    />
                    <label htmlFor="imageUpload">
                      <Button variant="outline" size="icon" asChild>
                        <Upload className="w-5 h-5" />
                      </Button>
                    </label>
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="name">Full Name</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isEditing}
                />
                {!isEditing ? (
                  <Button variant="outline" size="icon" onClick={handleEdit}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isLoading ? "Saving..." : "Save"}
                  </Button>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} disabled />
            </div>
          </div>

          {/* 📝 View Details Button */}
          <div className="mt-6">
            <Button
              onClick={() => navigate("/user-details")}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              View Details
            </Button>
          </div>

          {/* 🔓 Logout Button */}
          <div className="mt-6 flex flex-col gap-4">
            <Button onClick={handleLogout} variant="destructive" className="w-full">
              Logout
            </Button>
=======
        <div className="max-w-4xl w-full p-6 bg-white shadow-lg rounded-lg flex gap-6">
          <div className="flex-1">
            <img
              src={product.imageUrl || "https://via.placeholder.com/300"}
              alt={product.title}
              className="w-full h-96 object-contain rounded-lg border"
            />
          </div>

          <div className="flex-1 space-y-4">
            <h2 className="text-2xl font-bold">{product.title}</h2>

            <div>
              <Label>Price</Label>
              <p className="text-lg font-semibold text-green-600">
                ₨{typeof product.price === "number" ? product.price.toFixed(2) : product.price}
              </p>
            </div>

            {product.isAuction && (
              <div>
                <Label>Auction Status</Label>
                <p
                  className={`text-lg font-semibold ${
                    new Date(product.endsAt!).getTime() < Date.now()
                      ? "text-red-600"
                      : "text-gray-600"
                  }`}
                >
                  {new Date(product.endsAt!).getTime() < Date.now()
                    ? "Auction Ended"
                    : `Current Bid: ₨${
                        typeof product.currentBid === "number"
                          ? product.currentBid.toFixed(2)
                          : product.currentBid
                      }`}
                </p>
              </div>
            )}

            <div>
              <Label>Stock</Label>
              <p
                className={`text-lg font-semibold ${
                  product.stock > 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {product.stock > 0 ? `In Stock (${product.stock})` : "Out of Stock"}
              </p>
            </div>

            <div>
              <Label>Category</Label>
              <p className="text-gray-600">{product.category}</p>
            </div>

            <div>
              <Label>Size</Label>
              <p className="text-gray-600">{product.size}</p>
            </div>

            <div>
              <Label>Description</Label>
              <p className="text-gray-600">{product.description}</p>
            </div>

            <div>
              <Label>Seller</Label>
              <p className="text-gray-600">{product.seller}</p>
            </div>

            <div className="flex gap-4 mt-6">
              {product.stock > 0 && !product.isAuction && (
                <>
                  <Button
                    onClick={() => navigate(`/payment/${product.id}`)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Buy Now
                  </Button>
                  <Button
                    onClick={handleAddToCart}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Add to Cart
                  </Button>
                </>
              )}
              <Button
                onClick={() => navigate("/shop")}
                variant="outline"
                className="border-gray-300"
              >
                Back to Shop
              </Button>
            </div>
>>>>>>> e553efe (Initial commit after fixing corruption)
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

<<<<<<< HEAD
export default ProfilePage;
=======
export default ProductDetail;
>>>>>>> e553efe (Initial commit after fixing corruption)
