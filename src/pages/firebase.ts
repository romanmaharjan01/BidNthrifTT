// Import Firebase modules
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// ✅ Firebase Project Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCj4qrMTXna4eEKoSuImVF65OCS2b9t65k",
  authDomain: "bidnthrift-adcd0.firebaseapp.com",
  projectId: "bidnthrift-adcd0",
  storageBucket: "bidnthrift-adcd0.appspot.com",
  messagingSenderId: "81280132890",
  appId: "1:81280132890:web:907138c4b033f6b7ec2ea3",
  measurementId: "G-KHG5G101NF",
};

// ✅ Initialize Firebase Services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app); // Firebase Authentication
const db = getFirestore(app); // Firestore Database
const storage = getStorage(app); // Firebase Storage

// ✅ Export Firebase Modules
export { app, auth, db, storage };
