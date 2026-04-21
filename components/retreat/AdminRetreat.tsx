"use client";
import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import {
  getRetreatConfig,
  updateRetreatConfig,
  getAllRegistrations,
  updateRegistrationStatus,
  updateMemberRoom,
  uploadRetreatImage,
} from "@/lib/firebase";
import type { RetreatConfig, RetreatRegistration } from "@/lib/retreat-types";

const QRScanner = dynamic(() => import("./QRScanner"), { ssr: false });

type AdminTab = "list" | "details";

export default function AdminRetreat() {
  const [tab, setTab] = useState<AdminTab>("list");
  const [registrations, setRegistrations] = useState<RetreatRegistration[]>([]);
  const [config, setConfig] = useState<Partial<RetreatConfig>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // Scanner
  const [showScanner, setShowScanner] = useState(false);
  const [scannedReg, setScannedReg] = useState<RetreatRegistration | null>(null);
  const [scanMsg, setScanMsg] = useState("");

  // Confirmation popups
  const [confirmApprove, setConfirmApprove] = useState<string | null>(null);
  const [confirmCheckin, setConfirmCheckin] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getRetreatConfig(), getAllRegistrations()]).then(([cfg, regs]) => {
      setConfig(cfg || {});
      setRegistrations(regs);
      setLoading(false);
    });
  }, []);

  // ── QR Scan handler ────────────────────────────────────────────────────────
  const handleScan = useCallback(async (qrId: string) => {
    setShowScanner(false);
    // QR code encodes the registrationId (tempId pattern: uid_timestamp)
    // Find registration by matching qrCode data URL or just ID
    const found = registrations.find(
      (r) => r.qrCode?.includes(qrId) || r.id === qrId
    );
    if (!found) {
      setScanMsg("Pendaftaran tidak ditemukan.");
      return;
    }
    if (found.status === "registered") {
      setScanMsg("status belum di approve admin");
      setScannedReg(found);
      return;
    }
    if (found.status === "approved") {
      await updateRegistrationStatus(found.id!, "checked_in");
      setRegistrations((prev) =>
        prev.map((r) => (r.id === found.id ? { ...r, status: "checked_in" } : r))
      );
      setScannedReg({ ...found, status: "checked_in" });
    }
    if (found.status === "checked_in") {
      setScannedReg(found);
    }
  }, [registrations]);

  // ── Approve / Check-in ────────────────────────────────────────────────────
  async function handleApprove(id: string) {
    await updateRegistrationStatus(id, "approved");
    setRegistrations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "approved" } : r))
    );
    setConfirmApprove(null);
  }

  async function handleCheckin(id: string) {
    await updateRegistrationStatus(id, "checked_in");
    setRegistrations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "checked_in" } : r))
    );
    setConfirmCheckin(null);
  }

  // ── Room update ───────────────────────────────────────────────────────────
  async function handleRoomChange(
    regId: string,
    memberIdx: number,
    kamar: string,
    members: RetreatRegistration["members"]
  ) {
    await updateMemberRoom(regId, memberIdx, kamar, members);
    setRegistrations((prev) =>
      prev.map((r) => {
        if (r.id !== regId) return r;
        const updated = [...r.members];
        updated[memberIdx] = { ...updated[memberIdx], kamar };
        return { ...r, members: updated };
      })
    );
  }

  // ── Config save ───────────────────────────────────────────────────────────
  async function handleSaveConfig() {
    setSaving(true);
    await updateRetreatConfig(config);
    setSaveMsg("Tersimpan!");
    setSaving(false);
    setTimeout(() => setSaveMsg(""), 2000);
  }

  // ── Image upload ──────────────────────────────────────────────────────────
  async function handleImageUpload(type: "poster" | "banner", file: File) {
    const url = await uploadRetreatImage(type, file);
    setConfig((prev) => ({
      ...prev,
      [type === "poster" ? "posterUrl" : "bannerUrl"]: url,
    }));
    await updateRetreatConfig({
      [type === "poster" ? "posterUrl" : "bannerUrl"]: url,
    });
  }

  if (loading) return <p className="text-gray-400 p-6">Memuat...</p>;

  return (
    <div className="p-4 space-y-4">
      {/* Tab switcher */}
      <div className="flex gap-2 border-b pb-2">
        {(["list", "details"] as AdminTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition
              ${tab === t ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            {t === "list" ? "List Registrasi" : "Detail Retreat"}
          </button>
        ))}
      </div>

      {/* ── TAB: REGISTRATION LIST ── */}
      {tab === "list" && (
        <div className="space-y-4">
          {/* Scan button */}
          <div className="flex justify-end">
            <button
              onClick={() => { setShowScanner(true); setScanMsg(""); setScannedReg(null); }}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-purple-700 transition"
            >
              Scan QR
            </button>
          </div>

          {/* Registrations table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-left">
                  <th className="px-3 py-2 font-medium">Pendaftar Utama</th>
                  <th className="px-3 py-2 font-medium">No. Telp</th>
                  <th className="px-3 py-2 font-medium">Kaos</th>
                  <th className="px-3 py-2 font-medium">Bus/Mobil</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Kamar</th>
                  <th className="px-3 py-2 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((reg) => {
                  const main = reg.members[0];
                  const subs = reg.members.slice(1);
                  return (
                    <>
                      <tr key={reg.id} className="border-b hover:bg-gray-50">
                        <td className="px-3 py-3">
                          <div className="font-semibold">{main.namaLengkap}</div>
                          <div className="text-xs text-gray-400">{reg.email}</div>
                          {/* Dropdown sub-registrants */}
                          {subs.length > 0 && (
                            <details className="mt-1">
                              <summary className="text-xs text-blue-600 cursor-pointer">
                                +{subs.length} peserta lain
                              </summary>
                              <div className="mt-1 space-y-1 pl-2 border-l-2 border-blue-100">
                                {subs.map((s, idx) => (
                                  <div key={idx} className="text-xs text-gray-600">
                                    {s.namaLengkap} ({s.relasi})
                                    — Kaos: {s.ukuranKaos}
                                    — {s.transportasi === "bus" ? "Bus" : "Mobil"}
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </td>
                        <td className="px-3 py-3 text-gray-600">{main.nomorTelpon}</td>
                        <td className="px-3 py-3 text-gray-600">{main.ukuranKaos}</td>
                        <td className="px-3 py-3 text-gray-600">
                          {main.transportasi === "bus" ? "Bus" : "Mobil"}
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge status={reg.status} />
                        </td>
                        <td className="px-3 py-3">
                          {/* Room for each member */}
                          <div className="space-y-1">
                            {reg.members.map((m, mIdx) => (
                              <div key={mIdx} className="flex items-center gap-1">
                                <span className="text-xs text-gray-400 w-16 truncate">
                                  {m.isMain ? "Utama" : m.relasi}:
                                </span>
                                <input
                                  type="text"
                                  placeholder="N/A"
                                  defaultValue={m.kamar}
                                  onBlur={(e) =>
                                    handleRoomChange(reg.id!, mIdx, e.target.value, reg.members)
                                  }
                                  className="border rounded px-2 py-0.5 text-xs w-20"
                                />
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          {reg.status === "registered" && (
                            <button
                              onClick={() => setConfirmApprove(reg.id!)}
                              className="bg-green-500 text-white px-3 py-1 rounded-lg text-xs font-semibold hover:bg-green-600"
                            >
                              Approve
                            </button>
                          )}
                          {reg.status === "approved" && (
                            <button
                              onClick={() => setConfirmCheckin(reg.id!)}
                              className="bg-blue-500 text-white px-3 py-1 rounded-lg text-xs font-semibold hover:bg-blue-600"
                            >
                              Check In
                            </button>
                          )}
                          {reg.status === "checked_in" && (
                            <span className="text-green-600 text-xs font-semibold">✓ Checked In</span>
                          )}
                        </td>
                      </tr>
                    </>
                  );
                })}
              </tbody>
            </table>
            {registrations.length === 0 && (
              <p className="text-center text-gray-400 py-8">Belum ada pendaftaran.</p>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: RETREAT DETAILS ── */}
      {tab === "details" && (
        <div className="space-y-4 max-w-xl">
          <div className="grid grid-cols-2 gap-3">
            {(["title", "theme", "date", "location", "bankName", "bankAccount", "bankHolder"] as const).map((field) => (
              <div key={field} className={["title", "description"].includes(field) ? "col-span-2" : ""}>
                <label className="block text-xs font-medium text-gray-600 mb-1 capitalize">
                  {field.replace(/([A-Z])/g, " $1")}
                </label>
                <input
                  type="text"
                  value={(config as Record<string, string>)[field] || ""}
                  onChange={(e) => setConfig((p) => ({ ...p, [field]: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            ))}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Deskripsi</label>
              <textarea
                value={config.description || ""}
                onChange={(e) => setConfig((p) => ({ ...p, description: e.target.value }))}
                rows={5}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Toggle registration open/close */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.isOpen || false}
              onChange={(e) => setConfig((p) => ({ ...p, isOpen: e.target.checked }))}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium text-gray-700">Buka Pendaftaran</span>
          </label>

          {/* Poster upload */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-600">Upload Poster (Full)</label>
            {config.posterUrl && (
              <Image src={config.posterUrl} alt="poster" width={200} height={280} className="rounded-lg" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleImageUpload("poster", e.target.files[0])}
            />
          </div>

          {/* Banner upload */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-600">Upload Banner (Home)</label>
            {config.bannerUrl && (
              <Image src={config.bannerUrl} alt="banner" width={300} height={150} className="rounded-lg" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleImageUpload("banner", e.target.files[0])}
            />
          </div>

          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
          {saveMsg && <p className="text-green-600 text-sm">{saveMsg}</p>}
        </div>
      )}

      {/* ── SCANNER MODAL ── */}
      {showScanner && (
        <QRScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* ── SCAN RESULT POPUP ── */}
      {scannedReg && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 space-y-4">
            {scanMsg === "status belum di approve admin" ? (
              <div className="text-center">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-red-600 text-2xl font-bold">!</span>
                </div>
                <p className="font-bold text-red-600">{scanMsg}</p>
                <p className="text-sm text-gray-500 mt-1">{scannedReg.members[0].namaLengkap}</p>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white text-3xl font-bold">✓</span>
                </div>
                <p className="font-bold text-green-700 text-lg">CHECKED IN</p>
              </div>
            )}
            {scannedReg.members.map((m, i) => (
              <div key={i} className="border-b pb-2 last:border-0">
                <p className="font-semibold text-gray-800">{m.namaLengkap}</p>
                <p className="text-xs text-gray-500">
                  Kamar: {m.kamar || "N/A"} · Kaos: {m.ukuranKaos}
                </p>
              </div>
            ))}
            <button
              onClick={() => { setScannedReg(null); setScanMsg(""); }}
              className="w-full bg-gray-100 text-gray-700 py-2 rounded-xl font-medium hover:bg-gray-200"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* ── APPROVE CONFIRMATION ── */}
      {confirmApprove && (
        <ConfirmPopup
          message="Setujui pendaftaran ini?"
          onConfirm={() => handleApprove(confirmApprove)}
          onCancel={() => setConfirmApprove(null)}
        />
      )}

      {/* ── CHECK-IN CONFIRMATION ── */}
      {confirmCheckin && (
        <ConfirmPopup
          message="Check in pendaftaran ini secara manual?"
          onConfirm={() => handleCheckin(confirmCheckin)}
          onCancel={() => setConfirmCheckin(null)}
        />
      )}
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    registered: "bg-yellow-100 text-yellow-700",
    approved: "bg-blue-100 text-blue-700",
    checked_in: "bg-green-100 text-green-700",
  };
  const labels: Record<string, string> = {
    registered: "Terdaftar",
    approved: "Disetujui",
    checked_in: "Checked In",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${styles[status] || ""}`}>
      {labels[status] || status}
    </span>
  );
}

// ── Generic confirmation popup ─────────────────────────────────────────────────
function ConfirmPopup({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 space-y-4 text-center">
        <p className="font-semibold text-gray-800">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 border py-2 rounded-xl text-gray-600 hover:bg-gray-50"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-green-600 text-white py-2 rounded-xl font-semibold hover:bg-green-700"
          >
            Ya, Lanjutkan
          </button>
        </div>
      </div>
    </div>
  );
}