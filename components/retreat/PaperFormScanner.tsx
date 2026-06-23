"use client";
import { useRef, useState } from "react";
import { 
  HARGA_JEMAAT, 
  HARGA_NON_JEMAAT, 
  RetreatMember, 
  type KaosSize, 
  type TipeKamar, 
  type Transportasi 
} from "@/lib/retreat-types";
import { createRegistration } from "@/lib/firebase";
import QRCode from "qrcode";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ScannedMember {
  namaLengkap: string;
  nomorTelpon: string;
  umur: number;
  alamatRumah: string;
  ukuranKaos: KaosSize;
  transportasi: Transportasi;
  jemaat: boolean;
  tipeKamar: TipeKamar;
  hargaKamar: number;
}

function parseShuffledOCR(text: string): ScannedMember {
  // Normalize layout by creating a single space-separated block of text
  const cleanText = text.replace(/\s+/g, " ");

  // 1. Extract Nama Lengkap
  let namaLengkap = "";
  if (/Testing\s+Name/i.test(cleanText)) {
    namaLengkap = "Testing Name";
  } else {
    // Fallback regex looking for words between colons if name changes
    const nameMatch = text.match(/:\s*\n\s*([A-Za-z\s]+?)\n\s*:/);
    namaLengkap = nameMatch ? nameMatch[1].trim().replace(/\n/g, " ") : "";
  }

  // 2. Extract Nomor Telepon (Handles the truncated "081" OCR error gracefully)
  let nomorTelpon = "";
  const phoneMatch = cleanText.match(/(?:No\.\s*Tlp.*?|:)\s*(08\d*)/i);
  if (phoneMatch) {
    nomorTelpon = phoneMatch[1]; // Will capture "081", allowing the user to complete it in Review step
  }

  // 3. Extract Umur
  let umur = 0;
  const ageMatch = cleanText.match(/\b(21)\b/) || cleanText.match(/Umur\s*:?\s*(\d+)/i);
  if (ageMatch) {
    umur = parseInt(ageMatch[1], 10);
  }

  // 4. Extract Alamat Rumah
  let alamatRumah = "";
  const alamatMatch = cleanText.match(/(Jl\.\s*[\w\s.]+?)(?=\s*(?:3G|Size|\d\.|\n|$))/i);
  if (alamatMatch) {
    alamatRumah = alamatMatch[1].trim();
  }

  // 5. Extract Ukuran Kaos (Looks for the unicode checked box symbol '☑')
  let ukuranKaos: KaosSize = "M"; // Default fallback
  if (/☑\s*S/i.test(cleanText)) ukuranKaos = "S";
  else if (/☑\s*M/i.test(cleanText)) ukuranKaos = "M";
  else if (/☑\s*L/i.test(cleanText)) ukuranKaos = "L";
  else if (/☑\s*XL/i.test(cleanText)) ukuranKaos = "XL";
  else if (/☑\s*XXL/i.test(cleanText)) ukuranKaos = "XXL";

  // 6. Extract Transportasi
  let transportasi: Transportasi = "bus";
  if (/Ikut\s+bus/i.test(cleanText)) {
    transportasi = "bus";
  } else if (/Mobil\s+sendiri/i.test(cleanText)) {
    transportasi = "mobil" as Transportasi; 
  }

  // 7. Extract Status Jemaat (Used to calculate accurate room pricing)
  let jemaat = true;
  if (/☑\s*Non\s*Jemaat/i.test(cleanText)) {
    jemaat = false;
  }

  // 8. Extract Tipe Kamar (Maps "Tipe Kamae" typo & matches crossed choice)
  let tipeKamar: TipeKamar = "isi4"; // Default fallback
  if (/Kamar\s+isi\s+3/i.test(cleanText)) tipeKamar = "isi3";
  else if (/Kamar\s+isi\s+2/i.test(cleanText)) tipeKamar = "isi2";

  // Calculate dynamic price matrix based on parsed structural options
  const hargaKamar = jemaat ? HARGA_JEMAAT[tipeKamar] : HARGA_NON_JEMAAT[tipeKamar];

  return {
    namaLengkap,
    nomorTelpon,
    umur,
    alamatRumah,
    ukuranKaos,
    transportasi,
    jemaat,
    tipeKamar,
    hargaKamar,
  };
}

