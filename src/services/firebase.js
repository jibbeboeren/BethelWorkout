import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'

// TODO: replace with your project's config
// Firebase console > Project settings > General > Your apps > SDK setup and config
const firebaseConfig = {
  apiKey: "AIzaSyBYi1nMh6DKoc6HLMK4vItJCL8KGfrfZIs",
  authDomain: "bethelworkoutapp.firebaseapp.com",
  projectId: "bethelworkoutapp",
  storageBucket: "bethelworkoutapp.firebasestorage.app",
  messagingSenderId: "1046503768148",
  appId: "1:1046503768148:web:d96fa567d3ec5171e4edc1"
};

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const functions = getFunctions(app)
