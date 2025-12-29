// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDEIJlanhg5yZ83kqFyD5uCpj2hg99a5A8",
  authDomain: "mta-web-5a05d.firebaseapp.com",
  projectId: "mta-web-5a05d",
  storageBucket: "mta-web-5a05d.firebasestorage.app",
  messagingSenderId: "203869887586",
  appId: "1:203869887586:web:fbaa16e45ffcee385cc53b",
  measurementId: "G-F4V1FJ9WDJ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, googleProvider, db, storage };