import dotenv from "dotenv";
import admin from "firebase-admin";

dotenv.config();

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
  console.error("❌ Missing Firebase Environment Configurations in .env file!");
}

// Format newline characters safely to prevent RSA Key parsing crashes
const formattedPrivateKey = privateKey
  ? privateKey.replace(/\\n/g, "\n")
  : undefined;

const firebaseApp = admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey: formattedPrivateKey,
  }),
});

console.log("🔥 Firebase Admin SDK initialized successfully");

export default firebaseApp;
