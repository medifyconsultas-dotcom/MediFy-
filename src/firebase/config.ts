import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: "AIzaSyC6w4Q2bzj9oV8YKuduoCeJjsmKiqNUH94",
  authDomain: "medify-401a8.firebaseapp.com",
  projectId: "medify-401a8",
  storageBucket: "medify-401a8.firebasestorage.app",
  messagingSenderId: "1020474309747",
  appId: "1:1020474309747:web:0dbc2ca2878cda10a2be06",
  measurementId: "G-D12PR6Y0EC"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase Auth
export const auth = getAuth(app)

// Initialize Firestore
export const db = getFirestore(app)

// Initialize Firebase Storage
export const storage = getStorage(app)

export default app

