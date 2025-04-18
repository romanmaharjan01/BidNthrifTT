import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";
import "./Login.css";

// Custom thrift ad images
const thriftImages = [
  "https://media.gucci.com/style/White_South_0_160_316x316/1735926332/814040_FAD5T_8754_001_100_0000_Light-Mens-Gucci-20-sneaker.jpg",
  "https://th.bing.com/th/id/OIP.TU2ZYzxKo66PAnHVzQ4n0AHaLH?rs=1&pid=ImgDetMain",
  "https://th.bing.com/th/id/OIP.hz0dGKEfifLgTHsDeEou5gHaHa?rs=1&pid=ImgDetMain",
  "https://th.bing.com/th/id/R.6ef1a660c063e68a5e2cf0519d42b3a1?rik=WX%2fzahDqQ%2bdLbQ&riu=http%3a%2f%2fimages4.fanpop.com%2fimage%2fphotos%2f24100000%2fNike-nike-24111006-624-373.jpg&ehk=2nfiFCsdbBQ2vCy0OjV4XFWIyORgTRnB3rO%2bdGBixQU%3d&risl=&pid=ImgRaw&r=0",
  "https://th.bing.com/th/id/OIP.RMhU7VacsomnZaRqWbC9EQHaJQ?rs=1&pid=ImgDetMain",
];

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [banMessage, setBanMessage] = useState<string | null>(null); // State for ban message
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setBanMessage(null); // Reset ban message on new login attempt

    try {
      // Sign in the user
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Fetch user data to check ban status
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        throw new Error("User data not found in database.");
      }

      const userData = userDoc.data();

      // Check if the user is banned
      if (userData.banned) {
        setBanMessage(userData.banReason || "You have been banned from BidNThrift.");
        await auth.signOut(); // Sign out the user if banned
        setIsLoading(false);
        return;
      }

      const userRole = userData.role; // Assuming 'role' is a field in your user document

      toast({ title: "Success", description: "Logged in successfully!" });

      // Redirect based on user role
      switch (userRole) {
        case "consumer":
          navigate("/");
          break;
        case "seller":
          navigate("/seller");
          break;
        case "admin":
          navigate("/admin");
          break;
        default:
          // Fallback redirect if role is not recognized
          navigate("/");
          break;
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      if (!banMessage) {
        setIsLoading(false); // Only set loading to false if not banned
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="hidden md:block w-1/3 h-screen overflow-hidden image-gallery">
        <div className="animate-scroll flex flex-col">
          {thriftImages.map((src, index) => (
            <div key={index} className="image-container">
              <img
                src={src}
                alt={`Thrift Ad ${index + 1}`}
                className="w-full h-48 object-cover mb-4 rounded-lg shadow-md"
              />
            </div>
          ))}
        </div>
      </div>
      <div className="w-full md:w-2/3 flex justify-center items-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-center mb-6 text-primary">Welcome Back</h2>
          {banMessage && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
              <p>{banMessage}</p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <div className="mt-5 text-center">
            <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">
              Forgot Password?
            </Link>
          </div>
          <div className="mt-4 text-center text-gray-600">
            Don't have an account?{" "}
            <Link to="/register" className="text-blue-600 font-medium hover:underline">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;