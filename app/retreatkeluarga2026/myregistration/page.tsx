// retreatkeluarga2026/myregistration/page.tsx
"use client";
import { useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { uploadPaymentProof, updatePaymentProof, updateMemberInfo } from "@/lib/firebase"; // add updatePaymentProof to your firebase lib
import type { RetreatRegistration, KaosSize } from "@/lib/retreat-types";
import { LABEL_TIPE_KAMAR } from "@/lib/retreat-types";

const STATUS_STEPS = ["registered", "approved", "checked_in"] as const;
const STATUS_LABELS: Record<string, string> = {
  registered: "Terdaftar",
  approved: "Disetujui",
  checked_in: "Check In",
};

export default function MyRegistrationPage() {
  const router = useRouter();

  // Lookup form state
  const [namaInput, setNamaInput] = useState("");
  const [telponInput, setTelponInput] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [loading, setLoading] = useState(false);

  // Result state
  const [registration, setRegistration] = useState<RetreatRegistration | null>(null);

  // Payment proof upload state
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofSuccess, setProofSuccess] = useState(false);
  const [proofError, setProofError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Member edit state - for individual field editing
  const [editingField, setEditingField] = useState<{
    memberIdx: number;
    fieldName: "ukuranKaos" | "transportasi";
  } | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [updatingField, setUpdatingField] = useState(false);
  const [fieldUpdateError, setFieldUpdateError] = useState("");

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
        where("mainTelpon", "==", telpon)
      );
      const snap = await getDocs(q);

      const match = snap.docs.find(
        (d) => d.data().mainNama?.trim().toLowerCase() === nama.toLowerCase()
      );

      if (!match) {
        setLookupError("Data tidak ditemukan. Pastikan nama dan nomor telepon sesuai.");
        setRegistration(null);
      } else {
        setRegistration({ id: match.id, ...match.data() } as RetreatRegistration);
        // Reset proof upload state on new lookup
        setProofFile(null);
        setProofPreview(null);
        setProofSuccess(false);
        setProofError("");
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
    setProofFile(null);
    setProofPreview(null);
    setProofSuccess(false);
    setProofError("");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFile(file);
    setProofSuccess(false);
    setProofError("");

    // Generate preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setProofPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setProofPreview(null); // PDF — no preview
    }
  }

  async function handleUploadProof() {
    if (!proofFile || !registration) return;
    setUploadingProof(true);
    setProofError("");
    setProofSuccess(false);

    try {
      const newUrl = await uploadPaymentProof(registration.id, proofFile);
      // Update Firestore record
      await updatePaymentProof(registration.id, newUrl);
      // Update local state
      setRegistration((prev) =>
        prev ? { ...prev, paymentProofUrl: newUrl, paymentProofUploaded: true } : prev
      );
      setProofFile(null);
      setProofPreview(null);
      setProofSuccess(true);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
      console.error(e);
      setProofError("Gagal mengupload bukti. Coba lagi.");
    } finally {
      setUploadingProof(false);
    }
  }

  function handleStartEditField(
    memberIdx: number,
    fieldName: "ukuranKaos" | "transportasi"
  ) {
    const member = registration?.members[memberIdx];
    if (!member) return;
    
    setEditingField({ memberIdx, fieldName });
    setEditingValue(
      fieldName === "ukuranKaos" ? member.ukuranKaos : member.transportasi
    );
    setFieldUpdateError("");
  }

  function handleCancelEditField() {
    setEditingField(null);
    setEditingValue("");
    setFieldUpdateError("");
  }

  async function handleSaveField() {
    if (!editingField || !registration) return;

    setUpdatingField(true);
    setFieldUpdateError("");

    try {
      const { memberIdx, fieldName } = editingField;
      const updateData =
        fieldName === "ukuranKaos"
          ? { ukuranKaos: editingValue as KaosSize }
          : { transportasi: editingValue as "bus" | "mobil_sendiri" };

      await updateMemberInfo(
        registration.id,
        memberIdx,
        updateData,
        registration.members
      );

      // Update local state
      setRegistration((prev) => {
        if (!prev) return prev;
        const updatedMembers = [...prev.members];
        updatedMembers[memberIdx] = {
          ...updatedMembers[memberIdx],
          ...(fieldName === "ukuranKaos"
            ? { ukuranKaos: editingValue as KaosSize }
            : { transportasi: editingValue as "bus" | "mobil_sendiri" }),
        };
        const totalAmount = updatedMembers.reduce(
          (sum, member) => sum + (member.hargaKamar ?? 0),
          0
        ) + prev.sponsorCount * 470000;
        return { ...prev, members: updatedMembers, totalAmount };
      });

      setEditingField(null);
      setEditingValue("");
    } catch (e) {
      console.error(e);
      setFieldUpdateError("Gagal menyimpan data. Coba lagi.");
    } finally {
      setUpdatingField(false);
    }
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
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
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

  // Show upload section when not yet checked in
  const canUploadProof = registration.status === "registered" || registration.status === "approved";
  const hasExistingProof = !!registration.paymentProofUrl;

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

        {/* ── PAYMENT PROOF UPLOAD / REPLACE ── */}
        {canUploadProof && (
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-500">Bukti Pembayaran</p>
              {hasExistingProof && (
                <span className="text-xs bg-green-100 text-green-700 font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Sudah diupload
                </span>
              )}
              {!hasExistingProof && (
                <span className="text-xs bg-red-100 text-red-600 font-semibold px-2.5 py-1 rounded-full">
                  Belum diupload
                </span>
              )}
            </div>

            {/* Show existing proof thumbnail */}
            {hasExistingProof && !proofPreview && (
              <div className="relative rounded-xl overflow-hidden border border-gray-100">
                <img
                  src={registration.paymentProofUrl}
                  alt="Bukti pembayaran"
                  className="w-full max-h-48 object-cover"
                  onError={(e) => {
                    // Fallback for PDFs or broken images
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent px-3 py-2">
                  <p className="text-white text-xs font-medium">Bukti pembayaran saat ini</p>
                </div>
              </div>
            )}

            {/* New file preview */}
            {proofPreview && (
              <div className="relative rounded-xl overflow-hidden border-2 border-blue-200">
                <img src={proofPreview} alt="Preview" className="w-full max-h-48 object-cover" />
                <div className="absolute top-2 right-2">
                  <button
                    onClick={() => {
                      setProofFile(null);
                      setProofPreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="w-7 h-7 bg-white rounded-full shadow flex items-center justify-center hover:bg-red-50 transition"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-900/50 to-transparent px-3 py-2">
                  <p className="text-white text-xs font-medium">{proofFile?.name}</p>
                </div>
              </div>
            )}

            {/* Non-image file indicator */}
            {proofFile && !proofPreview && (
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-blue-700 truncate">{proofFile.name}</p>
                  <p className="text-xs text-blue-500">{(proofFile.size / 1024).toFixed(0)} KB</p>
                </div>
                <button
                  onClick={() => {
                    setProofFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="text-blue-400 hover:text-red-500 transition"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            )}

            {/* File picker */}
            <label className={`flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed rounded-xl cursor-pointer transition text-sm font-semibold
              ${proofFile
                ? "border-blue-300 text-blue-600 bg-blue-50 hover:bg-blue-100"
                : "border-gray-300 text-gray-500 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
              }`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
                <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>
              </svg>
              {proofFile
                ? "Ganti file"
                : hasExistingProof
                  ? "Ganti bukti pembayaran"
                  : "Pilih foto atau PDF"
              }
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>

            {/* Success message */}
            {proofSuccess && (
              <div className="flex items-center gap-2.5 bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-sm text-green-700">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span className="font-medium">Bukti pembayaran berhasil diupload!</span>
              </div>
            )}

            {/* Error message */}
            {proofError && (
              <p className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-lg">{proofError}</p>
            )}

            {/* Upload button — only shown when a new file is selected */}
            {proofFile && (
              <button
                onClick={handleUploadProof}
                disabled={uploadingProof}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 active:scale-[0.98] transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingProof
                  ? "Mengupload..."
                  : hasExistingProof
                    ? "Simpan Bukti Baru ✓"
                    : "Upload Bukti Pembayaran ✓"
                }
              </button>
            )}

            {!hasExistingProof && !proofFile && (
              <p className="text-xs text-gray-400 text-center">
                Admin membutuhkan bukti transfer untuk menyetujui pendaftaran Anda.
              </p>
            )}
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
              {/* Header with name and room */}
              <div className="flex justify-between items-start mb-3">
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

              {/* Editable fields with inline edit */}
              <div className="space-y-2">
                {/* Ukuran Kaos field */}
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>Ukuran kaos: <strong className="text-gray-700">{m.ukuranKaos}</strong></span>
                  {editingField?.memberIdx === i && editingField.fieldName === "ukuranKaos" ? (
                    <div className="flex gap-1 items-center">
                      <select
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        autoFocus
                        className="border border-blue-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                      >
                        <option value="S">S</option>
                        <option value="M">M</option>
                        <option value="L">L</option>
                        <option value="XL">XL</option>
                        <option value="XXL">XXL</option>
                      </select>
                      <button
                        onClick={handleSaveField}
                        disabled={updatingField}
                        className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
                      >
                        ✓
                      </button>
                      <button
                        onClick={handleCancelEditField}
                        disabled={updatingField}
                        className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400 disabled:opacity-50"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleStartEditField(i, "ukuranKaos")}
                      className="text-blue-600 hover:text-blue-700 font-semibold text-xs transition"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {/* Transportasi field */}
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>Transportasi: <strong className="text-gray-700">{m.transportasi === "bus" ? "Bus" : "Mobil Sendiri"}</strong></span>
                  {editingField?.memberIdx === i && editingField.fieldName === "transportasi" ? (
                    <div className="flex gap-1 items-center">
                      <select
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        autoFocus
                        className="border border-blue-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                      >
                        <option value="bus">Bus</option>
                        <option value="mobil_sendiri">Mobil Sendiri</option>
                      </select>
                      <button
                        onClick={handleSaveField}
                        disabled={updatingField}
                        className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
                      >
                        ✓
                      </button>
                      <button
                        onClick={handleCancelEditField}
                        disabled={updatingField}
                        className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400 disabled:opacity-50"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleStartEditField(i, "transportasi")}
                      className="text-blue-600 hover:text-blue-700 font-semibold text-xs transition"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {/* Read-only fields */}
                <div className="text-xs text-gray-500">
                  <span>Tipe kamar: {LABEL_TIPE_KAMAR[m.tipeKamar]}</span>
                </div>
                <div className="text-xs text-gray-500">
                  <span>Umur: {m.umur}</span>
                </div>
              </div>

              {/* Error message */}
              {fieldUpdateError && editingField?.memberIdx === i && (
                <div className="mt-2 bg-red-50 border border-red-100 rounded px-2 py-1 text-xs text-red-600">
                  {fieldUpdateError}
                </div>
              )}
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