"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  signInRetreatUser,
  sendRetreatPasswordReset,
  signOutUser,
  getRegistrationByUid,
} from "@/lib/firebase";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import type { RetreatRegistration } from "@/lib/retreat-types";

const STATUS_STEPS = ["registered", "approved", "checked_in"] as const;
const STATUS_LABELS: Record<string, string> = {
  registered: "Terdaftar",
  approved: "Disetujui",
  checked_in: "Check In",
};

export default function MyRegistrationPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ uid: string; email: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [registration, setRegistration] = useState<RetreatRegistration | null>(null);

  // Sign-in state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signInError, setSignInError] = useState("");
  const [resetSent, setResetSent] = useState(false);

  // Auth state listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser({ uid: u.uid, email: u.email });
        const reg = await getRegistrationByUid(u.uid);
        setRegistration(reg);
      } else {
        setUser(null);
        setRegistration(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function handleSignIn() {
    setSignInError("");
    try {
      await signInRetreatUser(email, password);
    } catch {
      setSignInError("Email atau password salah.");
    }
  }

  async function handleForgotPassword() {
    if (!email) {
      setSignInError("Masukkan email Anda dulu.");
      return;
    }
    await sendRetreatPasswordReset(email);
    setResetSent(true);
  }

  async function handleSignOut() {
    await signOutUser();
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Memuat...</p>
    </div>
  );

  // ── Sign-in gate ───────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm space-y-4">
          <h2 className="text-2xl font-bold text-gray-800">Masuk</h2>
          <p className="text-sm text-gray-500">
            Gunakan email dan password yang didaftarkan saat mendaftar.
          </p>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-lg px-4 py-2"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
            className="w-full border rounded-lg px-4 py-2"
          />
          {signInError && <p className="text-red-500 text-sm">{signInError}</p>}
          {resetSent && (
            <p className="text-green-600 text-sm">
              Email reset password sudah dikirim. Cek inbox Anda.
            </p>
          )}
          <button
            onClick={handleSignIn}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
          >
            Masuk
          </button>
          <button
            onClick={handleForgotPassword}
            className="w-full text-sm text-blue-600 hover:underline"
          >
            Lupa Password?
          </button>
          <button
            onClick={() => router.push("/retreatkeluarga2026/registration")}
            className="w-full text-sm text-gray-500 hover:underline"
          >
            Belum punya akun? Daftar di sini →
          </button>
        </div>
      </div>
    );
  }

  // ── No registration found ──────────────────────────────────────────────────
  if (!registration) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-gray-600">Tidak ditemukan pendaftaran untuk akun ini.</p>
          <button
            onClick={() => router.push("/retreatkeluarga2026/registration")}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold"
          >
            Daftar Sekarang
          </button>
          <button onClick={handleSignOut} className="block text-sm text-gray-400 hover:underline mx-auto">
            Keluar
          </button>
        </div>
      </div>
    );
  }

  // ── Registration dashboard ─────────────────────────────────────────────────
  const currentStatusIdx = STATUS_STEPS.indexOf(registration.status as typeof STATUS_STEPS[number]);

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex justify-between items-center mt-10">
          <h1 className="text-2xl font-bold text-gray-800">Pendaftaran Saya</h1>
          <button onClick={handleSignOut} className="text-sm text-gray-400 hover:underline">
            Keluar
          </button>
        </div>

        {/* Status timeline */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <p className="text-sm font-semibold text-gray-500 mb-4">Status Pendaftaran</p>
          <div className="flex items-center">
            {STATUS_STEPS.map((s, i) => (
              <div key={s} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                      ${i <= currentStatusIdx ? "bg-green-500 text-white" : "bg-gray-200 text-gray-400"}`}
                  >
                    {i <= currentStatusIdx ? "✓" : i + 1}
                  </div>
                  <p className={`text-xs mt-1 ${i <= currentStatusIdx ? "text-green-600 font-semibold" : "text-gray-400"}`}>
                    {STATUS_LABELS[s]}
                  </p>
                </div>
                {i < STATUS_STEPS.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 rounded ${i < currentStatusIdx ? "bg-green-400" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* QR Code — shown only when approved or checked in */}
        {(registration.status === "approved" || registration.status === "checked_in") && (
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center space-y-3">
            <p className="text-sm font-semibold text-gray-500">QR Code Check-in</p>
            <Image
              src={registration.qrCode}
              alt="QR Code"
              width={200}
              height={200}
              className="mx-auto"
            />
            <p className="text-xs text-gray-400">Tunjukkan QR ini saat check-in</p>
          </div>
        )}

        {registration.status === "registered" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-700">
            Pendaftaran Anda sedang menunggu persetujuan admin. QR code akan muncul setelah disetujui.
          </div>
        )}

        {/* Members list */}
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <p className="text-sm font-semibold text-gray-500">Detail Peserta</p>
          {registration.members.map((m, i) => (
            <div key={i} className="border-b last:border-0 pb-4 last:pb-0">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-gray-800">{m.namaLengkap}</p>
                  {m.relasi && (
                    <p className="text-xs text-gray-400">{m.relasi}</p>
                  )}
                </div>
                {m.kamar ? (
                  <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 rounded-full">
                    Kamar {m.kamar}
                  </span>
                ) : (
                  <span className="bg-gray-100 text-gray-400 text-xs px-2 py-1 rounded-full">
                    Kamar: N/A
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1 mt-2 text-xs text-gray-500">
                <span>Ukuran kaos: {m.ukuranKaos}</span>
                <span>Transportasi: {m.transportasi === "bus" ? "Bus" : "Mobil Sendiri"}</span>
                <span>Tipe kamar: {m.tipeKamar}</span>
                <span>Umur: {m.umur}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Back link */}
        <button
          onClick={() => router.push("/retreatkeluarga2026")}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Kembali ke halaman retreat
        </button>
      </div>
    </div>
  );
}