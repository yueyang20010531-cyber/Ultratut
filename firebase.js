import { initializeApp } from "firebase/app"

const firebaseConfig = {
  apiKey: process.env.AIzaSyD_UzmUSl3Zgjh60PK4ppZDbKTG8vHvhcY,
  authDomain: "",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "XXXX",
  appId: "XXXX"
}

const app = initializeApp(firebaseConfig)

export default app