// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCmsf4XMgk_Bdz2hvyFOdA10-oya1rWA4k",
  authDomain: "taxi-beta-8dda7.firebaseapp.com",
  databaseURL: "https://taxi-beta-8dda7-default-rtdb.firebaseio.com",
  projectId: "taxi-beta-8dda7",
  storageBucket: "taxi-beta-8dda7.firebasestorage.app",
  messagingSenderId: "400780242128",
  appId: "1:400780242128:web:647d5e174ca4d95172c2d5",
  measurementId: "G-9P4ZPY2V4D"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);