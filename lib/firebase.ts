console.log("firebase.ts initializing, apps count:", getApps().length);
import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";
import { collection, doc, getDoc, setDoc, addDoc, updateDoc,
  getDocs, query, orderBy, serverTimestamp, where,deleteDoc } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendPasswordResetEmail, signOut } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// ── Initialize Firestore ONCE ──────────────────────────────────────────────────
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
export const auth = getAuth(app);
export const storage = getStorage(app);


// ── Auth ───────────────────────────────────────────────────────────────────────
export async function registerRetreatUser(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function signInRetreatUser(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function sendRetreatPasswordReset(email: string) {
  return sendPasswordResetEmail(auth, email);
}

export async function signOutUser() {
  return signOut(auth);
}

export async function updatePaymentProof(regId: string, url: string) {
  const ref = doc(db, "retreat2026_registrations", regId);
  await updateDoc(ref, { paymentProofUrl: url, paymentProofUploaded: true });
}