
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

const firebaseConfig = { apiKey: "AIzaSyBd3d_1T95NEa3wIF6ih8PicZ1B21koKeA", authDomain: "invoicing-ddd3c.firebaseapp.com", projectId: "invoicing-ddd3c", storageBucket: "invoicing-ddd3c.firebasestorage.app", messagingSenderId: "414608593822", appId: "1:414608593822:web:b57d9e816864f636dc7c8f", measurementId: "G-0TMKVJ1WHX" };


// Initialize Firebase once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);
