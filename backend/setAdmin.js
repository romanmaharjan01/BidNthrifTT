import admin from "firebase-admin";
import { readFile } from "fs/promises";

// Load Firebase Admin credentials from JSON file
const serviceAccount = JSON.parse(
  await readFile(new URL("./serviceAccountKey.json", import.meta.url))
);

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// User UID to be assigned admin role
const uid = "GIH0GoimPNaxVhdV4thFZtgQgOG3"; // Replace with the actual user UID

admin.auth().setCustomUserClaims(uid, { admin: true })
  .then(() => {
    console.log(`✅ Admin role assigned to user: ${uid}`);
  })
  .catch(error => {
    console.error("❌ Error assigning admin role:", error);
  });
