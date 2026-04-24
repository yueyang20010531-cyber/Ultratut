import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"
import { getFunctions } from "firebase/functions"

const firebaseConfig = {
  apiKey: "AIzaSyD_UzmUSl3Zgjh60PK4ppZDbKTG8vHvhcY",
  authDomain: "kmllk-7f416.firebaseapp.com",
  databaseURL: "https://kmllk-7f416-default-rtdb.firebaseio.com",
  projectId: "kmllk-7f416",
  storageBucket: "kmllk-7f416.firebasestorage.app",
  messagingSenderId: "392060493568",
  appId: "1:392060493568:web:6895feb0ac687c07065de5",
  measurementId: "G-FQ8VCE0775"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export const functions = getFunctions(app)

export default app
