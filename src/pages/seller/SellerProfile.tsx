import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db, storage } from "../firebase";
import { User, signOut, updateProfile, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Pencil, Upload } from "lucide-react";

const SellerProfile: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [profileImage, setProfileImage] = useState<string>("");
  const [newImage, setNewImage] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const { toast } = useToast();
  const navigate = useNavigate();

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

  const generateDefaultName = (email: string): string => {
    return email.split("@")[0].replace(/[\._-]/g, " ");
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewImage(file);
      setProfileImage(URL.createObjectURL(file)); // Temporary preview URL
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      let imageURL = profileImage;

      if (newImage) {
        const imageRef = ref(storage, `profileImages/${user.uid}`);
        await uploadBytes(imageRef, newImage);
        imageURL = await getDownloadURL(imageRef); // Get the final URL after upload
        setProfileImage(imageURL); // Update state with the permanent URL
      }

      await updateProfile(user, { displayName: name, photoURL: imageURL });
      await setDoc(doc(db, "users", user.uid), { fullName: name, profileImage: imageURL }, { merge: true });

      toast({ title: "Profile Updated!", description: "Your changes have been saved." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsEditing(false);
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="animate-spin w-8 h-8 text-brand-green" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 py-12 flex items-center justify-center">
        <div className="max-w-lg w-full p-6 bg-white shadow-lg rounded-lg">
          <h2 className="text-2xl font-bold text-center mb-6">Profile</h2>

          <div className="space-y-4">
            <div>
              <Label htmlFor="profileImage">Profile Image URL</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="profileImage"
                  type="text"
                  value={profileImage}
                  disabled={!isEditing}
                  onChange={(e) => setProfileImage(e.target.value)} // Allow manual URL editing if desired
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

          <div className="mt-6 flex flex-col gap-4">
            <Button onClick={handleLogout} variant="destructive" className="w-full">
              Logout
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SellerProfile;