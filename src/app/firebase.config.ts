import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyA2237IQgmv-F4DHnKB5MWJZgDM4BU4x4o',
  authDomain: 'oven2door.firebaseapp.com',
  projectId: 'oven2door',
  storageBucket: 'oven2door.firebasestorage.app',
  messagingSenderId: '670039143562',
  appId: '1:670039143562:web:b285777d39aab8adc62973',
  measurementId: 'G-TC6K1YL9VS'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firebase Authentication
export const auth = getAuth(app);

// Cloud Firestore
export const db = getFirestore(app);

// Firebase Storage
export const storage = getStorage(app);