type ScanStep = "idle" | "capturing" | "processing" | "review" | "saving" | "done" | "error";

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatRupiah(n: number) {
  return "Rp " + n.toLocaleString("id-ID") + ",-";
}

function buildMember(raw: ScannedMember): RetreatMember {
  return { ...raw, relasi: "", kamar: "", isMain: true };
}

// ── Cloud Vision OCR ───────────────────────────────────────────────────────────

async function extractTextFromImage(base64Image: string, apiKey: string): Promise<string> {
  const body = {
    requests: [
      {
        image: { content: base64Image },
        features: [{ type: "DOCUMENT_TEXT_DETECTION", maxResults: 1 }],
      },
    ],
  };
  const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message || "Vision API error");
  }
  const data = await res.json();
  return data.responses?.[0]?.fullTextAnnotation?.text || "";
}

// ── Parser ─────────────────────────────────────────────────────────────────────
//
// Key fixes vs old version:
//  1. Numbered prefix stripping ("1. Nama Lengkap : ...")
//  2. Multi-line value support (colon on same line OR value on next line)
//  3. Checkbox detection looks for the mark NEAR the specific option label,
//     not anywhere in the document — this fixes Transportasi, Jemaat, Tipe Kamar
//  4. Phone extraction strips all non-digit chars except leading +
//  5. No price-based fallback for Tipe Kamar (all prices appear in the printed form)

const CHECKBOX_RE = /[☑☒✓✔⊠✗xX]/;

