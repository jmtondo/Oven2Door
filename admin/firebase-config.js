import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyA2237IQgmv-F4DHnKB5MWJZgDM4BU4x4o",
  authDomain: "oven2door.firebaseapp.com",
  projectId: "oven2door",
  storageBucket: "oven2door.firebasestorage.app",
  messagingSenderId: "670039143562",
  appId: "1:670039143562:web:b285777d39aab8adc62973",
  measurementId: "G-TC6K1YL9VS",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
