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

// ── Empty member template ────────────────────────────────────────────────────
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

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatRupiah(n: number) {
  return "Rp " + n.toLocaleString("id-ID") + ",-";
}

function calcTotal(members: RetreatMember[]) {
  return members.reduce((sum, m) => sum + m.hargaKamar, 0);
}

// ── Component ────────────────────────────────────────────────────────────────
export default function RegistrationForm() {
  const router = useRouter();

  // Auth step
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authError, setAuthError] = useState("");

  // Members
  const [members, setMembers] = useState<RetreatMember[]>([emptyMember(true)]);
  const [currentMemberIdx, setCurrentMemberIdx] = useState(0);

  // Flow control
  const [step, setStep] = useState<"auth" | "member" | "payment" | "done">("auth");
  const [addingMore, setAddingMore] = useState(false);

  // Payment
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  // ── Update current member field ──────────────────────────────────────────
  function updateMember(field: keyof RetreatMember, value: unknown) {
    setMembers((prev) => {
      const updated = [...prev];
      const member = { ...updated[currentMemberIdx], [field]: value };

      // Recalculate price when jemaat or tipeKamar changes
      if (field === "jemaat" || field === "tipeKamar") {
        const jemaat = field === "jemaat" ? (value as boolean) : member.jemaat;
        const tipe = field === "tipeKamar" ? (value as TipeKamar) : member.tipeKamar;
        member.hargaKamar = jemaat ? HARGA_JEMAAT[tipe] : HARGA_NON_JEMAAT[tipe];
      }
      updated[currentMemberIdx] = member;
      return updated;
    });
  }

  // ── Step: Auth ───────────────────────────────────────────────────────────
  async function handleAuth() {
    setAuthError("");
    if (password !== confirmPassword) {
      setAuthError("Password tidak cocok.");
      return;
    }
    if (password.length < 6) {
      setAuthError("Password minimal 6 karakter.");
      return;
    }
    try {
      await registerRetreatUser(email, password);
      setStep("member");
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err.code === "auth/email-already-in-use") {
        setAuthError("Email sudah terdaftar. Gunakan 'My Registration' untuk masuk.");
      } else {
        setAuthError("Gagal membuat akun. Coba lagi.");
      }
    }
  }

  // ── Step: Member detail → decide add more or pay ─────────────────────────
  function handleMemberDone() {
    // Validate current member
    const m = members[currentMemberIdx];
    if (!m.namaLengkap || !m.nomorTelpon || !m.umur || !m.alamatRumah) {
      setError("Harap lengkapi semua field.");
      return;
    }
    setError("");
    setAddingMore(true); // show "add more?" prompt
  }

  function handleAddMore() {
    setMembers((prev) => [...prev, emptyMember(false)]);
    setCurrentMemberIdx(members.length); // next index
    setAddingMore(false);
  }

  function handleNoMore() {
    setAddingMore(false);
    setStep("payment");
  }

  // ── Step: Payment ─────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!paymentFile) {
      setError("Harap upload bukti pembayaran.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const { auth } = await import("@/lib/firebase");
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      // Create placeholder registration to get ID
      const tempId = `${user.uid}_${Date.now()}`;
      const paymentUrl = await uploadPaymentProof(tempId, paymentFile);

      // Generate QR code (encode the registration ID)
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-md p-8">

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-8 text-sm text-gray-500">
          {["Akun", "Data Diri", "Pembayaran"].map((label, i) => (
            <span key={label} className="flex items-center gap-2">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center font-semibold text-xs
                  ${step === ["auth","member","payment"][i]
                    ? "bg-blue-600 text-white"
                    : i < ["auth","member","payment"].indexOf(step)
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-500"}`}
              >
                {i + 1}
              </span>
              <span>{label}</span>
              {i < 2 && <span className="text-gray-300">→</span>}
            </span>
          ))}
        </div>

        {/* ── STEP: AUTH ── */}
        {step === "auth" && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">Buat Akun</h2>
            <p className="text-sm text-gray-500">
              Akun ini digunakan untuk melihat status pendaftaran Anda.
            </p>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <input
              type="password"
              placeholder="Password (min. 6 karakter)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <input
              type="password"
              placeholder="Konfirmasi Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            {authError && (
              <p className="text-red-500 text-sm">{authError}</p>
            )}
            <button
              onClick={handleAuth}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
            >
              Lanjut →
            </button>
          </div>
        )}

        {/* ── STEP: MEMBER FORM ── */}
        {step === "member" && !addingMore && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800">
              {currentMemberIdx === 0 ? "Data Pendaftar Utama" : `Peserta ${currentMemberIdx + 1}`}
            </h2>
            {currentMemberIdx > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Relasi dengan Pendaftar Utama
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Istri, Anak, dll."
                  value={members[currentMemberIdx].relasi}
                  onChange={(e) => updateMember("relasi", e.target.value)}
                  className="w-full border rounded-lg px-4 py-2"
                />
              </div>
            )}

            <MemberFields
              member={members[currentMemberIdx]}
              onChange={updateMember}
            />

            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              onClick={handleMemberDone}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
            >
              Simpan Data →
            </button>
          </div>
        )}

        {/* ── ADD MORE PROMPT ── */}
        {step === "member" && addingMore && (
          <div className="text-center space-y-6">
            <h2 className="text-xl font-bold text-gray-800">
              Tambah Peserta Lain?
            </h2>
            <p className="text-sm text-gray-500">
              Total sementara: <strong>{formatRupiah(calcTotal(members))}</strong>
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleAddMore}
                className="flex-1 border-2 border-blue-600 text-blue-600 py-3 rounded-xl font-semibold hover:bg-blue-50 transition"
              >
                + Tambah Peserta
              </button>
              <button
                onClick={handleNoMore}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
              >
                Lanjut ke Pembayaran
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: PAYMENT ── */}
        {step === "payment" && (
          <div className="space-y-5">
            <h2 className="text-2xl font-bold text-gray-800">Pembayaran</h2>

            {/* Summary */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              {members.map((m, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{m.namaLengkap || `Peserta ${i + 1}`} ({LABEL_TIPE_KAMAR[m.tipeKamar]})</span>
                  <span>{formatRupiah(m.hargaKamar)}</span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>Total</span>
                <span className="text-blue-600">{formatRupiah(calcTotal(members))}</span>
              </div>
            </div>

            {/* Bank info — in real implementation, load from RetreatConfig */}
            <div className="bg-blue-50 rounded-xl p-4 text-sm space-y-1">
              <p className="font-semibold text-blue-800">Transfer ke:</p>
              <p>Bank BCA — 1234567890</p>
              <p>a.n. GKIA Alam Sutera</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Bukti Pembayaran
              </label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setPaymentFile(e.target.files?.[0] || null)}
                className="w-full"
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              onClick={handleSubmit}
              disabled={uploading}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition disabled:opacity-50"
            >
              {uploading ? "Menyimpan..." : "Submit Pendaftaran"}
            </button>
          </div>
        )}

        {/* ── STEP: DONE ── */}
        {step === "done" && (
          <div className="text-center space-y-6">
            <div className="text-5xl">🎉</div>
            <h2 className="text-2xl font-bold text-gray-800">Pendaftaran Berhasil!</h2>
            <p className="text-gray-600 text-sm">
              Pendaftaran Anda telah diterima. QR code akan tersedia setelah
              admin menyetujui pendaftaran Anda.
            </p>
            <button
              onClick={() => router.push("/retreatkeluarga2026/myregistration")}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
            >
              Lihat Pendaftaran Saya
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-component: Reusable member fields ─────────────────────────────────────
function MemberFields({
  member,
  onChange,
}: {
  member: RetreatMember;
  onChange: (field: keyof RetreatMember, value: unknown) => void;
}) {
  const kamarOptions: { value: TipeKamar; label: string; harga: number }[] =
    member.jemaat
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

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Nama Lengkap"
        value={member.namaLengkap}
        onChange={(e) => onChange("namaLengkap", e.target.value)}
        className="w-full border rounded-lg px-4 py-2"
      />
      <input
        type="tel"
        placeholder="Nomor Telepon"
        value={member.nomorTelpon}
        onChange={(e) => onChange("nomorTelpon", e.target.value)}
        className="w-full border rounded-lg px-4 py-2"
      />
      <input
        type="number"
        placeholder="Umur"
        value={member.umur || ""}
        onChange={(e) => onChange("umur", parseInt(e.target.value) || 0)}
        className="w-full border rounded-lg px-4 py-2"
      />
      <textarea
        placeholder="Alamat Rumah"
        value={member.alamatRumah}
        onChange={(e) => onChange("alamatRumah", e.target.value)}
        rows={2}
        className="w-full border rounded-lg px-4 py-2"
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Ukuran Kaos</label>
        <select
          value={member.ukuranKaos}
          onChange={(e) => onChange("ukuranKaos", e.target.value as KaosSize)}
          className="w-full border rounded-lg px-4 py-2"
        >
          {(["S", "M", "L", "XL", "XXL"] as KaosSize[]).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Transportasi</label>
        <div className="flex gap-4">
          {(["bus", "mobil_sendiri"] as Transportasi[]).map((t) => (
            <label key={t} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`transportasi_${member.namaLengkap}`}
                value={t}
                checked={member.transportasi === t}
                onChange={() => onChange("transportasi", t)}
              />
              {t === "bus" ? "Ikut Bus" : "Mobil Sendiri"}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Status Jemaat</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`jemaat_${member.namaLengkap}`}
              checked={member.jemaat}
              onChange={() => onChange("jemaat", true)}
            />
            Jemaat / Simpatisan
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`jemaat_${member.namaLengkap}`}
              checked={!member.jemaat}
              onChange={() => onChange("jemaat", false)}
            />
            Non Jemaat / Simpatisan
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Kamar</label>
        <div className="space-y-2">
          {kamarOptions.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition
                ${member.tipeKamar === opt.value
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-blue-300"}`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`kamar_${member.namaLengkap}`}
                  value={opt.value}
                  checked={member.tipeKamar === opt.value}
                  onChange={() => onChange("tipeKamar", opt.value)}
                />
                {opt.label}
              </div>
              <span className="text-sm font-semibold text-blue-600">
                Rp {opt.harga.toLocaleString("id-ID")},-/orang
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}