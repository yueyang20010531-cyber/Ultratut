// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD_UzmUSl3Zgjh60PK4ppZDbKTG8vHvhcY",
  authDomain: "kmllk-7f416.firebaseapp.com",
  databaseURL: "https://kmllk-7f416-default-rtdb.firebaseio.com",
  projectId: "kmllk-7f416",
  storageBucket: "kmllk-7f416.firebasestorage.app",
  messagingSenderId: "392060493568",
  appId: "1:392060493568:web:6895feb0ac687c07065de5",
  measurementId: "G-FQ8VCE0775"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);