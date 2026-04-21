// components/retreat/AdminRetreat.tsx
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
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRef } from "react";
const QRScanner = dynamic(() => import("./QRScanner"), { ssr: false });

type AdminTab = "list" | "details";

// colors
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

  // Scanner
  const [showScanner, setShowScanner] = useState(false);
  const [scannedReg, setScannedReg] = useState<RetreatRegistration | null>(null);
  const [scanMsg, setScanMsg] = useState("");
  const [scanError, setScanError] = useState("");

  // Confirmation popups
  const [confirmApprove, setConfirmApprove] = useState<string | null>(null);
  const [confirmCheckin, setConfirmCheckin] = useState<string | null>(null);

  useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        // Force token refresh to ensure latest claims are included
        await user.getIdToken(true);
        const [cfg, regs] = await Promise.all([
          getRetreatConfig(),
          getAllRegistrations()
        ]);
        setConfig(cfg || {});
        setRegistrations(regs);
      } catch (err) {
        console.error("Error fetching data:", err);
        alert("Fetch failed: " + String(err)); // testing bentar
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
    // Find the updated registration and show the result popup
    const updatedReg = registrations.find((r) => r.id === id);
    if (updatedReg) {
      const updated = { ...updatedReg, status: "checked_in" as const };
      setScannedReg(updated);
      setScanMsg(""); // Clear any previous scan message
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
      {/* ── Tab Toggle ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{
          display: "flex", gap: 4, background: "#ffffff",
          borderRadius: 10, border: "1.5px solid #e8ecf0", padding: 5, width: "fit-content",
        }}>
          {(["list", "details"] as AdminTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "7px 20px", borderRadius: 7, border: "none", cursor: "pointer",
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

        {/* Scan button — only on list tab */}
        {tab === "list" && (
          <button
            onClick={() => { setShowScanner(true); setScanMsg(""); setScannedReg(null); }}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 8, border: "1.5px solid #c7d2fe",
              background: "#eff3ff", color: "#3b5bdb",
              fontSize: 13, fontWeight: 700, fontFamily: "inherit", cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#3b5bdb"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "#3b5bdb"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#eff3ff"; e.currentTarget.style.color = "#3b5bdb"; e.currentTarget.style.borderColor = "#c7d2fe"; }}
          >
            <ScanIcon />
            Scan QR
          </button>
        )}
      </div>

      {/* ── TAB: REGISTRATION LIST ── */}
      {tab === "list" && (
        <div>
          {/* Count badge */}
          {registrations.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              <span style={{ background: "#eff3ff", color: "#3b5bdb", fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>
                {registrations.length} total registrasi
              </span>
              <span style={{ background: "#fefce8", color: "#ca8a04", fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>
                {registrations.filter(r => r.status === "registered").length} menunggu approval
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

                return (
                  <div key={reg.id}>
                    {/* Main row */}
                    <div
                      style={{
                        display: "flex", alignItems: "center", gap: 14,
                        padding: "14px 16px",
                        border: "1.5px solid #e8ecf0",
                        borderRadius: isExpanded ? "10px 10px 0 0" : 10,
                        background: "#fff", transition: "border-color 0.15s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = "#c7d2fe")}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = "#e8ecf0")}
                    >
                      {/* Avatar */}
                      <div style={{
                        width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                        background: color, display: "flex", alignItems: "center",
                        justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 800,
                      }}>
                        {initials}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {main.namaLengkap}
                        </p>
                        <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {reg.email} | {main.nomorTelpon}
                        </p>
                      </div>

                      {/* <div> */}
                        {/* <label style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>
                            Kamar Peserta Utama
                        </label> */}
                        <div style={{ display: "flex", alignItems: "center", gap: 5, background: "#f1f5f9", borderRadius: 6, padding: "6px 10px", width: "fit-content" }}>
                            <span style={{ color: "#64748b" }}><BedIcon /></span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8" }}>({getRoomCapacity(main.tipeKamar)})</span>
                            {/* <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>Kamar:</span> */}
                            <input
                            type="text"
                            placeholder="N/A"
                            defaultValue={main.kamar}
                            onBlur={(e) => handleRoomChange(reg.id!, 0, e.target.value, reg.members)}
                            style={{
                                border: "1.5px solid #e8ecf0", borderRadius: 6,
                                padding: "3px 8px", fontSize: 12, width: 72,
                                fontFamily: "inherit", outline: "none",
                                transition: "border-color 0.15s",
                            }}
                            onFocus={e => (e.currentTarget.style.borderColor = "#c7d2fe")}
                            onBlurCapture={e => (e.currentTarget.style.borderColor = "#e8ecf0")}
                            />
                        </div>
                        {/* </div> */}

                      {/* Transport badge */}
                      <div style={{
                        flexShrink: 0, display: "flex", alignItems: "center", gap: 5,
                        background: "#f1f5f9", borderRadius: 6, padding: "5px 10px",
                      }}>
                        <span style={{ color: "#64748b" }}><BusIcon /></span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#475569", whiteSpace: "nowrap" }}>
                          {main.transportasi === "bus" ? "Bus" : "Mobil"}
                        </span>
                      </div>

                      {/* Kaos badge */}
                      <div style={{
                        flexShrink: 0, background: "#f8fafc", borderRadius: 6,
                        padding: "5px 10px", fontSize: 12, fontWeight: 600, color: "#475569",
                        whiteSpace: "nowrap",
                      }}>
                        Kaos {main.ukuranKaos}
                      </div>

                      {/* Status badge */}
                      <div style={{
                        flexShrink: 0, fontSize: 11, fontWeight: 700,
                        background: statusStyle.bg, color: statusStyle.color,
                        border: `1.5px solid ${statusStyle.border}`,
                        padding: "4px 10px", borderRadius: 20,
                        whiteSpace: "nowrap", letterSpacing: "0.02em",
                      }}>
                        {getStatusLabel(reg.status)}
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        {reg.status === "registered" && (
                          <button
                            onClick={() => setConfirmApprove(reg.id!)}
                            style={{
                              display: "flex", alignItems: "center", gap: 5,
                              padding: "7px 14px", background: "#f0fdf4", color: "#16a34a",
                              border: "1.5px solid #bbf7d0", borderRadius: 7,
                              cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit",
                              transition: "all 0.15s",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = "#16a34a"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "#16a34a"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "#f0fdf4"; e.currentTarget.style.color = "#16a34a"; e.currentTarget.style.borderColor = "#bbf7d0"; }}
                          >
                            <CheckIcon /> Approve
                          </button>
                        )}
                        {reg.status === "approved" && (
                          <button
                            onClick={() => setConfirmCheckin(reg.id!)}
                            style={{
                              display: "flex", alignItems: "center", gap: 5,
                              padding: "7px 14px", background: "#eff6ff", color: "#2563eb",
                              border: "1.5px solid #bfdbfe", borderRadius: 7,
                              cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit",
                              transition: "all 0.15s",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = "#2563eb"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "#2563eb"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.color = "#2563eb"; e.currentTarget.style.borderColor = "#bfdbfe"; }}
                          >
                            <CheckIcon /> Check In
                          </button>
                        )}
                        {reg.status === "checked_in" && (
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#16a34a", display: "flex", alignItems: "center", gap: 5 }}>
                            <CheckIcon /> Hadir
                          </span>
                        )}
                      </div>

                      {/* Expand toggle */}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : reg.id!)}
                        style={{
                          flexShrink: 0, width: 30, height: 30, borderRadius: 7,
                          border: "1.5px solid #e8ecf0", background: "#f8fafc",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: "pointer", color: "#94a3b8",
                          transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                          transition: "transform 0.15s",
                        }}
                      >
                        <ChevronDownIcon />
                      </button>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div style={{
                        padding: "16px", background: "#f8fafc",
                        borderLeft: "1.5px solid #e8ecf0",
                        borderRight: "1.5px solid #e8ecf0",
                        borderBottom: "1.5px solid #e8ecf0",
                        borderRadius: "0 0 10px 10px",
                      }}>
                        {/* Sub-members */}
                        {subs.length > 0 && (
                          <div style={{ marginBottom: 16 }}>
                            <label style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>
                              Peserta Lain ({subs.length})
                            </label>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              {subs.map((s, idx) => (
                                <div key={idx} style={{
                                  padding: "12px", background: "#fff",
                                  border: "1.5px solid #e8ecf0", borderRadius: 8,
                                  fontSize: 12, color: "#475569",gap: 12,
                                }}>
                                  {/* Row 1: Name, Relationship, Shirt Size, Transport */}
                                  <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        marginBottom: -5,
                                        gap: 12,
                                        flexWrap: "wrap",
                                    }}
                                    >
                                    {/* --- */}

                                    <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        marginBottom: 8,
                                        gap: 12,
                                        flexWrap: "wrap",
                                    }}
                                    >
                                    {/* LEFT SIDE */}
                                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                        {/* Name */}
                                        <span style={{ fontWeight: 700, color: "#1e293b" }}>
                                        {s.namaLengkap}
                                        </span>

                                        {/* Divider */}
                                        <span style={{ color: "#e2e8f0" }}>|</span>

                                        {/* Phone */}
                                        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#64748b" }}>
                                        <span style={{ fontWeight: 600 }}>Telp:</span>
                                        <span>{s.nomorTelpon || "-"}</span>
                                        </div>

                                        {/* Divider */}
                                        <span style={{ color: "#e2e8f0" }}>|</span>

                                        {/* Kamar */}
                                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                        <span style={{ color: "#94a3b8" }}>
                                            <BedIcon />
                                        </span>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8" }}>({getRoomCapacity(s.tipeKamar)})</span>
                                        <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
                                            Kamar:
                                        </span>
                                        <input
                                            type="text"
                                            placeholder="N/A"
                                            defaultValue={s.kamar}
                                            onBlur={(e) => {
                                            const memberIdx = reg.members.findIndex((m) => m === s);
                                            if (memberIdx !== -1) {
                                                handleRoomChange(reg.id!, memberIdx, e.target.value, reg.members);
                                            }
                                            }}
                                            style={{
                                            border: "1.5px solid #e8ecf0",
                                            borderRadius: 6,
                                            padding: "3px 8px",
                                            fontSize: 12,
                                            width: 72,
                                            fontFamily: "inherit",
                                            outline: "none",
                                            transition: "border-color 0.15s",
                                            }}
                                            onFocus={(e) => (e.currentTarget.style.borderColor = "#c7d2fe")}
                                            onBlurCapture={(e) => (e.currentTarget.style.borderColor = "#e8ecf0")}
                                        />
                                        </div>
                                    </div>

                                    {/* RIGHT SIDE */}
                                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                        <span style={badgeStyle}>{s.relasi}</span>
                                        <span style={badgeStyle}>Kaos {s.ukuranKaos}</span>
                                        <span style={badgeStyle}>
                                        {s.transportasi === "bus" ? "Bus" : "Mobil"}
                                        </span>
                                    </div>
                                    </div>
                            </div>
                                  
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Phone only (if no sub-members) */}
                        {subs.length === 0 && (
                          <div>
                            {/* <label style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                              No. Telp
                            </label>
                            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#1e293b", fontWeight: 500 }}>{main.nomorTelpon}</p> */}
                            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8", fontWeight: 500 }}>Hanya ada satu nama dalam pendaftaran ini.</p>
                          </div>
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            {(["title", "theme", "date", "location", "bankName", "bankAccount", "bankHolder"] as const).map((field) => {
              const isWide = ["title"].includes(field);
              return (
                <div key={field} style={{ gridColumn: isWide ? "1 / -1" : undefined }}>
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
                      padding: "9px 12px", fontSize: 13, fontFamily: "inherit",
                      color: "#1e293b", outline: "none", transition: "border-color 0.15s",
                      background: "#fff",
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = "#c7d2fe")}
                    onBlur={e => (e.currentTarget.style.borderColor = "#e8ecf0")}
                  />
                </div>
              );
            })}

            {/* Description */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                Deskripsi
              </label>
              <textarea
                value={config.description || ""}
                onChange={(e) => setConfig((p) => ({ ...p, description: e.target.value }))}
                rows={5}
                style={{
                  width: "100%", boxSizing: "border-box",
                  border: "1.5px solid #e8ecf0", borderRadius: 8,
                  padding: "9px 12px", fontSize: 13, fontFamily: "inherit",
                  color: "#1e293b", outline: "none", resize: "vertical",
                  transition: "border-color 0.15s", background: "#fff",
                }}
                onFocus={e => (e.currentTarget.style.borderColor = "#c7d2fe")}
                onBlur={e => (e.currentTarget.style.borderColor = "#e8ecf0")}
              />
            </div>
          </div>

          {/* Toggle registration */}
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 16px", background: "#fff",
            border: "1.5px solid #e8ecf0", borderRadius: 10, marginBottom: 16,
          }}>
            <label style={{ position: "relative", width: 40, height: 22, flexShrink: 0, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={config.isOpen || false}
                onChange={(e) => setConfig((p) => ({ ...p, isOpen: e.target.checked }))}
                style={{ opacity: 0, width: 0, height: 0, position: "absolute" }}
              />
              <span style={{
                position: "absolute", inset: 0, borderRadius: 11,
                background: config.isOpen ? "#3b5bdb" : "#e2e8f0",
                transition: "background 0.2s",
              }} />
              <span style={{
                position: "absolute", top: 3, left: config.isOpen ? 21 : 3, width: 16, height: 16,
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

          {/* Image uploads */}
          {(["poster", "banner"] as const).map((type) => {
            const urlKey = type === "poster" ? "posterUrl" : "bannerUrl";
            const label = type === "poster" ? "Upload Poster (Full)" : "Upload Banner (Home)";
            return (
              <div key={type} style={{
                padding: "16px", background: "#fff",
                border: "1.5px solid #e8ecf0", borderRadius: 10, marginBottom: 12,
              }}>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                  {label}
                </label>
                {(config as Record<string, string>)[urlKey] && (
                  <div style={{ marginBottom: 10 }}>
                    <Image
                      src={(config as Record<string, string>)[urlKey]}
                      alt={type}
                      width={type === "poster" ? 160 : 240}
                      height={type === "poster" ? 220 : 120}
                      style={{ borderRadius: 8, objectFit: "cover", display: "block" }}
                    />
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <label style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "7px 14px", background: "#f8fafc",
                    border: "1.5px solid #e8ecf0", borderRadius: 7,
                    cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#475569",
                    transition: "all 0.15s",
                  }}>
                    <UploadIcon />
                    Pilih Gambar
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => e.target.files?.[0] && handleImageUpload(type, e.target.files[0])}
                    />
                  </label>
                  {(config as Record<string, string>)[urlKey] && (
                    <button
                      onClick={async () => {
                        setConfig((p) => ({ ...p, [urlKey]: "" }));
                        await updateRetreatConfig({ [urlKey]: "" });
                      }}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "7px 14px", background: "#fff5f5",
                        border: "1.5px solid #fecaca", borderRadius: 7,
                        cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#dc2626",
                        fontFamily: "inherit", transition: "all 0.15s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = "#dc2626"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "#dc2626"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "#fff5f5"; e.currentTarget.style.color = "#dc2626"; e.currentTarget.style.borderColor = "#fecaca"; }}
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

          {/* Save button */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "10px 22px", borderRadius: 9,
                background: saving ? "#e8ecf0" : "#3b5bdb",
                color: saving ? "#94a3b8" : "#fff",
                border: "none", cursor: saving ? "not-allowed" : "pointer",
                fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { if (!saving) e.currentTarget.style.background = "#2f4fc4"; }}
              onMouseLeave={e => { if (!saving) e.currentTarget.style.background = "#3b5bdb"; }}
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

      {/* ── SCANNER MODAL ── */}
      {showScanner && (
        <QRScanner onScan={stableOnScan} onClose={() => setShowScanner(false)} />
      )}

      {/* ── SCAN RESULT POPUP ── */}
      {scannedReg && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 360, margin: "0 16px" }}>
            {scanMsg === "status belum di approve admin" ? (
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div style={{ width: 72, height: 72, background: "#fef2f2", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 28 }}>⚠️</div>
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
              style={{
                width: "100%", padding: "11px", background: "#f1f5f9",
                color: "#475569", border: "none", borderRadius: 10,
                fontWeight: 700, fontSize: 13, fontFamily: "inherit", cursor: "pointer",
              }}
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* ── SCAN ERROR MODAL ── */}
      {scanError && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 340, margin: "0 16px", textAlign: "center" }}>
            <div style={{ width: 56, height: 56, background: "#fef2f2", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: 24 }}>🔍</div>
            <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: 15, color: "#dc2626" }}>QR Tidak Ditemukan</p>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "#94a3b8" }}>{scanError}</p>
            <button
              onClick={() => setScanError("")}
              style={{ width: "100%", padding: "11px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}
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
          confirmLabel="Ya, Check In"
          confirmColor="#2563eb"
          onConfirm={() => handleCheckin(confirmCheckin)}
          onCancel={() => setConfirmCheckin(null)}
        />
      )}
    </div>
  );
}

// ── Generic confirmation popup ─────────────────────────────────────────────────
function ConfirmPopup({
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Ya, Lanjutkan",
  confirmColor = "#16a34a",
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  confirmColor?: string;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 340, margin: "0 16px", textAlign: "center" }}>
        <p style={{ margin: "0 0 20px", fontWeight: 700, fontSize: 15, color: "#1e293b" }}>{message}</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: "11px", background: "#f1f5f9", color: "#475569",
              border: "1.5px solid #e2e8f0", borderRadius: 10,
              fontWeight: 700, fontSize: 13, fontFamily: "inherit", cursor: "pointer",
            }}
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: "11px", background: confirmColor, color: "#fff",
              border: "none", borderRadius: 10,
              fontWeight: 700, fontSize: 13, fontFamily: "inherit", cursor: "pointer",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}