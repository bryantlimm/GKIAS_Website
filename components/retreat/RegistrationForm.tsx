"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import {
  registerRetreatUser,
  createRegistration,
  uploadPaymentProof,
} from "@/lib/firebase";
import {
  HARGA_JEMAAT,
  HARGA_NON_JEMAAT,
  LABEL_TIPE_KAMAR,
  type RetreatMember,
  type TipeKamar,
  type KaosSize,
  type Transportasi,
} from "@/lib/retreat-types";

const emptyMember = (isMain = false): RetreatMember => ({
  namaLengkap: "",
  nomorTelpon: "",
  umur: 0,
  alamatRumah: "",
  ukuranKaos: "M",
  transportasi: "bus",
  jemaat: true,
  tipeKamar: "isi4",
  hargaKamar: HARGA_JEMAAT["isi4"],
  relasi: "",
  kamar: "",
  isMain,
});

function formatRupiah(n: number) {
  return "Rp " + n.toLocaleString("id-ID") + ",-";
}

function calcTotal(members: RetreatMember[]) {
  return members.reduce((sum, m) => sum + m.hargaKamar, 0);
}

const STEPS = ["auth", "member", "payment", "done"] as const;
const STEP_LABELS = ["Akun", "Data Diri", "Pembayaran"];

export default function RegistrationForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [members, setMembers] = useState<RetreatMember[]>([emptyMember(true)]);
  const [currentMemberIdx, setCurrentMemberIdx] = useState(0);

  const [step, setStep] = useState<"auth" | "member" | "payment" | "done">("auth");
  const [addingMore, setAddingMore] = useState(false);

  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  function updateMember(field: keyof RetreatMember, value: unknown) {
    setMembers((prev) => {
      const updated = [...prev];
      const member = { ...updated[currentMemberIdx], [field]: value };
      if (field === "jemaat" || field === "tipeKamar") {
        const jemaat = field === "jemaat" ? (value as boolean) : member.jemaat;
        const tipe = field === "tipeKamar" ? (value as TipeKamar) : member.tipeKamar;
        member.hargaKamar = jemaat ? HARGA_JEMAAT[tipe] : HARGA_NON_JEMAAT[tipe];
      }
      updated[currentMemberIdx] = member;
      return updated;
    });
  }

  async function handleAuth() {
    setAuthError("");
    if (password !== confirmPassword) { setAuthError("Password tidak cocok."); return; }
    if (password.length < 6) { setAuthError("Password minimal 6 karakter."); return; }
    try {
      await registerRetreatUser(email, password);
      setStep("member");
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err.code === "auth/email-already-in-use") {
        setAuthError("Email sudah terdaftar. Gunakan 'Pendaftaran Saya' untuk masuk.");
      } else {
        setAuthError("Gagal membuat akun. Coba lagi.");
      }
    }
  }

  function handleMemberDone() {
    const m = members[currentMemberIdx];
    if (!m.namaLengkap || !m.nomorTelpon || !m.umur || !m.alamatRumah) {
      setError("Harap lengkapi semua field.");
      return;
    }
    setError("");
    setAddingMore(true);
  }

  function handleAddMore() {
    setMembers((prev) => [...prev, emptyMember(false)]);
    setCurrentMemberIdx(members.length);
    setAddingMore(false);
  }

  function handleNoMore() {
    setAddingMore(false);
    setStep("payment");
  }

  async function handleSubmit() {
    if (!paymentFile) { setError("Harap upload bukti pembayaran."); return; }
    setUploading(true);
    setError("");
    try {
      const { auth } = await import("@/lib/firebase");
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");
      const tempId = `${user.uid}_${Date.now()}`;
      const paymentUrl = await uploadPaymentProof(tempId, paymentFile);
      const qrDataUrl = await QRCode.toDataURL(tempId, { width: 300 });
      await createRegistration({
        uid: user.uid,
        email: user.email!,
        status: "registered",
        qrCode: qrDataUrl,
        paymentProofUrl: paymentUrl,
        totalAmount: calcTotal(members),
        members,
      });
      setStep("done");
    } catch (e) {
      console.error(e);
      setError("Gagal menyimpan pendaftaran. Coba lagi.");
    } finally {
      setUploading(false);
    }
  }

  const stepIndex = STEPS.indexOf(step);

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4">
      <div className="max-w-xl mx-auto">

        {/* Progress bar */}
        {step !== "done" && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              {STEP_LABELS.map((label, i) => {
                const active = i === stepIndex;
                const done = i < stepIndex;
                return (
                  <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                      ${done ? "bg-green-500 text-white" : active ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-400"}`}>
                      {done ? "✓" : i + 1}
                    </div>
                    <span className={`text-xs font-medium ${active ? "text-blue-600" : done ? "text-green-600" : "text-gray-400"}`}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
            {/* Progress line */}
            <div className="relative h-1 bg-gray-200 rounded-full mx-4">
              <div
                className="absolute h-1 bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${(stepIndex / (STEP_LABELS.length - 1)) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8">

          {/* ── STEP: AUTH ── */}
          {step === "auth" && (
            <div className="space-y-4">
              <div className="space-y-1 mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Buat Akun</h2>
                <p className="text-sm text-gray-500">Akun ini digunakan untuk melihat status pendaftaran Anda.</p>
              </div>
              <div className="space-y-3">
                <input type="email" placeholder="Email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition" />
                <input type="password" placeholder="Password (min. 6 karakter)" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition" />
                <input type="password" placeholder="Konfirmasi Password" value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAuth()}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition" />
              </div>
              {authError && <p className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-lg">{authError}</p>}
              <button onClick={handleAuth}
                className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 active:scale-[0.98] transition text-sm">
                Lanjut →
              </button>
            </div>
          )}

          {/* ── STEP: MEMBER FORM ── */}
          {step === "member" && !addingMore && (
            <div className="space-y-5">
              <div className="space-y-1 mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  {currentMemberIdx === 0 ? "Data Pendaftar Utama" : `Peserta ${currentMemberIdx + 1}`}
                </h2>
                {members.length > 1 && (
                  <p className="text-sm text-gray-400">{members.length} peserta terdaftar</p>
                )}
              </div>

              {currentMemberIdx > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Relasi dengan Pendaftar Utama
                  </label>
                  <input type="text" placeholder="Contoh: Istri, Anak, dll."
                    value={members[currentMemberIdx].relasi}
                    onChange={(e) => updateMember("relasi", e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition" />
                </div>
              )}

              <MemberFields member={members[currentMemberIdx]} onChange={updateMember} />

              {error && <p className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-lg">{error}</p>}
              <button onClick={handleMemberDone}
                className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 active:scale-[0.98] transition text-sm">
                Simpan Data →
              </button>
            </div>
          )}

          {/* ── ADD MORE PROMPT ── */}
          {step === "member" && addingMore && (
            <div className="text-center space-y-6 py-4">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Tambah Peserta Lain?</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Total sementara: <strong className="text-gray-800">{formatRupiah(calcTotal(members))}</strong>
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={handleAddMore}
                  className="flex-1 border-2 border-blue-600 text-blue-600 py-3.5 rounded-xl font-semibold hover:bg-blue-50 active:scale-[0.98] transition text-sm">
                  + Tambah Peserta
                </button>
                <button onClick={handleNoMore}
                  className="flex-1 bg-blue-600 text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 active:scale-[0.98] transition text-sm">
                  Lanjut ke Pembayaran →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: PAYMENT ── */}
          {step === "payment" && (
            <div className="space-y-5">
              <div className="space-y-1 mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Pembayaran</h2>
                <p className="text-sm text-gray-500">Selesaikan pembayaran dan upload buktinya.</p>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Rincian Biaya</p>
                {members.map((m, i) => (
                  <div key={i} className="flex justify-between text-sm text-gray-600">
                    <span>{m.namaLengkap || `Peserta ${i + 1}`} <span className="text-gray-400">({LABEL_TIPE_KAMAR[m.tipeKamar]})</span></span>
                    <span className="font-medium text-gray-800">{formatRupiah(m.hargaKamar)}</span>
                  </div>
                ))}
                <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-bold text-sm">
                  <span>Total</span>
                  <span className="text-blue-600 text-base">{formatRupiah(calcTotal(members))}</span>
                </div>
              </div>

              {/* Bank info */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm space-y-1">
                <p className="font-semibold text-blue-800 flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
                  </svg>
                  Transfer ke:
                </p>
                <p className="text-blue-700">Bank BCA — 1234567890</p>
                <p className="text-blue-700">a.n. GKIA Alam Sutera</p>
              </div>

              {/* Upload */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Upload Bukti Pembayaran
                </label>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={paymentFile ? "#3b82f6" : "#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
                    <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>
                  </svg>
                  <p className={`text-sm mt-2 font-medium ${paymentFile ? "text-blue-600" : "text-gray-400"}`}>
                    {paymentFile ? paymentFile.name : "Pilih foto atau PDF"}
                  </p>
                  <input type="file" accept="image/*,application/pdf" className="hidden"
                    onChange={(e) => setPaymentFile(e.target.files?.[0] || null)} />
                </label>
              </div>

              {error && <p className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-lg">{error}</p>}
              <button onClick={handleSubmit} disabled={uploading}
                className="w-full bg-green-600 text-white py-3.5 rounded-xl font-semibold hover:bg-green-700 active:scale-[0.98] transition text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                {uploading ? "Menyimpan..." : "Submit Pendaftaran ✓"}
              </button>
            </div>
          )}

          {/* ── STEP: DONE ── */}
          {step === "done" && (
            <div className="text-center space-y-6 py-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Pendaftaran Berhasil!</h2>
                <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                  Pendaftaran Anda telah diterima. QR code akan tersedia setelah admin menyetujui pendaftaran Anda.
                </p>
              </div>
              <button onClick={() => router.push("/retreatkeluarga2026/myregistration")}
                className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 active:scale-[0.98] transition text-sm">
                Lihat Pendaftaran Saya →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── MemberFields ───────────────────────────────────────────────────────────────
function MemberFields({
  member,
  onChange,
}: {
  member: RetreatMember;
  onChange: (field: keyof RetreatMember, value: unknown) => void;
}) {
  const kamarOptions: { value: TipeKamar; label: string; harga: number }[] = member.jemaat
    ? [
        { value: "isi4", label: "Kamar isi 4", harga: HARGA_JEMAAT.isi4 },
        { value: "isi3", label: "Kamar isi 3", harga: HARGA_JEMAAT.isi3 },
        { value: "isi2", label: "Kamar isi 2", harga: HARGA_JEMAAT.isi2 },
      ]
    : [
        { value: "isi4", label: "Kamar isi 4", harga: HARGA_NON_JEMAAT.isi4 },
        { value: "isi3", label: "Kamar isi 3", harga: HARGA_NON_JEMAAT.isi3 },
        { value: "isi2", label: "Kamar isi 2", harga: HARGA_NON_JEMAAT.isi2 },
      ];

  const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition";
  const labelClass = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2";

  return (
    <div className="space-y-4">
      <input type="text" placeholder="Nama Lengkap" value={member.namaLengkap}
        onChange={(e) => onChange("namaLengkap", e.target.value)} className={inputClass} />
      <input type="tel" placeholder="Nomor Telepon" value={member.nomorTelpon}
        onChange={(e) => onChange("nomorTelpon", e.target.value)} className={inputClass} />
      <input type="number" placeholder="Umur" value={member.umur || ""}
        onChange={(e) => onChange("umur", parseInt(e.target.value) || 0)} className={inputClass} />
      <textarea placeholder="Alamat Rumah" value={member.alamatRumah}
        onChange={(e) => onChange("alamatRumah", e.target.value)}
        rows={2} className={`${inputClass} resize-none`} />

      {/* Kaos */}
      <div>
        <label className={labelClass}>Ukuran Kaos</label>
        <div className="flex gap-2 flex-wrap">
          {(["S", "M", "L", "XL", "XXL"] as KaosSize[]).map((s) => (
            <button key={s} type="button" onClick={() => onChange("ukuranKaos", s)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition active:scale-95
                ${member.ukuranKaos === s ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 text-gray-600 hover:border-blue-300"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Transportasi */}
      <div>
        <label className={labelClass}>Transportasi</label>
        <div className="flex gap-3">
          {(["bus", "mobil_sendiri"] as Transportasi[]).map((t) => (
            <button key={t} type="button" onClick={() => onChange("transportasi", t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition active:scale-95
                ${member.transportasi === t ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 text-gray-600 hover:border-blue-300"}`}>
              {t === "bus" ? "Ikut Bus" : "Mobil Sendiri"}
            </button>
          ))}
        </div>
      </div>

      {/* Jemaat */}
      <div>
        <label className={labelClass}>Status Jemaat</label>
        <div className="flex gap-3">
          {[{ v: true, l: "Jemaat / Simpatisan" }, { v: false, l: "Non Jemaat" }].map(({ v, l }) => (
            <button key={String(v)} type="button" onClick={() => onChange("jemaat", v)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition active:scale-95
                ${member.jemaat === v ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 text-gray-600 hover:border-blue-300"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Tipe Kamar */}
      <div>
        <label className={labelClass}>Tipe Kamar</label>
        <div className="space-y-2">
          {kamarOptions.map((opt) => (
            <button key={opt.value} type="button" onClick={() => onChange("tipeKamar", opt.value)}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition active:scale-[0.98]
                ${member.tipeKamar === opt.value ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-blue-300"}`}>
              <span className={`text-sm font-semibold ${member.tipeKamar === opt.value ? "text-blue-700" : "text-gray-700"}`}>
                {opt.label}
              </span>
              <span className={`text-sm font-bold ${member.tipeKamar === opt.value ? "text-blue-600" : "text-gray-500"}`}>
                Rp {opt.harga.toLocaleString("id-ID")},-/orang
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}