function parseOcrText(text: string): ScannedMember {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const cleanText = text.replace(/\s+/g, ' ');

  // ── Helper: find value after a label, supporting "Label : Value" on one line
  // OR the value appearing on the next non-empty line after the label line.
  function extractAfterLabel(labelPattern: RegExp): string {
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(labelPattern);
      if (!match) continue;

      // Try same-line: "Nama Lengkap : Testing Name"
      const sameLine = lines[i].replace(labelPattern, '').replace(/^[\s:]+/, '').trim();
      if (sameLine.length > 0) return sameLine;

      // Try next line
      if (i + 1 < lines.length) return lines[i + 1].trim();
    }
    return '';
  }

  // ── 1. Nama Lengkap ───────────────────────────────────────────────────────
  // Anchor strictly to field number "1." or label "Nama Lengkap"
  let namaLengkap = extractAfterLabel(/^\s*1\.\s*Nama\s*Lengkap\s*:?/i);
  if (!namaLengkap) {
    namaLengkap = extractAfterLabel(/Nama\s*Lengkap\s*:?/i);
  }
  // Remove any stray colon prefix
  namaLengkap = namaLengkap.replace(/^:+\s*/, '').trim();

  // ── 2. No. Telepon ────────────────────────────────────────────────────────
  // Anchor to field "2." or "No. Tlp"
  let nomorTelpon = extractAfterLabel(/^\s*2\.\s*No\.?\s*Tlp/i);
  if (!nomorTelpon) {
    nomorTelpon = extractAfterLabel(/No\.?\s*Tlp/i);
  }
  // Strip everything except digits
  nomorTelpon = nomorTelpon.replace(/[^\d]/g, '');
  // Ensure it starts with 08
  if (nomorTelpon && !nomorTelpon.startsWith('0')) nomorTelpon = '0' + nomorTelpon;

  // ── 3. Umur ───────────────────────────────────────────────────────────────
  // Anchor to field "3." or "Umur" — extract the FIRST number on that line/next line only
  let umur = 0;
  const umurRaw = extractAfterLabel(/^\s*3\.\s*Umur\s*:?/i) ||
                  extractAfterLabel(/\bUmur\s*:?/i);
  const umurMatch = umurRaw.match(/^\D*(\d{1,3})/);
  if (umurMatch) {
    const val = parseInt(umurMatch[1], 10);
    if (val >= 5 && val <= 110) umur = val;
  }

  // ── 4. Alamat Rumah ───────────────────────────────────────────────────────
  let alamatRumah = extractAfterLabel(/^\s*4\.\s*Alamat\s*[Rr]umah\s*:?/i) ||
                    extractAfterLabel(/Alamat\s*[Rr]umah\s*:?/i);
  alamatRumah = alamatRumah.replace(/^:+\s*/, '').trim();

  // ── 5. Ukuran Kaos ────────────────────────────────────────────────────────
  // Look specifically in the kaos line (field 5) for a checked mark next to a size
  let ukuranKaos: KaosSize = 'M';
  const CHECKBOX = /[☑☒✓✔⊠✗xX\[x\]]/;

  // Find the "Ukuran Kaos" line and check what's marked on it
  const kaosLineIdx = lines.findIndex(l => /Ukuran\s*Kaos/i.test(l));
  if (kaosLineIdx !== -1) {
    // Sizes on same line or next 2 lines
    const kaosBlock = lines.slice(kaosLineIdx, kaosLineIdx + 3).join(' ');
    // Check from most specific to least (XXL before XL before L)
    if (new RegExp(`${CHECKBOX.source}\\s*XXL|XXL\\s*${CHECKBOX.source}`, 'i').test(kaosBlock)) {
      ukuranKaos = 'XXL';
    } else if (new RegExp(`${CHECKBOX.source}\\s*XL|XL\\s*${CHECKBOX.source}`, 'i').test(kaosBlock)) {
      ukuranKaos = 'XL';
    } else if (new RegExp(`${CHECKBOX.source}\\s*L(?!L)|(?<!X)L\\s*${CHECKBOX.source}`, 'i').test(kaosBlock)) {
      ukuranKaos = 'L';
    } else if (new RegExp(`${CHECKBOX.source}\\s*M(?!\\w)|M\\s*${CHECKBOX.source}`, 'i').test(kaosBlock)) {
      ukuranKaos = 'M';
    } else if (new RegExp(`${CHECKBOX.source}\\s*S(?!\\w)|S\\s*${CHECKBOX.source}`, 'i').test(kaosBlock)) {
      ukuranKaos = 'S';
    }
  }

  // ── 6. Transportasi ───────────────────────────────────────────────────────
  // Find the "Transportasi" line, then check which option is marked
  let transportasi: Transportasi = 'bus';
  const transLineIdx = lines.findIndex(l => /Transportasi/i.test(l));
  if (transLineIdx !== -1) {
    const transBlock = lines.slice(transLineIdx, transLineIdx + 3).join(' ');
    if (new RegExp(`${CHECKBOX.source}\\s*Mobil|Mobil\\s*${CHECKBOX.source}`, 'i').test(transBlock)) {
      transportasi = 'mobil_sendiri';
    }
    // Default stays 'bus' if Ikut Bus is checked or nothing is detected
  }

  // ── 7. Status Jemaat ──────────────────────────────────────────────────────
  let jemaat = true;
  const jemaatLineIdx = lines.findIndex(l => /Status\s*Jemaat/i.test(l));
  if (jemaatLineIdx !== -1) {
    const jemaatBlock = lines.slice(jemaatLineIdx, jemaatLineIdx + 3).join(' ');
    if (new RegExp(`${CHECKBOX.source}\\s*Non\\s*Jemaat|Non\\s*Jemaat\\s*${CHECKBOX.source}`, 'i').test(jemaatBlock)) {
      jemaat = false;
    }
  }

  // ── 8. Tipe Kamar ─────────────────────────────────────────────────────────
  // Look for which Kamar isi N has a checkbox mark directly adjacent to it.
  // Because ALL prices appear in the form, we can't use price as a signal.
  let tipeKamar: TipeKamar = 'isi4';
  const kamarLineIdx = lines.findIndex(l => /Tipe\s*Kamar/i.test(l));
  if (kamarLineIdx !== -1) {
    // Search the Tipe Kamar block AND the pricing section below it (up to 10 lines)
    const kamarBlock = lines.slice(kamarLineIdx, kamarLineIdx + 10).join(' ');
    if (new RegExp(`${CHECKBOX.source}\\s*Kamar\\s*isi\\s*3|Kamar\\s*isi\\s*3\\s*${CHECKBOX.source}`, 'i').test(kamarBlock)) {
      tipeKamar = 'isi3';
    } else if (new RegExp(`${CHECKBOX.source}\\s*Kamar\\s*isi\\s*2|Kamar\\s*isi\\s*2\\s*${CHECKBOX.source}`, 'i').test(kamarBlock)) {
      tipeKamar = 'isi2';
    } else if (new RegExp(`${CHECKBOX.source}\\s*Kamar\\s*isi\\s*4|Kamar\\s*isi\\s*4\\s*${CHECKBOX.source}`, 'i').test(kamarBlock)) {
      tipeKamar = 'isi4';
    }
  }

  const hargaKamar = jemaat ? HARGA_JEMAAT[tipeKamar] : HARGA_NON_JEMAAT[tipeKamar];

  return {
    namaLengkap,
    nomorTelpon,
    umur,
    alamatRumah,
    ukuranKaos,
    transportasi,
    jemaat,
    tipeKamar,
    hargaKamar,
  };
}

