import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Loader2 } from "lucide-react";

const UserPage: React.FC = () => {
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async (uid: string) => {
      try {
        const userDocRef = doc(db, "users", uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      if (!authUser) {
        navigate("/login");
      } else {
        fetchUserData(authUser.uid);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="animate-spin w-8 h-8 text-brand-green" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-12 container">
        <h2 className="text-2xl font-bold mb-6">Your Profile</h2>
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-4">Sold Products</h3>
          <ul className="space-y-4">
            {userData?.soldProducts?.length ? (
              userData.soldProducts.map((product: any, index: number) => (
                <li key={index} className="border p-4 rounded-md">
                  <h4 className="font-medium">{product.name}</h4>
                  <p className="text-sm text-gray-500">Price: ${product.price}</p>
                </li>
              ))
            ) : (
              <p className="text-gray-500">No sold products yet.</p>
            )}
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-4">Bought Products</h3>
          <ul className="space-y-4">
            {userData?.boughtProducts?.length ? (
              userData.boughtProducts.map((product: any, index: number) => (
                <li key={index} className="border p-4 rounded-md">
                  <h4 className="font-medium">{product.name}</h4>
                  <p className="text-sm text-gray-500">Price: ${product.price}</p>
                </li>
              ))
            ) : (
              <p className="text-gray-500">No bought products yet.</p>
            )}
          </ul>

          <Button onClick={() => navigate("/profile")} className="mt-6">
            Back to Profile
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default UserPage;
