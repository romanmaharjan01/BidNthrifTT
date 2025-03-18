import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../pages/firebase"; // Ensure correct import

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user); // Set true if user exists, false otherwise
    });

    return () => unsubscribe(); // Cleanup listener
  }, []);

  if (isAuthenticated === null) {
    return <div>Loading...</div>; // Show a loading screen while checking auth state
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

export default ProtectedRoute;