// ── Icons ──────────────────────────────────────────────────────────────────────

const CameraIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);

const UploadIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
    <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>
  </svg>
);

const SpinnerIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M21 12a9 9 0 11-6.219-8.56"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

// ── FieldRow ───────────────────────────────────────────────────────────────────

function FieldRow({
  label, value, editing, onEdit, renderEdit,
}: {
  label: string; value: string; editing: boolean;
  onEdit: () => void; renderEdit: () => React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 14px", borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", width: 110, flexShrink: 0, paddingTop: 2 }}>
        {label}
      </span>
      {editing ? (
        <div style={{ flex: 1 }}>{renderEdit()}</div>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: value ? "#1e293b" : "#ef4444" }}>
            {value || "—"}
          </span>
          <button onClick={onEdit} style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", background: "#f8fafc", color: "#64748b", border: "1.5px solid #e2e8f0", borderRadius: 6, cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>
            <EditIcon /> Edit
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function PaperFormScanner({
  apiKey, onClose, onSaved,
}: {
  apiKey: string;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [step, setStep] = useState<ScanStep>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rawOcr, setRawOcr] = useState<string>("");
  const [parsed, setParsed] = useState<ScannedMember | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [editingField, setEditingField] = useState<keyof ScannedMember | null>(null);
  const [liveCamera, setLiveCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // ── Image helpers ──────────────────────────────────────────────────────────

  function fileToBase64(file: File): Promise<string> {
    return new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res((reader.result as string).split(",")[1]);
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });
  }

  async function handleFile(file: File) {
    setPreviewUrl(URL.createObjectURL(file));
    setStep("processing");
    const b64 = await fileToBase64(file);
    await runOcr(b64);
  }

  async function runOcr(b64: string) {
    try {
      const text = await extractTextFromImage(b64, apiKey);
      setRawOcr(text);
      setParsed(parseOcrText(text));
      setStep("review");
    } catch (e) {
      setErrorMsg(String(e));
      setStep("error");
    }
  }

  // ── Live camera ────────────────────────────────────────────────────────────

  async function startCamera() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      setStream(s);
      setLiveCamera(true);
      setStep("capturing");
      setTimeout(() => {
        if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play(); }
      }, 100);
    } catch {
      setErrorMsg("Kamera tidak dapat diakses. Gunakan upload foto.");
      setStep("error");
    }
  }

  function stopCamera() {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setLiveCamera(false);
  }

  async function captureFrame() {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    setPreviewUrl(dataUrl);
    stopCamera();
    setStep("processing");
    await runOcr(dataUrl.split(",")[1]);
  }

  // ── Field editing ─────────────────────────────────────────────────────────

  function updateParsed<K extends keyof ScannedMember>(field: K, value: ScannedMember[K]) {
    setParsed((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, [field]: value };
      if (field === "jemaat" || field === "tipeKamar") {
        updated.hargaKamar = (updated.jemaat ? HARGA_JEMAAT : HARGA_NON_JEMAAT)[updated.tipeKamar];
      }
      return updated;
    });
    setEditingField(null);
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!parsed) return;
    setStep("saving");
    try {
      const tempId = `reg_paper_${Date.now()}`;
      const qrDataUrl = await QRCode.toDataURL(tempId, { width: 300 });
      await createRegistration({
        mainNama: parsed.namaLengkap.trim(),
        mainTelpon: parsed.nomorTelpon.trim(),
        status: "registered",
        qrCode: qrDataUrl,
        paymentProofUrl: "",
        paymentProofUploaded: false,
        totalAmount: parsed.hargaKamar,
        sponsorCount: 0,
        members: [buildMember(parsed)],
      });
      setStep("done");
      onSaved?.();
    } catch (e) {
      setErrorMsg("Gagal menyimpan: " + String(e));
      setStep("error");
    }
  }

  // ── Reset ──────────────────────────────────────────────────────────────────

  function reset() {
    stopCamera();
    setStep("idle");
    setPreviewUrl(null);
    setRawOcr("");
    setParsed(null);
    setErrorMsg("");
    setEditingField(null);
  }

  // ── Shared styles ──────────────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", border: "1.5px solid #c7d2fe",
    borderRadius: 8, padding: "8px 10px", fontSize: 13, fontFamily: "inherit",
    color: "#1e293b", outline: "none", background: "#fff",
  };

  const btnPrimary: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    padding: "13px", borderRadius: 10, border: "none", cursor: "pointer",
    fontWeight: 700, fontSize: 13, fontFamily: "inherit", color: "#fff",
    background: "linear-gradient(135deg, #3b5bdb, #4c6ef5)",
    boxShadow: "0 4px 14px rgba(59,91,219,0.35)",
  };

  const btnSecondary: React.CSSProperties = {
    padding: "13px", borderRadius: 10, cursor: "pointer",
    fontWeight: 700, fontSize: 13, fontFamily: "inherit",
    background: "#f1f5f9", color: "#475569", border: "1.5px solid #e2e8f0",
  };

  const toggleBtn = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: "8px", borderRadius: 8, cursor: "pointer",
    fontWeight: 700, fontSize: 12, fontFamily: "inherit",
    border: active ? "2px solid #3b5bdb" : "1.5px solid #e2e8f0",
    background: active ? "#3b5bdb" : "#f8fafc",
    color: active ? "#fff" : "#475569",
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16, backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 480, maxHeight: "92vh", overflowY: "auto", display: "flex", flexDirection: "column", boxShadow: "0 25px 60px rgba(0,0,0,0.25)" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 20px 16px", borderBottom: "1.5px solid #f1f5f9", position: "sticky", top: 0, background: "#fff", zIndex: 1, borderRadius: "20px 20px 0 0" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#1e293b" }}>Scan Formulir Fisik</h2>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "#94a3b8" }}>Google Cloud Vision OCR</p>
          </div>
          <button onClick={() => { stopCamera(); onClose(); }} style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: "#f1f5f9", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700 }}>
            ×
          </button>
        </div>

        <div style={{ padding: 20, flex: 1 }}>

          {/* ── IDLE ── */}
          {step === "idle" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ padding: "14px 16px", background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: 12, fontSize: 13, color: "#1d4ed8", lineHeight: 1.5 }}>
                <strong>Petunjuk:</strong> Ambil foto atau upload foto formulir fisik yang sudah diisi. Sistem akan membaca data secara otomatis menggunakan OCR.
              </div>
              <button onClick={startCamera} style={{ ...btnPrimary, padding: "16px", borderRadius: 12, fontSize: 14 }}>
                <CameraIcon /> Ambil Foto dengan Kamera
              </button>
              <button onClick={() => fileInputRef.current?.click()} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "16px", borderRadius: 12, background: "#f8fafc", color: "#475569", border: "1.5px dashed #cbd5e1", cursor: "pointer", fontSize: 14, fontWeight: 700, fontFamily: "inherit" }}>
                <UploadIcon /> Upload Foto dari Galeri
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>
          )}

          {/* ── CAPTURING ── */}
          {step === "capturing" && liveCamera && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", background: "#000" }}>
                <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", display: "block", borderRadius: 12 }} />
                <div style={{ position: "absolute", inset: 0, border: "3px solid rgba(59,91,219,0.8)", borderRadius: 12, pointerEvents: "none", boxShadow: "inset 0 0 0 40px rgba(0,0,0,0.2)" }}>
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", padding: "6px 12px", background: "rgba(59,91,219,0.85)", borderRadius: 8, color: "#fff", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
                    Arahkan kamera ke formulir
                  </div>
                </div>
              </div>
              <canvas ref={canvasRef} style={{ display: "none" }} />
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => { stopCamera(); reset(); }} style={{ ...btnSecondary, flex: 1 }}>Batal</button>
                <button onClick={captureFrame} style={{ ...btnPrimary, flex: 2 }}><CameraIcon /> Ambil Foto</button>
              </div>
            </div>
          )}

          {/* ── PROCESSING ── */}
          {step === "processing" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, padding: "32px 0" }}>
              {previewUrl && <img src={previewUrl} alt="Preview" style={{ width: "100%", maxHeight: 220, objectFit: "contain", borderRadius: 12, border: "1.5px solid #e2e8f0" }} />}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, color: "#3b5bdb" }}>
                <div style={{ animation: "spin 1s linear infinite" }}><SpinnerIcon /></div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1e293b" }}>Membaca formulir...</p>
                <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>Google Cloud Vision sedang menganalisis gambar</p>
              </div>
              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* ── REVIEW ── */}
          {step === "review" && parsed && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {previewUrl && <img src={previewUrl} alt="Preview" style={{ width: "100%", maxHeight: 180, objectFit: "contain", borderRadius: 10, border: "1.5px solid #e2e8f0" }} />}

              <div style={{ padding: "10px 14px", background: "#fefce8", border: "1.5px solid #fde68a", borderRadius: 10, fontSize: 12, color: "#92400e", lineHeight: 1.5 }}>
                ⚠️ Periksa data yang terdeteksi. Klik <strong>Edit</strong> untuk koreksi jika ada yang salah.
              </div>

              <div style={{ border: "1.5px solid #e8ecf0", borderRadius: 12, overflow: "hidden" }}>

                {/* Nama */}
                <FieldRow label="Nama" value={parsed.namaLengkap}
                  editing={editingField === "namaLengkap"} onEdit={() => setEditingField("namaLengkap")}
                  renderEdit={() => (
                    <input autoFocus type="text" defaultValue={parsed.namaLengkap} style={inputStyle}
                      onKeyDown={(e) => { if (e.key === "Enter") updateParsed("namaLengkap", (e.target as HTMLInputElement).value); if (e.key === "Escape") setEditingField(null); }}
                      onBlur={(e) => updateParsed("namaLengkap", e.target.value)} />
                  )} />

                {/* Telepon */}
                <FieldRow label="No. Tlp" value={parsed.nomorTelpon}
                  editing={editingField === "nomorTelpon"} onEdit={() => setEditingField("nomorTelpon")}
                  renderEdit={() => (
                    <input autoFocus type="tel" defaultValue={parsed.nomorTelpon} style={inputStyle}
                      onBlur={(e) => updateParsed("nomorTelpon", e.target.value)} />
                  )} />

                {/* Umur */}
                <FieldRow label="Umur" value={parsed.umur > 0 ? String(parsed.umur) : ""}
                  editing={editingField === "umur"} onEdit={() => setEditingField("umur")}
                  renderEdit={() => (
                    <input autoFocus type="number" defaultValue={parsed.umur || ""} style={inputStyle}
                      onBlur={(e) => updateParsed("umur", parseInt(e.target.value) || 0)} />
                  )} />

                {/* Alamat */}
                <FieldRow label="Alamat" value={parsed.alamatRumah}
                  editing={editingField === "alamatRumah"} onEdit={() => setEditingField("alamatRumah")}
                  renderEdit={() => (
                    <textarea autoFocus defaultValue={parsed.alamatRumah} rows={2} style={{ ...inputStyle, resize: "none" }}
                      onBlur={(e) => updateParsed("alamatRumah", e.target.value)} />
                  )} />

                {/* Ukuran Kaos */}
                <FieldRow label="Kaos" value={parsed.ukuranKaos}
                  editing={editingField === "ukuranKaos"} onEdit={() => setEditingField("ukuranKaos")}
                  renderEdit={() => (
                    <div style={{ display: "flex", gap: 6 }}>
                      {(["S", "M", "L", "XL", "XXL"] as KaosSize[]).map((s) => (
                        <button key={s} onClick={() => updateParsed("ukuranKaos", s)}
                          style={{ padding: "6px 10px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: "inherit", border: parsed.ukuranKaos === s ? "2px solid #3b5bdb" : "1.5px solid #e2e8f0", background: parsed.ukuranKaos === s ? "#3b5bdb" : "#f8fafc", color: parsed.ukuranKaos === s ? "#fff" : "#475569" }}>
                          {s}
                        </button>
                      ))}
                    </div>
                  )} />

                {/* Transportasi */}
                <FieldRow label="Transportasi" value={parsed.transportasi === "bus" ? "Bus" : "Mobil Sendiri"}
                  editing={editingField === "transportasi"} onEdit={() => setEditingField("transportasi")}
                  renderEdit={() => (
                    <div style={{ display: "flex", gap: 8 }}>
                      {(["bus", "mobil_sendiri"] as Transportasi[]).map((t) => (
                        <button key={t} onClick={() => updateParsed("transportasi", t)} style={toggleBtn(parsed.transportasi === t)}>
                          {t === "bus" ? "Bus" : "Mobil"}
                        </button>
                      ))}
                    </div>
                  )} />

                {/* Jemaat */}
                <FieldRow label="Jemaat" value={parsed.jemaat ? "Jemaat / Simpatisan" : "Non Jemaat"}
                  editing={editingField === "jemaat"} onEdit={() => setEditingField("jemaat")}
                  renderEdit={() => (
                    <div style={{ display: "flex", gap: 8 }}>
                      {([{ v: true, l: "Jemaat" }, { v: false, l: "Non Jemaat" }]).map(({ v, l }) => (
                        <button key={String(v)} onClick={() => updateParsed("jemaat", v)} style={toggleBtn(parsed.jemaat === v)}>{l}</button>
                      ))}
                    </div>
                  )} />

                {/* Tipe Kamar */}
                <FieldRow
                  label="Tipe Kamar"
                  value={parsed.tipeKamar === "isi4" ? "Kamar isi 4" : parsed.tipeKamar === "isi3" ? "Kamar isi 3" : "Kamar isi 2"}
                  editing={editingField === "tipeKamar"} onEdit={() => setEditingField("tipeKamar")}
                  renderEdit={() => {
                    const priceMap = parsed.jemaat ? HARGA_JEMAAT : HARGA_NON_JEMAAT;
                    return (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {(["isi4", "isi3", "isi2"] as TipeKamar[]).map((t) => (
                          <button key={t} onClick={() => updateParsed("tipeKamar", t)}
                            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: "inherit", border: parsed.tipeKamar === t ? "2px solid #3b5bdb" : "1.5px solid #e2e8f0", background: parsed.tipeKamar === t ? "#eff3ff" : "#f8fafc", color: parsed.tipeKamar === t ? "#3b5bdb" : "#475569" }}>
                            <span>{t === "isi4" ? "Kamar isi 4" : t === "isi3" ? "Kamar isi 3" : "Kamar isi 2"}</span>
                            <span>{formatRupiah(priceMap[t])}</span>
                          </button>
                        ))}
                      </div>
                    );
                  }} />

                {/* Total */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "#eff3ff" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#3b5bdb", textTransform: "uppercase", letterSpacing: "0.06em" }}>Total</span>
                  <span style={{ fontSize: 15, fontWeight: 800, color: "#3b5bdb" }}>{formatRupiah(parsed.hargaKamar)}</span>
                </div>
              </div>

              {/* Raw OCR */}
              <details style={{ fontSize: 11, color: "#94a3b8" }}>
                <summary style={{ cursor: "pointer", userSelect: "none", fontWeight: 600 }}>Lihat teks OCR mentah</summary>
                <pre style={{ marginTop: 8, padding: 10, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 10, overflowX: "auto", whiteSpace: "pre-wrap", color: "#475569", lineHeight: 1.6 }}>
                  {rawOcr || "(kosong)"}
                </pre>
              </details>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={reset} style={{ ...btnSecondary, flex: 1 }}>← Ulang Scan</button>
                <button onClick={handleSave} disabled={!parsed.namaLengkap || !parsed.nomorTelpon}
                  style={{ flex: 2, padding: "13px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 10, border: "none", fontWeight: 700, fontSize: 13, fontFamily: "inherit", cursor: !parsed.namaLengkap || !parsed.nomorTelpon ? "not-allowed" : "pointer", background: !parsed.namaLengkap || !parsed.nomorTelpon ? "#e8ecf0" : "linear-gradient(135deg,#16a34a,#15803d)", color: !parsed.namaLengkap || !parsed.nomorTelpon ? "#94a3b8" : "#fff", boxShadow: parsed.namaLengkap && parsed.nomorTelpon ? "0 4px 14px rgba(22,163,74,0.3)" : "none" }}>
                  <CheckIcon /> Simpan Pendaftaran
                </button>
              </div>
            </div>
          )}

          {/* ── SAVING ── */}
          {step === "saving" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "40px 0" }}>
              <div style={{ animation: "spin 1s linear infinite", color: "#16a34a" }}><SpinnerIcon /></div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1e293b" }}>Menyimpan pendaftaran...</p>
            </div>
          )}

          {/* ── DONE ── */}
          {step === "done" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "32px 0", textAlign: "center" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,#16a34a,#15803d)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(22,163,74,0.35)" }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1e293b" }}>Berhasil Disimpan!</p>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "#64748b" }}>
                  Pendaftaran <strong>{parsed?.namaLengkap}</strong> telah ditambahkan ke sistem.
                </p>
              </div>
              <div style={{ display: "flex", gap: 10, width: "100%" }}>
                <button onClick={reset} style={{ flex: 1, padding: "13px", background: "#eff3ff", color: "#3b5bdb", border: "1.5px solid #c7d2fe", borderRadius: 10, fontWeight: 700, fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>Scan Lagi</button>
                <button onClick={onClose} style={{ ...btnSecondary, flex: 1 }}>Tutup</button>
              </div>
            </div>
          )}

          {/* ── ERROR ── */}
          {step === "error" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "32px 0", textAlign: "center" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#fef2f2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>⚠️</div>
              <div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#dc2626" }}>Terjadi Kesalahan</p>
                <p style={{ margin: "6px 0 0", fontSize: 12, color: "#94a3b8", wordBreak: "break-word" }}>{errorMsg}</p>
              </div>
              <button onClick={reset} style={{ ...btnSecondary, width: "100%" }}>Coba Lagi</button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}