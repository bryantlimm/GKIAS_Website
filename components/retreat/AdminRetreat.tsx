// components/retreat/AdminRetreat.tsx
"use client";
import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import * as XLSX from "xlsx";
import {
  getRetreatConfig,
  updateRetreatConfig,
  getAllRegistrations,
  updateRegistrationStatus,
  updateMemberRoom,
  updateMemberInfo,
  uploadRetreatImage,
  mergeRegistrations,
} from "@/lib/firebase";
import type { RetreatConfig, RetreatRegistration } from "@/lib/retreat-types";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRef } from "react";
import PaperFormScanner from "./PaperFormScanner";

const QRScanner = dynamic(() => import("./QRScanner"), { ssr: false });

type AdminTab = "list" | "details";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

const badgeStyle = {
  background: "#f1f5f9",
  borderRadius: 4,
  padding: "2px 8px",
  fontSize: 11,
  color: "#64748b",
};

// ── Icons ──────────────────────────────────────────────────────────────────────
const ScanIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3m0 4h4m-4-4v4m-4 0h4"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const BedIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 9V5a2 2 0 012-2h16a2 2 0 012 2v4"/><path d="M2 21V11h20v10"/>
    <path d="M2 15h20"/>
  </svg>
);

const BusIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 6v6M16 6v6"/><rect x="3" y="6" width="18" height="12" rx="2"/>
    <path d="M3 11h18"/><circle cx="7" cy="20" r="1"/><circle cx="17" cy="20" r="1"/>
    <path d="M6 18H4a1 1 0 01-1-1v-1h18v1a1 1 0 01-1 1h-2"/>
  </svg>
);

const SaveIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
  </svg>
);

const UploadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
    <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>
  </svg>
);

const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/>
    <path d="M20.88 18.09A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>
  </svg>
);

const ReceiptIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <line x1="9" y1="9" x2="15" y2="9"/>
    <line x1="9" y1="15" x2="15" y2="15"/>
  </svg>
);

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const MergeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 7h8M8 12h8M8 17h4"/>
    <path d="M15 14l3 3-3 3"/>
  </svg>
);

// New icon for scanning a paper/document form
const FormScanIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="9" y1="13" x2="15" y2="13"/>
    <line x1="9" y1="17" x2="13" y2="17"/>
    <path d="M17 17l2 2 4-4" />
  </svg>
);

const getStatusStyle = (status: string): { bg: string; color: string; border: string } => {
  switch (status) {
    case "registered":   return { bg: "#fefce8", color: "#ca8a04", border: "#fde68a" };
    case "approved":     return { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" };
    case "checked_in":   return { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" };
    default:             return { bg: "#f3f4f6", color: "#6b7280", border: "#e5e7eb" };
  }
};

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    registered: "Terdaftar",
    approved: "Disetujui",
    checked_in: "Checked In",
  };
  return map[status] || status;
};

const getRoomCapacity = (tipeKamar: string): string => {
  const map: Record<string, string> = {
    isi2: "2",
    isi3: "3",
    isi4: "4",
  };
  return map[tipeKamar] || tipeKamar;
};

