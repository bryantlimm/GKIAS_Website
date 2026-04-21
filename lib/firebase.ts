// Import the functions
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, doc, getDoc, setDoc, addDoc, updateDoc, getDocs, query, orderBy, serverTimestamp, where } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, signOut } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type { RetreatConfig, RetreatRegistration } from "./retreat-types";

// 2. Your web app's Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 3. Initialize Firebase
// Check if an app is already initialized to prevent errors during Next.js server rendering.
// const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

// ── Config — points to retreat2026/config (already exists in your Firestore)
export async function getRetreatConfig(): Promise<RetreatConfig | null> {
  const snap = await getDoc(doc(db, "retreat2026", "config"));
  return snap.exists() ? (snap.data() as RetreatConfig) : null;
}

export async function updateRetreatConfig(data: Partial<RetreatConfig>) {
  await setDoc(doc(db, "retreat2026", "config"), data, { merge: true });
}

// ── Registrations — flat collection, no nesting
export async function createRegistration(
  registration: Omit<RetreatRegistration, "id" | "createdAt">
) {
  const colRef = collection(db, "retreat2026_registrations");
  const docRef = await addDoc(colRef, {
    ...registration,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getRegistrationByUid(uid: string): Promise<RetreatRegistration | null> {
  const q = query(
    collection(db, "retreat2026_registrations"),
    where("uid", "==", uid)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as RetreatRegistration;
}

export async function getAllRegistrations(): Promise<RetreatRegistration[]> {
  const q = query(
    collection(db, "retreat2026_registrations"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as RetreatRegistration));
}

export async function updateRegistrationStatus(
  id: string,
  status: "registered" | "approved" | "checked_in"
) {
  await updateDoc(doc(db, "retreat2026_registrations", id), { status });
}

export async function updateMemberRoom(
  id: string,
  memberIndex: number,
  kamar: string,
  members: RetreatRegistration["members"]
) {
  const updated = [...members];
  updated[memberIndex] = { ...updated[memberIndex], kamar };
  await updateDoc(doc(db, "retreat2026_registrations", id), { members: updated });
}

// ── Storage retreat
export async function uploadPaymentProof(
  registrationId: string,
  file: File
): Promise<string> {
  const storageRef = ref(
    storage,
    `retreat2026/payments/${registrationId}/proof`
  );
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function uploadRetreatImage(
  type: "poster" | "banner",
  file: File
): Promise<string> {
  const storageRef = ref(storage, `retreat2026/posters/${type}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

// ── Auth helpers retreat
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

// 4. Export the services you will use
// export const db = getFirestore(app);
// export const auth = getAuth(app);
// export const storage = getStorage(app);
export { db, storage, auth };