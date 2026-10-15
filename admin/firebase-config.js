import {
  initializeApp,
  getApp,
  getApps,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

import {
  getAuth,
  initializeAuth,
  inMemoryPersistence,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import { getStorage } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";

// Oven2Door Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyA2237IQgmv-F4DHnKB5MWJZgDM4BU4x4o",
  authDomain: "oven2door.firebaseapp.com",
  projectId: "oven2door",
  storageBucket: "oven2door.firebasestorage.app",
  messagingSenderId: "670039143562",
  appId: "1:670039143562:web:b285777d39aab8adc62973",
  measurementId: "G-TC6K1YL9VS",
};

// Main Firebase application
export const app = getApps().some((a) => a.name === "[DEFAULT]")
  ? getApp()
  : initializeApp(firebaseConfig);

// Main Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Secondary application for account creation
export const secondaryApp = getApps().some(
  (a) => a.name === "oven2door-account-creation",
)
  ? getApp("oven2door-account-creation")
  : initializeApp(firebaseConfig, "oven2door-account-creation");

// Secondary Authentication
export const secondaryAuth = initializeAuth(secondaryApp, {
  persistence: inMemoryPersistence,
});

// Secondary Firestore
export const secondaryDb = getFirestore(secondaryApp);
