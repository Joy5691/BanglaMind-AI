import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Native fallback configuration values derived from the verified Firebase applet settings.
// This prevents build crashes on Render if the JSON file is empty or missing in the git branch.
const firebaseConfig = {
  projectId: "banglamind-ai",
  appId: "1:131636454915:web:ff0b3f2fedb5ebf2a79036",
  apiKey: "AIzaSyAd1Z5dPtCVj1w9PnE3FoO52Lwlz5JgyJc",
  authDomain: "banglamind-ai.firebaseapp.com",
  firestoreDatabaseId: "(default)",
  storageBucket: "banglamind-ai.firebasestorage.app",
  messagingSenderId: "131636454915",
  measurementId: "G-1CPD3Q9WHG"
};

const env = (import.meta as any).env || {};

const app = initializeApp({
  projectId: env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  appId: env.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
  apiKey: env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
});

export const auth = getAuth(app);
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)" 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
    throw error;
  }
};

export { onAuthStateChanged };
