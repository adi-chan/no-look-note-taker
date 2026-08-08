import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBOt_uTBehJMqhXUx47wB_aoZJ5dpUvCLM",
  authDomain: "no-look-note-taker-494e2.firebaseapp.com",
  projectId: "no-look-note-taker-494e2",
  storageBucket: "no-look-note-taker-494e2.firebasestorage.app",
  messagingSenderId: "799937836312",
  appId: "1:799937836312:web:914b9f709a2b9e79af1a6d",
  measurementId: "G-CPG21J77HP"
};

// Initialize Firebase only if it hasn't been initialized already (useful for Next.js SSR)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/calendar.events');

// Analytics is only available in the browser
export const analytics = typeof window !== "undefined" ? isSupported().then(yes => yes ? getAnalytics(app) : null) : null;
