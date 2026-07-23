console.log("firebase.ts initializing, apps count:", getApps().length);
import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";
import { collection, doc, getDoc, setDoc, addDoc, updateDoc,
  getDocs, query, orderBy, serverTimestamp, where,deleteDoc } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendPasswordResetEmail, signOut } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type { RetreatConfig, RetreatRegistration } from "./retreat-types";

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

// ── Retreat Config ─────────────────────────────────────────────────────────────
export async function getRetreatConfig(): Promise<RetreatConfig | null> {
  const snap = await getDoc(doc(db, "retreat2026", "config"));
  return snap.exists() ? (snap.data() as RetreatConfig) : null;
}

export async function updateRetreatConfig(data: Partial<RetreatConfig>) {
  await setDoc(doc(db, "retreat2026", "config"), data, { merge: true });
}

// ── Registrations ──────────────────────────────────────────────────────────────
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
  try {
    const q = query(
      collection(db, "retreat2026_registrations"),
      where("uid", "==", uid)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as RetreatRegistration;
  } catch (error) {
    console.error("Error fetching registration:", error);
    return null;
  }
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

export async function updateMemberInfo(
  id: string,
  memberIndex: number,
  memberData: Partial<RetreatRegistration["members"][0]>,
  members: RetreatRegistration["members"]
) {
  const updated = [...members];
  updated[memberIndex] = { ...updated[memberIndex], ...memberData };
  await updateDoc(doc(db, "retreat2026_registrations", id), { members: updated });
}

export async function deleteRegistrationMember(
  id: string,
  memberIndex: number,
  members: RetreatRegistration["members"]
) {
  const updatedMembers = members.filter((_, index) => index !== memberIndex);

  if (updatedMembers.length === 0) {
    await deleteDoc(doc(db, "retreat2026_registrations", id));
    return { deleted: true };
  }

  const remainingMain = updatedMembers[0];
  await updateDoc(doc(db, "retreat2026_registrations", id), {
    members: updatedMembers,
    mainNama: remainingMain?.namaLengkap || "",
    mainTelpon: remainingMain?.nomorTelpon || "",
  });

  return { deleted: false };
}

export async function deleteRegistration(id: string) {
  await deleteDoc(doc(db, "retreat2026_registrations", id));
}

// ── Storage ────────────────────────────────────────────────────────────────────
export async function uploadPaymentProof(registrationId: string, file: File): Promise<string> {
  const storageRef = ref(storage, `retreat2026/payments/${registrationId}/proof`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function uploadRetreatImage(type: "poster" | "banner", file: File): Promise<string> {
  const storageRef = ref(storage, `retreat2026/posters/${type}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function mergeRegistrations(
  mainId: string,
  secondaryId: string,
  mainReg: RetreatRegistration,
  secondaryReg: RetreatRegistration,
) {
  // Combine: main's members first, then secondary's members
  const mergedMembers = [...mainReg.members, ...secondaryReg.members];
 
  // Write merged members onto the main registration
  await updateDoc(doc(db, "retreat2026_registrations", mainId), {
    members: mergedMembers,
  });
 
  // Delete the secondary registration
  await deleteDoc(doc(db, "retreat2026_registrations", secondaryId));
}

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