import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyCdBLZ58rHoZhF8qhmFq8rzRY0umTFYghM",
  authDomain: "nc-diff.firebaseapp.com",
  databaseURL: "https://nc-diff-default-rtdb.firebaseio.com",
  projectId: "nc-diff",
  storageBucket: "nc-diff.appspot.com",
  messagingSenderId: "925097998508",
  appId: "1:925097998508:web:2820ab4689c38a34228709",
  measurementId: "G-QS8X8FSL9S"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database
export const database = getDatabase(app);
