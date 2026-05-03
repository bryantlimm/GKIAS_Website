// retreatkeluarga2026/myregistration/page.tsx
"use client";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import type { RetreatRegistration } from "@/lib/retreat-types";
import { LABEL_TIPE_KAMAR } from "@/lib/retreat-types";

const STATUS_STEPS = ["registered", "approved", "checked_in"] as const;
const STATUS_LABELS: Record<string, string> = {
  registered: "Terdaftar",
  approved: "Disetujui",
  checked_in: "Check In",
};
// debug
export default function MyRegistrationPage() {
  const router = useRouter();

  // Lookup form state
  const [namaInput, setNamaInput] = useState("");
  const [telponInput, setTelponInput] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [loading, setLoading] = useState(false);

  // Result state
  const [registration, setRegistration] = useState<RetreatRegistration | null>(null);

  async function handleLookup() {
    const nama = namaInput.trim();
    const telpon = telponInput.trim();

    if (!nama || !telpon) {
        setLookupError("Harap isi nama lengkap dan nomor telepon.");
        return;
    }

    setLoading(true);
    setLookupError("");

    try {
        const q = query(
        collection(db, "retreat2026_registrations"),
        where("mainNama", "==", nama)
        );
        const snap = await getDocs(q);

        // Filter by phone on the client side
        const match = snap.docs.find(
        (d) => d.data().mainTelpon === telpon
        );

        if (!match) {
        setLookupError("Data tidak ditemukan. Pastikan nama dan nomor telepon sesuai.");
        setRegistration(null);
        } else {
        setRegistration({ id: match.id, ...match.data() } as RetreatRegistration);
        }
    } catch (e) {
        console.error(e);
        setLookupError("Terjadi kesalahan. Coba lagi.");
    } finally {
        setLoading(false);
    }
    }

  function handleReset() {
    setRegistration(null);
    setNamaInput("");
    setTelponInput("");
    setLookupError("");
  }

  // ── Lookup form ────────────────────────────────────────────────────────────
  if (!registration) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm space-y-5">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-gray-800">Cek Pendaftaran</h2>
            <p className="text-sm text-gray-500">
              Masukkan nama lengkap dan nomor telepon pendaftar utama.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-500 uppercase tracking-wide mb-1.5">
                Nama Lengkap Pendaftar Utama
              </label>
              <input
                type="text"
                placeholder="Nama sesuai saat pendaftaran"
                value={namaInput}
                onChange={(e) => setNamaInput(e.target.value)}
                className="w-full border border-gray-200 text-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Nomor Telepon
              </label>
              <input
                type="tel"
                placeholder="Nomor sesuai saat pendaftaran"
                value={telponInput}
                onChange={(e) => setTelponInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                className="w-full border border-gray-200 text-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
              />
            </div>
          </div>

          {lookupError && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
              {lookupError}
            </div>
          )}

          <button
            onClick={handleLookup}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 active:scale-[0.98] transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Mencari..." : "Cek Status →"}
          </button>

          <button
            onClick={() => router.push("/retreatkeluarga2026/registration")}
            className="w-full text-sm text-gray-400 hover:text-gray-600 hover:underline transition"
          >
            Belum daftar? Daftar di sini →
          </button>
        </div>
      </div>
    );
  }

  // ── Registration dashboard ─────────────────────────────────────────────────
  const currentStatusIdx = STATUS_STEPS.indexOf(
    registration.status as (typeof STATUS_STEPS)[number]
  );

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex justify-between items-center mt-10">
          <h1 className="text-2xl font-bold text-gray-800">Pendaftaran Saya</h1>
          <button
            onClick={handleReset}
            className="text-sm text-gray-400 hover:text-gray-600 hover:underline transition"
          >
            ← Cari lain
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
                  <p className={`text-xs mt-1 text-center ${i <= currentStatusIdx ? "text-green-600 font-semibold" : "text-gray-400"}`}>
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

        {/* Pending notice */}
        {registration.status === "registered" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-700">
            Pendaftaran Anda sedang menunggu persetujuan admin. QR code akan muncul setelah disetujui.
          </div>
        )}

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

        {/* Summary */}
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-2">
          <p className="text-sm font-semibold text-gray-500 mb-3">Ringkasan</p>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Total Pembayaran</span>
            <span className="font-bold text-gray-800">
              Rp {registration.totalAmount.toLocaleString("id-ID")},-
            </span>
          </div>
          {registration.sponsorCount > 0 && (
            <div className="flex justify-between text-sm text-amber-600">
              <span>Sponsorship</span>
              <span className="font-semibold">{registration.sponsorCount} orang</span>
            </div>
          )}
        </div>

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
                <span>Tipe kamar: {LABEL_TIPE_KAMAR[m.tipeKamar]}</span>
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