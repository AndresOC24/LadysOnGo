// src/lib/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore }  from "firebase/firestore";   // para Firestore
// import { getDatabase } from "firebase/database";    // si prefieres RTDB
import { firebaseConfig } from "./firebaseConfig";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
// export const db = getDatabase(app);
