import { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db, auth } from "./firebase";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom"; // Import Link for navigation
import { useToast } from "@/hooks/use-toast";

const Favorites = () => {
  const [favorites, setFavorites] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const fetchFavorites = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const favCollection = collection(db, `users/${user.uid}/favorites`);
      const querySnapshot = await getDocs(favCollection);
      setFavorites(querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    };

    fetchFavorites();
  }, []);

  const removeFavorite = async (id: string) => {
    const user = auth.currentUser;
    if (!user) return;

    await deleteDoc(doc(db, `users/${user.uid}/favorites`, id));
    setFavorites(favorites.filter((item) => item.id !== id));
    toast({ title: "Removed from favorites", variant: "destructive" });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-12 px-6">
        <h2 className="text-3xl font-bold text-center mb-6">Your Favorites</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 px-4">
          {favorites.length > 0 ? (
            favorites.map((item) => (
              <div key={item.id} className="bg-white p-4 rounded-lg shadow-md">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-48 object-cover rounded-md"
                />
                <h3 className="text-lg font-bold mt-2">{item.title}</h3>
                <p className="text-gray-600">${item.price}</p>
                <div className="flex mt-3 gap-3">
                  {/* Add Remove Button */}
                  <Button variant="destructive" onClick={() => removeFavorite(item.id)}>
                    Remove
                  </Button>
                  {/* Add Buy Now Button */}
                  <Link to={`/payment/${item.id}`}>
                    <Button className="bg-green-600 hover:bg-green-700 text-white">
                      Buy Now
                    </Button>
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500">No favorites added yet.</p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Favorites;
