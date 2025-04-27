// src/pages/user/Profile.tsx
import React, { useState, useEffect } from "react";
import { useOutletContext, useNavigate, useLocation } from "react-router-dom";
import { auth, db, storage } from "../firebase"; // Adjust path as needed
import { updateProfile, User } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Pencil, Upload } from "lucide-react";

interface ProfileData {
  fullName: string;
  email: string;
  profileImage: string;
}

interface Context {
  profile: ProfileData | null;
  navigate: (path: string) => void;
}

const ProfileSection: React.FC = () => {
  // Add a default empty object with optional chaining to handle null profile
  const location = useLocation();
  const isStandalone = !location.pathname.includes("user-details");
  const directNavigate = useNavigate();
  
  // In standalone mode, we won't have outlet context
  const outletContext = isStandalone ? null : useOutletContext<Context>();
  const { profile: contextProfile = null, navigate: contextNavigate } = outletContext || {};
  
  const navigate = isStandalone ? directNavigate : contextNavigate;
  
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [formData, setFormData] = useState<ProfileData>({
    fullName: "",
    email: "",
    profileImage: "",
  });
  const [newImage, setNewImage] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(isStandalone);
  const [profile, setProfile] = useState<ProfileData | null>(contextProfile);
  const { toast } = useToast();

  // Fetch user data when in standalone mode
  useEffect(() => {
    const fetchUserData = async () => {
      if (!isStandalone || !auth.currentUser) return;
      
      try {
        setIsLoading(true);
        const uid = auth.currentUser.uid;
        const userDocRef = doc(db, "users", uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setProfile({
            fullName: userData.fullName || auth.currentUser?.displayName || "Unknown",
            email: auth.currentUser?.email || "",
            profileImage: userData.profileImage || auth.currentUser?.photoURL || "https://placehold.co/150x150",
          });
        } else {
          setProfile({
            fullName: auth.currentUser?.displayName || "Unknown",
            email: auth.currentUser?.email || "",
            profileImage: auth.currentUser?.photoURL || "https://placehold.co/150x150",
          });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (isStandalone) {
      fetchUserData();
    } else {
      // When using in nested route, get profile from context
      setProfile(contextProfile);
    }
  }, [isStandalone, auth.currentUser, contextProfile, toast]);

  // Initialize form data when profile data is available
  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.fullName,
        email: profile.email,
        profileImage: profile.profileImage,
      });
    }
  }, [profile]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setNewImage(null);
    if (profile) {
      setFormData({
        fullName: profile.fullName,
        email: profile.email,
        profileImage: profile.profileImage,
      });
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewImage(file);
      setFormData((prev) => ({
        ...prev,
        profileImage: URL.createObjectURL(file), // Temporary preview URL
      }));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!auth.currentUser) {
      toast({
        title: "Error",
        description: "User not authenticated.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    setIsSaving(true);

    try {
      let imageURL = formData.profileImage;

      // If a new image is uploaded, save it to Firebase Storage
      if (newImage) {
        const imageRef = ref(storage, `profileImages/${auth.currentUser.uid}`);
        await uploadBytes(imageRef, newImage);
        imageURL = await getDownloadURL(imageRef); // Get the final URL after upload
        setFormData((prev) => ({ ...prev, profileImage: imageURL }));
      }

      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, {
        displayName: formData.fullName,
        photoURL: imageURL,
      });

      // Update Firestore user document
      await setDoc(
        doc(db, "users", auth.currentUser.uid),
        {
          fullName: formData.fullName,
          profileImage: imageURL,
        },
        { merge: true }
      );

      // Update local state
      setProfile({
        ...profile!,
        fullName: formData.fullName,
        profileImage: imageURL,
      });

      // Show success message
      toast({
        title: "Profile Updated!",
        description: "Your changes have been saved.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsEditing(false);
      setIsSaving(false);
      setNewImage(null);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="animate-spin w-8 h-8 text-teal-600" />
      </div>
    );
  }

  // If navigate is undefined in nested route or profile is not yet available
  if (!isStandalone && !navigate) {
    return <p className="no-items">Loading profile data...</p>;
  }

  // Show loading state if profile is not yet available
  if (!profile) {
    return <p className="no-items">Loading profile data...</p>;
  }

  // Render the standalone profile page with header
  if (isStandalone) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">My Profile</h1>
        <div className="bg-white p-6 rounded-lg shadow-md">
          {renderProfileForm()}
        </div>
      </div>
    );
  }

  // Render just the form for nested routes
  return renderProfileForm();

  // Helper function to render the profile form
  function renderProfileForm() {
    return (
      <section className="section">
        <h2 className="section-title">Profile</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="profileImage">Profile Image</Label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden">
                <img
                  src={formData.profileImage}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
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
            <Label htmlFor="fullName">Full Name</Label>
            <div className="flex items-center gap-2">
              <Input
                id="fullName"
                name="fullName"
                type="text"
                value={formData.fullName}
                onChange={handleInputChange}
                disabled={!isEditing}
              />
              {!isEditing ? (
                <Button variant="outline" size="icon" onClick={handleEdit}>
                  <Pencil className="w-4 h-4" />
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isSaving ? (
                      <Loader2 className="animate-spin w-4 h-4 mr-2" />
                    ) : null}
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              disabled
            />
          </div>
        </div>
      </section>
    );
  }
};

export default ProfileSection;