// ==============================================
// UNIFIED FIREBASE CONFIGURATION
// ==============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { 
  getAuth, 
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { 
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  deleteDoc,
  increment,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// SINGLE CONFIGURATION SOURCE
const firebaseConfig = {
  apiKey: "AIzaSyDEIJlanhg5yZ83kqFyD5uCpj2hg99a5A8",
  authDomain: "mta-web-5a05d.firebaseapp.com",
  projectId: "mta-web-5a05d",
  storageBucket: "mta-web-5a05d.firebasestorage.app",
  messagingSenderId: "203869887586",
  appId: "1:203869887586:web:fbaa16e45ffcee385cc53b",
  measurementId: "G-F4V1FJ9WDJ"
};

// Initialize once
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const db = getFirestore(app);

// Export everything
export {
  // Core
  app,
  auth,
  db,
  googleProvider,
  
  // Auth methods
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  
  // Firestore methods
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  deleteDoc,
  increment,
  serverTimestamp,
  setDoc
};