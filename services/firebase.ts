import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAnalytics } from 'firebase/analytics';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAblTgcwRQQol3ArnjOGLULETDSkwQ2nfA",
  authDomain: "money-management-29d78.firebaseapp.com",
  databaseURL: "https://money-management-29d78-default-rtdb.firebaseio.com",
  projectId: "money-management-29d78",
  storageBucket: "money-management-29d78.firebasestorage.app",
  messagingSenderId: "590262168113",
  appId: "1:590262168113:web:9e67355dcc705fb2ed0310",
  measurementId: "G-P266KBR2B9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Realtime Database
export const database = getDatabase(app);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

// Sign out
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};

// Auth state observer
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
