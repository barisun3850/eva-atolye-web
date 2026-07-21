import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDbCevmMXnQpda6qQ_UZ9fQVkYkk3SJzB4",
  authDomain: "evapaspas38.firebaseapp.com",
  projectId: "evapaspas38",
  storageBucket: "evapaspas38.firebasestorage.app",
  messagingSenderId: "592635328620",
  appId: "1:592635328620:web:c81a6ccd03df5646998049",
  measurementId: "G-X33EYY2BE2",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
