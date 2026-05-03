// components/retreat/RegistrationForm.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import {
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

function calcTotal(members: RetreatMember[], sponsorCount: number) {
  const memberTotal = members.reduce((sum, m) => sum + m.hargaKamar, 0);
  const sponsorTotal = sponsorCount * HARGA_JEMAAT["isi4"];
  return memberTotal + sponsorTotal;
}

const STEP_LABELS = ["Data Diri", "Sponsorship", "Pembayaran"];

export default function RegistrationForm() {
  const router = useRouter();

  const [members, setMembers] = useState<RetreatMember[]>([emptyMember(true)]);
  const [currentMemberIdx, setCurrentMemberIdx] = useState(0);

  // Start directly at member step — no auth required
  const [step, setStep] = useState<"member" | "sponsor" | "payment" | "done">("member");
  const [addingMore, setAddingMore] = useState(false);

  // Sponsorship state
  const [wantsToSponsor, setWantsToSponsor] = useState<boolean | null>(null);
  const [sponsorCountInput, setSponsorCountInput] = useState("1");
  const [sponsorCount, setSponsorCount] = useState(0);

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
    setWantsToSponsor(null);
    setStep("sponsor");
  }

  function handleSponsorNo() {
    setSponsorCount(0);
    setStep("payment");
  }

  function handleSponsorConfirm() {
    const count = parseInt(sponsorCountInput);
    if (!count || count < 1) return;
    setSponsorCount(count);
    setStep("payment");
  }

  async function handleSubmit() {
    if (!paymentFile) { setError("Harap upload bukti pembayaran."); return; }
    setUploading(true);
    setError("");
    try {
      const tempId = `reg_${Date.now()}`;
      const paymentUrl = await uploadPaymentProof(tempId, paymentFile);
      const qrDataUrl = await QRCode.toDataURL(tempId, { width: 300 });

      // Denormalize main registrant fields for lookup without auth
      await createRegistration({
        mainNama: members[0].namaLengkap,
        mainTelpon: members[0].nomorTelpon,
        status: "registered",
        qrCode: qrDataUrl,
        paymentProofUrl: paymentUrl,
        totalAmount: calcTotal(members, sponsorCount),
        sponsorCount,
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

  const stepToIndex: Record<string, number> = {
    member: 0, sponsor: 1, payment: 2,
  };
  const stepIndex = stepToIndex[step] ?? 0;

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
            <div className="relative h-1 bg-gray-200 rounded-full mx-4">
              <div
                className="absolute h-1 bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${(stepIndex / (STEP_LABELS.length - 1)) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8">

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
                  Total sementara: <strong className="text-gray-800">{formatRupiah(calcTotal(members, 0))}</strong>
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={handleAddMore}
                  className="flex-1 border-2 border-blue-600 text-blue-600 py-3.5 rounded-xl font-semibold hover:bg-blue-50 active:scale-[0.98] transition text-sm">
                  + Tambah Peserta
                </button>
                <button onClick={handleNoMore}
                  className="flex-1 bg-blue-600 text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 active:scale-[0.98] transition text-sm">
                  Lanjut →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP: SPONSOR ── */}
          {step === "sponsor" && (
            <div className="space-y-6">
              <div className="space-y-1 mb-2">
                <h2 className="text-2xl font-bold text-gray-800">Sponsorship</h2>
                <p className="text-sm text-gray-500">
                  Apakah Anda ingin menanggung biaya retreat untuk orang lain yang membutuhkan?
                </p>
              </div>

              <div className="flex items-start gap-4 bg-amber-50 border border-amber-100 rounded-2xl p-4">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-800">Berbagi Berkat</p>
                  <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                    Jika ada anggota jemaat yang ingin ikut retreat namun terkendala biaya,
                    Anda bisa menanggung biaya mereka. Nama peserta yang disponsori akan diatur oleh admin gereja.
                  </p>
                </div>
              </div>

              {wantsToSponsor === null && (
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button onClick={() => setWantsToSponsor(false)}
                    className="flex-1 border-2 border-gray-200 text-gray-600 py-3.5 rounded-xl font-semibold hover:border-gray-300 active:scale-[0.98] transition text-sm">
                    Tidak, lanjut
                  </button>
                  <button onClick={() => setWantsToSponsor(true)}
                    className="flex-1 bg-amber-500 text-white py-3.5 rounded-xl font-semibold hover:bg-amber-600 active:scale-[0.98] transition text-sm">
                    Ya, saya mau sponsori ♥
                  </button>
                </div>
              )}

              {wantsToSponsor === false && (
                <div className="pt-2">
                  <button onClick={handleSponsorNo}
                    className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 active:scale-[0.98] transition text-sm">
                    Lanjut ke Pembayaran →
                  </button>
                </div>
              )}

              {wantsToSponsor === true && (
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Berapa orang yang ingin Anda sponsori?
                    </label>
                    <div className="flex gap-2 mb-3">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} type="button"
                          onClick={() => setSponsorCountInput(String(n))}
                          className={`w-11 h-11 rounded-xl border-2 font-bold text-sm transition active:scale-95
                            ${sponsorCountInput === String(n)
                              ? "border-amber-500 bg-amber-500 text-white"
                              : "border-gray-200 text-gray-600 hover:border-amber-300"}`}>
                          {n}
                        </button>
                      ))}
                      <input
                        type="number"
                        min={1}
                        value={sponsorCountInput}
                        onChange={(e) => setSponsorCountInput(e.target.value)}
                        className="flex-1 border-2 border-gray-200 rounded-xl px-3 text-sm font-semibold text-center focus:outline-none focus:border-amber-400 transition"
                        placeholder="Lainnya"
                      />
                    </div>

                    {parseInt(sponsorCountInput) > 0 && (
                      <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm">
                        <p className="text-amber-800 font-semibold">
                          Mensponsori {sponsorCountInput} orang ·{" "}
                          <span className="text-amber-600">
                            +{formatRupiah(parseInt(sponsorCountInput) * HARGA_JEMAAT["isi4"])}
                          </span>
                        </p>
                        <p className="text-amber-600 text-xs mt-0.5">
                          Dihitung dengan tarif Jemaat Kamar isi 4. Admin gereja akan mengatur alokasi peserta.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setWantsToSponsor(null)}
                      className="flex-1 border-2 border-gray-200 text-gray-500 py-3 rounded-xl font-semibold text-sm hover:border-gray-300 transition active:scale-[0.98]">
                      ← Kembali
                    </button>
                    <button
                      onClick={handleSponsorConfirm}
                      disabled={!parseInt(sponsorCountInput) || parseInt(sponsorCountInput) < 1}
                      className="flex-[2] bg-amber-500 text-white py-3 rounded-xl font-semibold text-sm hover:bg-amber-600 active:scale-[0.98] transition disabled:opacity-40 disabled:cursor-not-allowed">
                      Konfirmasi & Lanjut →
                    </button>
                  </div>
                </div>
              )}
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
                {sponsorCount > 0 && (
                  <div className="flex justify-between text-sm text-amber-700 pt-1">
                    <span className="flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                      Sponsorship ({sponsorCount} orang)
                    </span>
                    <span className="font-medium">{formatRupiah(sponsorCount * HARGA_JEMAAT["isi4"])}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-bold text-sm">
                  <span>Total</span>
                  <span className="text-blue-600 text-base">{formatRupiah(calcTotal(members, sponsorCount))}</span>
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
                <p className="text-blue-700">Bank BCA — 7641380427</p>
                <p className="text-blue-700">a.n. Yuyun Anggraini</p>
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
                <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700 text-left">
                  <p className="font-semibold mb-1">Cara cek status pendaftaran:</p>
                  <p>Gunakan nama dan nomor telepon pendaftar utama di halaman <strong>Pendaftaran Saya</strong>.</p>
                </div>
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

  const inputClass = "w-full border border-gray-200 text-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition";
  const labelClass = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2";
  const cssClassFocus = "border-blue-600 bg-blue-600";
  const cssClassUnfocus = "border-gray-200 text-600 hover:border-blue-300";
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

      {/* Kaos size guide */}
      <div>
        <label className={labelClass}>Ukuran Kaos</label>
        <div className="rounded-xl overflow-hidden border border-gray-100 mb-5">
          <img
            src="/photo1.jpg"
            alt="Panduan ukuran kaos"
            className="w-full object-cover"
          />
          <p className="text-center text-xs text-gray-400 py-1.5 bg-gray-50">Ukuran Kaos</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["S", "M", "L", "XL", "XXL"] as KaosSize[]).map((s) => (
            <button key={s} type="button" onClick={() => onChange("ukuranKaos", s)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition active:scale-95
                ${member.ukuranKaos === s ? cssClassFocus : cssClassUnfocus}`}>
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