const avatarColors = ["#3b5bdb", "#0ea5e9", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

function getAvatar(name: string) {
  const color = avatarColors[name.charCodeAt(0) % avatarColors.length];
  const initials = name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();
  return { color, initials };
}

export default function AdminRetreat() {
  const [tab, setTab] = useState<AdminTab>("list");
  const [registrations, setRegistrations] = useState<RetreatRegistration[]>([]);
  const [config, setConfig] = useState<Partial<RetreatConfig>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Scanner
  const [showScanner, setShowScanner] = useState(false);
  const [scannedReg, setScannedReg] = useState<RetreatRegistration | null>(null);
  const [scanMsg, setScanMsg] = useState("");
  const [scanError, setScanError] = useState("");

  // Paper form scanner — hook is correctly inside the component
  const [showPaperScanner, setShowPaperScanner] = useState(false);

  // Confirmation popups
  const [confirmApprove, setConfirmApprove] = useState<string | null>(null);
  const [confirmCheckin, setConfirmCheckin] = useState<string | null>(null);

  // Payment proof modal
  const [paymentProofUrl, setPaymentProofUrl] = useState<string | null>(null);

  // Edit member modal
  const [editingRegId, setEditingRegId] = useState<string | null>(null);
  const [editingMemberIdx, setEditingMemberIdx] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<{
    namaLengkap: string;
    nomorTelpon: string;
    ukuranKaos: RetreatRegistration["members"][0]["ukuranKaos"];
    transportasi: RetreatRegistration["members"][0]["transportasi"];
  }>({
    namaLengkap: "",
    nomorTelpon: "",
    ukuranKaos: "M",
    transportasi: "bus",
  });

  // ── Merge state ──────────────────────────────────────────────────────────────
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSelected, setMergeSelected] = useState<string[]>([]);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeMainId, setMergeMainId] = useState<string | null>(null);
  const [mergeSaving, setMergeSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          await user.getIdToken(true);
          const [cfg, regs] = await Promise.all([
            getRetreatConfig(),
            getAllRegistrations()
          ]);
          setConfig(cfg || {});
          setRegistrations(regs);
        } catch (err) {
          console.error("Error fetching data:", err);
          alert("Fetch failed: " + String(err));
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // ── QR Scan handler ────────────────────────────────────────────────────────
  const handleScanRef = useRef<(qrId: string) => void>(() => {});

  const handleScan = useCallback(async (qrId: string) => {
    setShowScanner(false);
    setScanMsg("");
    setScanError("");
    const found = registrations.find((r) => r.id === qrId);
    if (!found) { setScanError("Pendaftaran tidak ditemukan untuk QR ini."); return; }
    if (found.status === "registered") { setScanMsg("status belum di approve admin"); setScannedReg(found); return; }
    if (found.status === "approved") {
      await updateRegistrationStatus(found.id!, "checked_in");
      const updated = { ...found, status: "checked_in" as const };
      setScannedReg(updated);
      const fresh = await getAllRegistrations();
      setRegistrations(fresh);
      return;
    }
    if (found.status === "checked_in") { setScannedReg(found); }
  }, [registrations]);

  const [isHovered, setIsHovered] = useState(false);
  useEffect(() => { handleScanRef.current = handleScan; }, [handleScan]);
  const stableOnScan = useCallback((qrId: string) => { handleScanRef.current(qrId); }, []);

  async function handleApprove(id: string) {
    await updateRegistrationStatus(id, "approved");
    setRegistrations((prev) => prev.map((r) => (r.id === id ? { ...r, status: "approved" } : r)));
    setConfirmApprove(null);
  }

  async function handleCheckin(id: string) {
    await updateRegistrationStatus(id, "checked_in");
    setRegistrations((prev) => prev.map((r) => (r.id === id ? { ...r, status: "checked_in" } : r)));
    const updatedReg = registrations.find((r) => r.id === id);
    if (updatedReg) {
      setScannedReg({ ...updatedReg, status: "checked_in" as const });
      setScanMsg("");
    }
    setConfirmCheckin(null);
  }

  async function handleRoomChange(regId: string, memberIdx: number, kamar: string, members: RetreatRegistration["members"]) {
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

  function openEditMember(regId: string, memberIdx: number, member: RetreatRegistration["members"][0]) {
    setEditingRegId(regId);
    setEditingMemberIdx(memberIdx);
    setEditFormData({
      namaLengkap: member.namaLengkap,
      nomorTelpon: member.nomorTelpon,
      ukuranKaos: member.ukuranKaos,
      transportasi: member.transportasi,
    });
  }

  async function handleSaveEditMember() {
    if (editingRegId === null || editingMemberIdx === null) return;
    const reg = registrations.find((r) => r.id === editingRegId);
    if (!reg) return;
    await updateMemberInfo(editingRegId, editingMemberIdx, editFormData, reg.members);
    setRegistrations((prev) =>
      prev.map((r) => {
        if (r.id !== editingRegId) return r;
        const updated = [...r.members];
        updated[editingMemberIdx] = { ...updated[editingMemberIdx], ...editFormData };
        return { ...r, members: updated };
      })
    );
    closeEditMember();
  }

  function closeEditMember() {
    setEditingRegId(null);
    setEditingMemberIdx(null);
    setEditFormData({ namaLengkap: "", nomorTelpon: "", ukuranKaos: "M", transportasi: "bus" });
  }

  async function handleSaveConfig() {
    setSaving(true);
    await updateRetreatConfig(config);
    setSaveMsg("Tersimpan!");
    setSaving(false);
    setTimeout(() => setSaveMsg(""), 2000);
  }

  async function handleImageUpload(type: "poster" | "banner", file: File) {
    const url = await uploadRetreatImage(type, file);
    const key = type === "poster" ? "posterUrl" : "bannerUrl";
    setConfig((prev) => ({ ...prev, [key]: url }));
    await updateRetreatConfig({ [key]: url });
  }

  // ── Merge handler ────────────────────────────────────────────────────────────
  async function handleMerge() {
    if (!mergeMainId || mergeSelected.length !== 2) return;
    const secondaryId = mergeSelected.find((id) => id !== mergeMainId)!;
    const mainReg = registrations.find((r) => r.id === mergeMainId)!;
    const secondaryReg = registrations.find((r) => r.id === secondaryId)!;

    setMergeSaving(true);
    await mergeRegistrations(mergeMainId, secondaryId, mainReg, secondaryReg);
    const fresh = await getAllRegistrations();
    setRegistrations(fresh);
    setMergeSaving(false);
    setMergeMode(false);
    setMergeSelected([]);
    setShowMergeModal(false);
    setMergeMainId(null);
  }

  function handleExportXLSX() {
    if (registrations.length === 0) { alert("Tidak ada data untuk diexport"); return; }
    const transportasiMap: Record<string, string> = { bus: "Bus", mobil_sendiri: "Mobil Sendiri" };
    const statusMap: Record<string, string> = {
      registered: "Terdaftar", approved: "Disetujui", checked_in: "Checked In",
    };
    const exportData = registrations.flatMap((reg) =>
      reg.members.map((member) => ({
        "Nama": member.namaLengkap,
        "Nomor Telepon": member.nomorTelpon,
        "Transportasi": transportasiMap[member.transportasi] || member.transportasi,
        "Ukuran Kaos": member.ukuranKaos,
        "Tipe Kamar": member.tipeKamar,
        "Nomor Kamar": member.kamar,
        "Status": statusMap[reg.status] || reg.status,
      }))
    );
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Registrasi");
    worksheet["!cols"] = [
      { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
    ];
    XLSX.writeFile(workbook, `Registrasi-Retreat-${new Date().toISOString().split("T")[0]}.xlsx`);
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#94a3b8", padding: "24px 0" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M21 12a9 9 0 11-6.219-8.56" />
        </svg>
        Memuat data retreat...
      </div>
    );
  }

  return (
    <div>
      {/* ── Tab Toggle + Action Buttons ── */}
      <div style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems: isMobile ? "stretch" : "center",
        justifyContent: "space-between",
        gap: 10,
        marginBottom: 20,
      }}>
        {/* Tab buttons */}
        <div style={{
          display: "flex", gap: 4, background: "#ffffff",
          borderRadius: 10, border: "1.5px solid #e8ecf0", padding: 5,
        }}>
          {(["list", "details"] as AdminTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: "9px 16px", borderRadius: 7, border: "none", cursor: "pointer",
                background: tab === t ? "#3b5bdb" : "transparent",
                color: tab === t ? "#fff" : "#64748b",
                fontSize: 13, fontWeight: tab === t ? 700 : 600, fontFamily: "inherit",
                transition: "all 0.15s",
              }}
            >
              {t === "list" ? "List Registrasi" : "Detail Retreat"}
              <span style={{
                marginLeft: 6, fontSize: 11, fontWeight: 700,
                background: tab === t ? "rgba(255,255,255,0.2)" : "#f8fafc",
                color: tab === t ? "#fff" : "#94a3b8",
                borderRadius: 10, padding: "1px 7px",
              }}>
                {t === "list" ? registrations.length : "✎"}
              </span>
            </button>
          ))}
        </div>

        {/* Action buttons */}
        {tab === "list" && (
          <div style={{ display: "flex", gap: 8 }}>
            {/* Merge toggle */}
            <button
              onClick={() => {
                setMergeMode((prev) => {
                  if (prev) setMergeSelected([]);
                  return !prev;
                });
              }}
              style={{
                flex: 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "10px 16px", borderRadius: 8,
                border: mergeMode ? "1.5px solid #f97316" : "1.5px solid #e8ecf0",
                background: mergeMode ? "#fff7ed" : "#f8fafc",
                color: mergeMode ? "#ea580c" : "#475569",
                fontSize: 13, fontWeight: 700, fontFamily: "inherit", cursor: "pointer",
                transition: "all 0.15s",
                minHeight: 44,
              }}
            >
              <MergeIcon />
              {mergeMode ? "Batal" : "Merge"}
            </button>

            {/* Paper form scanner button */}
            {/* <button
              onClick={() => setShowPaperScanner(true)}
              style={{
                flex: 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "10px 16px", borderRadius: 8, border: "1.5px solid #d1fae5",
                background: "#ecfdf5", color: "#059669",
                fontSize: 13, fontWeight: 700, fontFamily: "inherit", cursor: "pointer",
                transition: "all 0.15s",
                minHeight: 44,
              }}
            >
              <FormScanIcon />
              Scan Form
            </button> */}
            {/* Paper form scanner button (Disabled / Coming Soon) */}
            <button
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              style={{
                flex: 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "10px 16px", borderRadius: 8, 
                border: "1.5px solid #e5e7eb", // Soft gray border
                background: "#f3f4f6",          // Light gray background
                color: "#9ca3af",               // Muted gray text/icon
                fontSize: 13, fontWeight: 700, fontFamily: "inherit", 
                cursor: "not-allowed",          // Shows the disabled "circle-slash" cursor
                transition: "all 0.15s",
                minHeight: 44,
              }}
            >
              <FormScanIcon />
              {isHovered ? "Coming Soon" : "Scan Form"}
            </button>
            
            {/* QR scanner button */}
            <button
              onClick={() => { setShowScanner(true); setScanMsg(""); setScannedReg(null); }}
              style={{
                flex: 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "10px 16px", borderRadius: 8, border: "1.5px solid #c7d2fe",
                background: "#eff3ff", color: "#3b5bdb",
                fontSize: 13, fontWeight: 700, fontFamily: "inherit", cursor: "pointer",
                transition: "all 0.15s",
                minHeight: 44,
              }}
            >
              <ScanIcon />
              Scan QR
            </button>

            {/* Export button */}
            <button
              onClick={handleExportXLSX}
              style={{
                flex: 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "10px 16px", borderRadius: 8, border: "1.5px solid #e8ecf0",
                background: "#f8fafc", color: "#475569",
                fontSize: 13, fontWeight: 700, fontFamily: "inherit", cursor: "pointer",
                transition: "all 0.15s",
                minHeight: 44,
              }}
            >
              <DownloadIcon />
              Export
            </button>
          </div>
        )}
      </div>

      {/* ── TAB: REGISTRATION LIST ── */}
      {tab === "list" && (
        <div>
          {/* Merge mode banner */}
          {mergeMode && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 12, padding: "12px 16px",
              background: "#fff7ed", border: "1.5px solid #fed7aa",
              borderRadius: 10, marginBottom: 12, flexWrap: "wrap",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#9a3412" }}>
                    Mode Merge Aktif
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "#c2410c" }}>
                    {mergeSelected.length === 0
                      ? "Pilih 2 pendaftaran untuk digabung"
                      : mergeSelected.length === 1
                      ? "1 dipilih — pilih 1 lagi"
                      : "2 dipilih — siap digabung"}
                  </p>
                </div>
              </div>
              {mergeSelected.length === 2 && (
                <button
                  onClick={() => { setShowMergeModal(true); setMergeMainId(null); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "10px 18px", background: "#ea580c", color: "#fff",
                    border: "none", borderRadius: 8,
                    fontWeight: 700, fontSize: 13, fontFamily: "inherit", cursor: "pointer",
                    minHeight: 40,
                  }}
                >
                  <MergeIcon /> Gabungkan
                </button>
              )}
            </div>
          )}

          {/* Count badges */}
          {registrations.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              <span style={{ background: "#eff3ff", color: "#3b5bdb", fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>
                {registrations.length} total
              </span>
              <span style={{ background: "#fefce8", color: "#ca8a04", fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>
                {registrations.filter(r => r.status === "registered").length} menunggu
              </span>
              <span style={{ background: "#f0fdf4", color: "#16a34a", fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>
                {registrations.filter(r => r.status === "checked_in").length} checked in
              </span>
            </div>
          )}

          {registrations.length === 0 ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "48px 24px", gap: 12, color: "#94a3b8",
            }}>
              <div style={{ width: 48, height: 48, background: "#f1f5f9", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                </svg>
              </div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#64748b" }}>Belum ada pendaftaran</p>
              <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>Pendaftaran yang masuk akan muncul di sini</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {registrations.map((reg) => {
                const main = reg.members[0];
                const subs = reg.members.slice(1);
                const { color, initials } = getAvatar(main.namaLengkap);
                const statusStyle = getStatusStyle(reg.status);
                const isExpanded = expandedId === reg.id;
                const isSelectedForMerge = mergeSelected.includes(reg.id!);

                return (
                  <div key={reg.id}>
                    {/* ── Card ── */}
                    <div
                      style={{
                        border: isSelectedForMerge
                          ? "2px solid #ea580c"
                          : "1.5px solid #e8ecf0",
                        borderRadius: isExpanded ? "10px 10px 0 0" : 10,
                        background: isSelectedForMerge ? "#fff7ed" : "#fff",
                        overflow: "hidden",
                        transition: "border-color 0.15s, background 0.15s",
                      }}
                    >
                      {/* Top section */}
                      <div
                        onClick={() => {
                          if (mergeMode) {
                            setMergeSelected((prev) => {
                              if (prev.includes(reg.id!)) return prev.filter((id) => id !== reg.id);
                              if (prev.length >= 2) return prev;
                              return [...prev, reg.id!];
                            });
                          } else {
                            setExpandedId(isExpanded ? null : reg.id!);
                          }
                        }}
                        style={{
                          width: "100%",
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "14px 14px 10px",
                          background: "transparent", border: "none",
                          cursor: "pointer", textAlign: "left",
                          minHeight: 56,
                        }}
                      >
                        {/* Merge checkbox */}
                        {mergeMode && (
                          <div style={{
                            width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                            border: isSelectedForMerge ? "2px solid #ea580c" : "2px solid #cbd5e1",
                            background: isSelectedForMerge ? "#ea580c" : "#fff",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all 0.15s",
                          }}>
                            {isSelectedForMerge && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                            )}
                          </div>
                        )}

                        {/* Avatar */}
                        <div style={{
                          width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                          background: color, display: "flex", alignItems: "center",
                          justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 800,
                        }}>
                          {initials}
                        </div>

                        {/* Name + phone */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            margin: 0, fontSize: 14, fontWeight: 700, color: "#1e293b",
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                          }}>
                            {main.namaLengkap}
                          </p>
                          <p style={{
                            margin: "2px 0 0", fontSize: 12, color: "#94a3b8",
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                          }}>
                            {main.nomorTelpon}
                          </p>
                        </div>

                        {/* Edit button */}
                        {!mergeMode && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditMember(reg.id!, 0, main); }}
                            title="Edit informasi peserta"
                            style={{
                              flexShrink: 0, display: "flex", alignItems: "center", gap: 6,
                              padding: "6px 10px", background: "#f1f5f9", color: "#64748b",
                              border: "1.5px solid #e2e8f0", borderRadius: 6,
                              cursor: "pointer", fontSize: 12, fontFamily: "inherit",
                              minHeight: 32,
                            }}
                          >
                            <EditIcon />
                          </button>
                        )}

                        {/* Status badge */}
                        <div style={{
                          flexShrink: 0, fontSize: 11, fontWeight: 700,
                          background: statusStyle.bg, color: statusStyle.color,
                          border: `1.5px solid ${statusStyle.border}`,
                          padding: "4px 10px", borderRadius: 20,
                          whiteSpace: "nowrap",
                        }}>
                          {getStatusLabel(reg.status)}
                        </div>

                        {/* Chevron */}
                        {!mergeMode && (
                          <div style={{
                            flexShrink: 0, color: "#94a3b8",
                            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                            transition: "transform 0.15s",
                          }}>
                            <ChevronDownIcon />
                          </div>
                        )}
                      </div>

                      {/* Bottom section */}
                      {!mergeMode && (
                        <div style={{
                          display: "flex", flexWrap: "wrap", alignItems: "center",
                          gap: 8, padding: "0 14px 12px",
                          borderTop: "1px solid #f1f5f9",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, background: "#f1f5f9", borderRadius: 6, padding: "5px 10px" }}>
                            <span style={{ color: "#64748b" }}><BusIcon /></span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>
                              {main.transportasi === "bus" ? "Bus" : "Mobil"}
                            </span>
                          </div>
                          <div style={{ background: "#f8fafc", borderRadius: 6, padding: "5px 10px", fontSize: 12, fontWeight: 600, color: "#475569" }}>
                            Kaos {main.ukuranKaos}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, background: "#f1f5f9", borderRadius: 6, padding: "5px 10px" }}>
                            <span style={{ color: "#64748b" }}><BedIcon /></span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8" }}>({getRoomCapacity(main.tipeKamar)})</span>
                            <input
                              type="text"
                              placeholder="N/A"
                              defaultValue={main.kamar}
                              onBlur={(e) => handleRoomChange(reg.id!, 0, e.target.value, reg.members)}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                border: "1.5px solid #e8ecf0", borderRadius: 6,
                                padding: "3px 8px", fontSize: 12, width: 64,
                                fontFamily: "inherit", outline: "none", background: "#fff",
                              }}
                            />
                          </div>
                          <div style={{ flex: 1 }} />
                          <button
                            onClick={() => reg.paymentProofUrl && setPaymentProofUrl(reg.paymentProofUrl)}
                            title={reg.paymentProofUrl ? "Lihat bukti pembayaran" : "Bukti belum diupload"}
                            style={{
                              display: "flex", alignItems: "center", gap: 5,
                              padding: "8px 14px",
                              background: reg.paymentProofUrl ? "#f3f4f6" : "#fef2f2",
                              color: reg.paymentProofUrl ? "#6b7280" : "#ef4444",
                              border: `1.5px solid ${reg.paymentProofUrl ? "#e5e7eb" : "#fecaca"}`,
                              borderRadius: 7, cursor: reg.paymentProofUrl ? "pointer" : "default",
                              fontSize: 12, fontWeight: 700, fontFamily: "inherit", minHeight: 36,
                            }}
                          >
                            <ReceiptIcon />
                            {reg.paymentProofUrl ? "Bukti" : "Bukti ✗"}
                          </button>
                          {reg.status === "registered" && (
                            <button
                              onClick={() => setConfirmApprove(reg.id!)}
                              style={{
                                display: "flex", alignItems: "center", gap: 5,
                                padding: "8px 14px", background: "#f0fdf4", color: "#16a34a",
                                border: "1.5px solid #bbf7d0", borderRadius: 7,
                                cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit", minHeight: 36,
                              }}
                            >
                              <CheckIcon /> Approve
                            </button>
                          )}
                          {reg.status === "approved" && (
                            <button
                              onClick={() => setConfirmCheckin(reg.id!)}
                              style={{
                                display: "flex", alignItems: "center", gap: 5,
                                padding: "8px 14px", background: "#eff6ff", color: "#2563eb",
                                border: "1.5px solid #bfdbfe", borderRadius: 7,
                                cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit", minHeight: 36,
                              }}
                            >
                              <CheckIcon /> Check In
                            </button>
                          )}
                          {reg.status === "checked_in" && (
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#16a34a", display: "flex", alignItems: "center", gap: 5, padding: "8px 4px" }}>
                              <CheckIcon /> Hadir
                            </span>
                          )}
                        </div>
                      )}

                      {/* Merge mode: member count hint */}
                      {mergeMode && (
                        <div style={{ padding: "0 14px 12px", borderTop: "1px solid #f1f5f9" }}>
                          <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>
                            {reg.members.length} anggota
                          </span>
                        </div>
                      )}
                    </div>

                    {/* ── Expanded: sub-members ── */}
                    {isExpanded && !mergeMode && (
                      <div style={{
                        padding: "16px", background: "#f8fafc",
                        borderLeft: "1.5px solid #e8ecf0",
                        borderRight: "1.5px solid #e8ecf0",
                        borderBottom: "1.5px solid #e8ecf0",
                        borderRadius: "0 0 10px 10px",
                      }}>
                        {subs.length > 0 ? (
                          <div>
                            <label style={{
                              fontSize: 10, fontWeight: 700, color: "#94a3b8",
                              textTransform: "uppercase", letterSpacing: "0.06em",
                              display: "block", marginBottom: 8,
                            }}>
                              Peserta Lain ({subs.length})
                            </label>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              {subs.map((s, idx) => (
                                <div key={idx} style={{
                                  padding: "12px", background: "#fff",
                                  border: "1.5px solid #e8ecf0", borderRadius: 8,
                                  fontSize: 12, color: "#475569",
                                }}>
                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                                    <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "#1e293b", flex: 1 }}>{s.namaLengkap}</p>
                                    <button
                                      onClick={() => {
                                        const memberIdx = reg.members.findIndex((m) => m === s);
                                        if (memberIdx !== -1) openEditMember(reg.id!, memberIdx, s);
                                      }}
                                      title="Edit informasi peserta"
                                      style={{
                                        display: "flex", alignItems: "center", gap: 4,
                                        padding: "4px 8px", background: "#f1f5f9", color: "#64748b",
                                        border: "1.5px solid #e2e8f0", borderRadius: 5,
                                        cursor: "pointer", fontSize: 11, fontFamily: "inherit",
                                        flexShrink: 0, minHeight: 28,
                                      }}
                                    >
                                      <EditIcon />
                                    </button>
                                  </div>
                                  {s.nomorTelpon && (
                                    <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b" }}>
                                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline", marginRight: 4 }}>
                                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.63A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.15 6.15l1.28-1.28a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                                      </svg>
                                      {s.nomorTelpon}
                                    </p>
                                  )}
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 8 }}>
                                    <span style={badgeStyle}>{s.relasi}</span>
                                    <span style={badgeStyle}>Kaos {s.ukuranKaos}</span>
                                    <span style={badgeStyle}>{s.transportasi === "bus" ? "Bus" : "Mobil"}</span>
                                  </div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <span style={{ color: "#94a3b8" }}><BedIcon /></span>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8" }}>({getRoomCapacity(s.tipeKamar)})</span>
                                    <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Kamar:</span>
                                    <input
                                      type="text"
                                      placeholder="N/A"
                                      defaultValue={s.kamar}
                                      onBlur={(e) => {
                                        const memberIdx = reg.members.findIndex((m) => m === s);
                                        if (memberIdx !== -1) handleRoomChange(reg.id!, memberIdx, e.target.value, reg.members);
                                      }}
                                      style={{
                                        border: "1.5px solid #e8ecf0", borderRadius: 6,
                                        padding: "4px 8px", fontSize: 12, width: 72,
                                        fontFamily: "inherit", outline: "none",
                                      }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p style={{ margin: 0, fontSize: 13, color: "#94a3b8", fontWeight: 500 }}>
                            Hanya ada satu nama dalam pendaftaran ini.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: RETREAT DETAILS ── */}
      {tab === "details" && (
        <div style={{ maxWidth: 560 }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 16 }}>
            {(["title", "theme", "date", "location", "bankName", "bankAccount", "bankHolder"] as const).map((field) => {
              const isWide = ["title"].includes(field);
              return (
                <div key={field} style={{ gridColumn: (isWide || isMobile) ? "1 / -1" : undefined }}>
                  <label style={{
                    display: "block", fontSize: 10, fontWeight: 700, color: "#94a3b8",
                    textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6,
                  }}>
                    {field.replace(/([A-Z])/g, " $1")}
                  </label>
                  <input
                    type="text"
                    value={(config as Record<string, string>)[field] || ""}
                    onChange={(e) => setConfig((p) => ({ ...p, [field]: e.target.value }))}
                    style={{
                      width: "100%", boxSizing: "border-box",
                      border: "1.5px solid #e8ecf0", borderRadius: 8,
                      padding: "10px 12px", fontSize: 13, fontFamily: "inherit",
                      color: "#1e293b", outline: "none", background: "#fff",
                    }}
                  />
                </div>
              );
            })}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{
                display: "block", fontSize: 10, fontWeight: 700, color: "#94a3b8",
                textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6,
              }}>Deskripsi</label>
              <textarea
                value={config.description || ""}
                onChange={(e) => setConfig((p) => ({ ...p, description: e.target.value }))}
                rows={5}
                style={{
                  width: "100%", boxSizing: "border-box",
                  border: "1.5px solid #e8ecf0", borderRadius: 8,
                  padding: "10px 12px", fontSize: 13, fontFamily: "inherit",
                  color: "#1e293b", outline: "none", resize: "vertical", background: "#fff",
                }}
              />
            </div>
          </div>

          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "14px 16px", background: "#fff",
            border: "1.5px solid #e8ecf0", borderRadius: 10, marginBottom: 16,
          }}>
            <label style={{ position: "relative", width: 44, height: 24, flexShrink: 0, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={config.isOpen || false}
                onChange={(e) => setConfig((p) => ({ ...p, isOpen: e.target.checked }))}
                style={{ opacity: 0, width: 0, height: 0, position: "absolute" }}
              />
              <span style={{
                position: "absolute", inset: 0, borderRadius: 12,
                background: config.isOpen ? "#3b5bdb" : "#e2e8f0", transition: "background 0.2s",
              }} />
              <span style={{
                position: "absolute", top: 3, left: config.isOpen ? 22 : 3, width: 18, height: 18,
                background: "#fff", borderRadius: "50%", transition: "left 0.2s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
              }} />
            </label>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1e293b" }}>Buka Pendaftaran</p>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>
                {config.isOpen ? "Pendaftaran sedang dibuka" : "Pendaftaran ditutup"}
              </p>
            </div>
          </div>

          {(["poster", "banner"] as const).map((type) => {
            const urlKey = type === "poster" ? "posterUrl" : "bannerUrl";
            const label = type === "poster" ? "Upload Poster (Full)" : "Upload Banner (Home)";
            return (
              <div key={type} style={{
                padding: "16px", background: "#fff",
                border: "1.5px solid #e8ecf0", borderRadius: 10, marginBottom: 12,
              }}>
                <label style={{
                  display: "block", fontSize: 10, fontWeight: 700, color: "#94a3b8",
                  textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10,
                }}>{label}</label>
                {(config as Record<string, string>)[urlKey] && (
                  <div style={{ marginBottom: 10 }}>
                    <Image
                      src={(config as Record<string, string>)[urlKey]}
                      alt={type}
                      width={type === "poster" ? 160 : 240}
                      height={type === "poster" ? 220 : 120}
                      style={{ borderRadius: 8, objectFit: "cover", display: "block", maxWidth: "100%" }}
                    />
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <label style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "9px 16px", background: "#f8fafc",
                    border: "1.5px solid #e8ecf0", borderRadius: 7,
                    cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#475569", minHeight: 40,
                  }}>
                    <UploadIcon /> Pilih Gambar
                    <input
                      type="file" accept="image/*" style={{ display: "none" }}
                      onChange={(e) => e.target.files?.[0] && handleImageUpload(type, e.target.files[0])}
                    />
                  </label>
                  {(config as Record<string, string>)[urlKey] && (
                    <button
                      onClick={async () => { setConfig((p) => ({ ...p, [urlKey]: "" })); await updateRetreatConfig({ [urlKey]: "" }); }}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "9px 16px", background: "#fff5f5",
                        border: "1.5px solid #fecaca", borderRadius: 7,
                        cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#dc2626",
                        fontFamily: "inherit", minHeight: 40,
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                      </svg>
                      Hapus
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "12px 22px", borderRadius: 9,
                background: saving ? "#e8ecf0" : "#3b5bdb",
                color: saving ? "#94a3b8" : "#fff",
                border: "none", cursor: saving ? "not-allowed" : "pointer",
                fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                width: isMobile ? "100%" : undefined,
                justifyContent: isMobile ? "center" : undefined,
                minHeight: 44,
              }}
            >
              <SaveIcon />
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
            {saveMsg && (
              <span style={{ fontSize: 13, fontWeight: 600, color: "#16a34a", display: "flex", alignItems: "center", gap: 5 }}>
                <CheckIcon /> {saveMsg}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── QR SCANNER MODAL ── */}
      {showScanner && <QRScanner onScan={stableOnScan} onClose={() => setShowScanner(false)} />}

      {/* ── PAPER FORM SCANNER MODAL ── */}
      {showPaperScanner && (
        <PaperFormScanner
          apiKey={process.env.NEXT_PUBLIC_VISION_API_KEY!}
          onClose={() => setShowPaperScanner(false)}
          onSaved={async () => {
            const fresh = await getAllRegistrations();
            setRegistrations(fresh);
          }}
        />
      )}

      {/* ── SCAN RESULT POPUP ── */}
      {scannedReg && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "16px" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 360 }}>
            {scanMsg === "status belum di approve admin" ? (
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{ width: 72, height: 72, background: "#fef2f2", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                </div>
                <p style={{ margin: 0, fontWeight: 700, color: "#dc2626", fontSize: 15 }}>Belum Di-approve Admin</p>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "#94a3b8" }}>{scannedReg.members[0].namaLengkap}</p>
              </div>
            ) : (
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{ width: 72, height: 72, background: "#16a34a", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <p style={{ margin: 0, fontWeight: 800, color: "#16a34a", fontSize: 18, letterSpacing: "0.02em" }}>CHECKED IN</p>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {scannedReg.members.map((m, i) => (
                <div key={i} style={{ padding: "10px 14px", background: "#f8fafc", border: "1.5px solid #e8ecf0", borderRadius: 10 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#1e293b" }}>{m.namaLengkap}</p>
                  <p style={{ margin: "3px 0 0", fontSize: 12, color: "#94a3b8" }}>Kamar: {m.kamar || "N/A"} · Kaos: {m.ukuranKaos}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => { setScannedReg(null); setScanMsg(""); }}
              style={{ width: "100%", padding: "13px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* ── SCAN ERROR MODAL ── */}
      {scanError && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "16px" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 340, textAlign: "center" }}>
            <div style={{ width: 56, height: 56, background: "#fef2f2", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: 15, color: "#dc2626" }}>QR Tidak Ditemukan</p>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "#94a3b8" }}>{scanError}</p>
            <button onClick={() => setScanError("")} style={{ width: "100%", padding: "13px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>
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
          confirmLabel="Ya, Check In"
          confirmColor="#2563eb"
          onConfirm={() => handleCheckin(confirmCheckin)}
          onCancel={() => setConfirmCheckin(null)}
        />
      )}

      {/* ── PAYMENT PROOF MODAL ── */}
      {paymentProofUrl && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "16px" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column" }}>
            <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700, color: "#1e293b" }}>Bukti Pembayaran</h2>
            <Image
              src={paymentProofUrl}
              alt="Bukti pembayaran"
              width={500}
              height={600}
              style={{ width: "100%", maxHeight: "60vh", objectFit: "contain", borderRadius: 10, display: "block", marginBottom: 16 }}
            />
            <button
              onClick={() => setPaymentProofUrl(null)}
              style={{ width: "100%", padding: "13px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* ── EDIT MEMBER MODAL ── */}
      {editingRegId !== null && editingMemberIdx !== null && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "16px" }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 400, maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column" }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700, color: "#1e293b" }}>Edit Informasi Peserta</h2>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Nama Lengkap</label>
              <input type="text" value={editFormData.namaLengkap} onChange={(e) => setEditFormData((p) => ({ ...p, namaLengkap: e.target.value }))}
                style={{ width: "100%", boxSizing: "border-box", border: "1.5px solid #e8ecf0", borderRadius: 8, padding: "10px 12px", fontSize: 13, fontFamily: "inherit", color: "#1e293b", outline: "none", background: "#fff" }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Nomor Telepon</label>
              <input type="text" value={editFormData.nomorTelpon} onChange={(e) => setEditFormData((p) => ({ ...p, nomorTelpon: e.target.value }))}
                style={{ width: "100%", boxSizing: "border-box", border: "1.5px solid #e8ecf0", borderRadius: 8, padding: "10px 12px", fontSize: 13, fontFamily: "inherit", color: "#1e293b", outline: "none", background: "#fff" }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Ukuran Kaos</label>
              <select value={editFormData.ukuranKaos} onChange={(e) => setEditFormData((p) => ({ ...p, ukuranKaos: e.target.value as RetreatRegistration["members"][0]["ukuranKaos"] }))}
                style={{ width: "100%", boxSizing: "border-box", border: "1.5px solid #e8ecf0", borderRadius: 8, padding: "10px 12px", fontSize: 13, fontFamily: "inherit", color: "#1e293b", outline: "none", background: "#fff", cursor: "pointer" }}
              >
                <option value="S">S</option><option value="M">M</option><option value="L">L</option>
                <option value="XL">XL</option><option value="XXL">XXL</option>
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Transportasi</label>
              <select value={editFormData.transportasi} onChange={(e) => setEditFormData((p) => ({ ...p, transportasi: e.target.value as RetreatRegistration["members"][0]["transportasi"] }))}
                style={{ width: "100%", boxSizing: "border-box", border: "1.5px solid #e8ecf0", borderRadius: 8, padding: "10px 12px", fontSize: 13, fontFamily: "inherit", color: "#1e293b", outline: "none", background: "#fff", cursor: "pointer" }}
              >
                <option value="bus">Bus</option><option value="mobil_sendiri">Mobil Sendiri</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={closeEditMember} style={{ flex: 1, padding: "13px", background: "#f1f5f9", color: "#475569", border: "1.5px solid #e2e8f0", borderRadius: 10, fontWeight: 700, fontSize: 13, fontFamily: "inherit", cursor: "pointer", minHeight: 48 }}>
                Batal
              </button>
              <button onClick={handleSaveEditMember} style={{ flex: 1, padding: "13px", background: "#3b5bdb", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, fontFamily: "inherit", cursor: "pointer", minHeight: 48 }}>
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MERGE CONFIRMATION MODAL ── */}
      {showMergeModal && mergeSelected.length === 2 && (() => {
        const regA = registrations.find((r) => r.id === mergeSelected[0])!;
        const regB = registrations.find((r) => r.id === mergeSelected[1])!;
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "16px" }}>
            <div style={{ background: "#fff", borderRadius: 18, padding: 24, width: "100%", maxWidth: 420, maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column" }}>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 800, color: "#1e293b" }}>
                  Gabungkan Pendaftaran
                </h2>
                <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>
                  Pilih siapa pendaftar utama. Semua anggota akan digabung di bawah nama tersebut.
                </p>
              </div>

              <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Pilih Pendaftar Utama
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                {[regA, regB].map((reg) => {
                  const isMain = mergeMainId === reg.id;
                  const { color, initials } = getAvatar(reg.members[0].namaLengkap);
                  return (
                    <button
                      key={reg.id}
                      onClick={() => setMergeMainId(reg.id!)}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "14px", borderRadius: 12, cursor: "pointer",
                        border: isMain ? "2px solid #ea580c" : "1.5px solid #e8ecf0",
                        background: isMain ? "#fff7ed" : "#f8fafc",
                        textAlign: "left", fontFamily: "inherit",
                        transition: "all 0.15s",
                      }}
                    >
                      <div style={{
                        width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                        border: isMain ? "6px solid #ea580c" : "2px solid #cbd5e1",
                        background: "#fff", transition: "all 0.15s",
                      }} />
                      <div style={{
                        width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                        background: color, display: "flex", alignItems: "center",
                        justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 800,
                      }}>
                        {initials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1e293b" }}>
                          {reg.members[0].namaLengkap}
                        </p>
                        <p style={{ margin: "3px 0 0", fontSize: 12, color: "#94a3b8" }}>
                          {reg.members.length} anggota · {reg.members[0].nomorTelpon}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {mergeMainId && (() => {
                const mainReg = registrations.find((r) => r.id === mergeMainId)!;
                const secId = mergeSelected.find((id) => id !== mergeMainId)!;
                const secReg = registrations.find((r) => r.id === secId)!;
                const allMembers = [...mainReg.members, ...secReg.members];
                return (
                  <div style={{ padding: "14px", background: "#f8fafc", border: "1.5px solid #e8ecf0", borderRadius: 10, marginBottom: 20 }}>
                    <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Preview Hasil ({allMembers.length} anggota)
                    </p>
                    {allMembers.map((m, i) => (
                      <div key={i} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 0",
                        borderBottom: i < allMembers.length - 1 ? "1px solid #e8ecf0" : "none",
                      }}>
                        <span style={{
                          fontSize: 10, fontWeight: 700,
                          background: i === 0 ? "#fff7ed" : "#f1f5f9",
                          color: i === 0 ? "#ea580c" : "#94a3b8",
                          padding: "2px 8px", borderRadius: 10, flexShrink: 0,
                        }}>
                          {i === 0 ? "UTAMA" : `#${i + 1}`}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", flex: 1 }}>{m.namaLengkap}</span>
                        <span style={{ fontSize: 11, color: "#94a3b8" }}>Kaos {m.ukuranKaos}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => { setShowMergeModal(false); setMergeMainId(null); }}
                  disabled={mergeSaving}
                  style={{
                    flex: 1, padding: "13px", background: "#f1f5f9", color: "#475569",
                    border: "1.5px solid #e2e8f0", borderRadius: 10,
                    fontWeight: 700, fontSize: 13, fontFamily: "inherit", cursor: "pointer", minHeight: 48,
                  }}
                >
                  Batal
                </button>
                <button
                  onClick={handleMerge}
                  disabled={!mergeMainId || mergeSaving}
                  style={{
                    flex: 1, padding: "13px",
                    background: !mergeMainId || mergeSaving ? "#e8ecf0" : "#ea580c",
                    color: !mergeMainId || mergeSaving ? "#94a3b8" : "#fff",
                    border: "none", borderRadius: 10,
                    fontWeight: 700, fontSize: 13, fontFamily: "inherit",
                    cursor: !mergeMainId || mergeSaving ? "not-allowed" : "pointer",
                    minHeight: 48, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}
                >
                  <MergeIcon />
                  {mergeSaving ? "Menggabungkan..." : "Gabungkan"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Generic confirmation popup ─────────────────────────────────────────────────
function ConfirmPopup({
  message, onConfirm, onCancel,
  confirmLabel = "Ya, Lanjutkan",
  confirmColor = "#16a34a",
}: {
  message: string; onConfirm: () => void; onCancel: () => void;
  confirmLabel?: string; confirmColor?: string;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "16px" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 340, textAlign: "center" }}>
        <p style={{ margin: "0 0 20px", fontWeight: 700, fontSize: 15, color: "#1e293b" }}>{message}</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "13px", background: "#f1f5f9", color: "#475569", border: "1.5px solid #e2e8f0", borderRadius: 10, fontWeight: 700, fontSize: 13, fontFamily: "inherit", cursor: "pointer", minHeight: 48 }}>
            Batal
          </button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "13px", background: confirmColor, color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, fontFamily: "inherit", cursor: "pointer", minHeight: 48 }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}