import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA8pfqy86sN7z5xVv4fIEbsEvhzRzEjZOc",
  authDomain: "teams-a13c6.firebaseapp.com",
  projectId: "teams-a13c6",
  storageBucket: "teams-a13c6.firebasestorage.app",
  messagingSenderId: "132740994389",
  appId: "1:132740994389:web:6aeeabf9ecb55b994e4bdc",
  measurementId: "G-FP0SQKWG14"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;

