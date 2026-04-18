// components/admin/AdminEventsPage.tsx
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '@/lib/firebase';
import {
  collection, query, where, orderBy, onSnapshot, getDocs,
  addDoc, updateDoc, deleteDoc, doc, Timestamp, FieldValue,
  writeBatch, increment,
} from 'firebase/firestore';
import * as XLSX from 'xlsx';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EventDoc {
  id: string;
  type: 'kebaktian' | 'registration';
  title: string;
  date: Date;
  is_finished: boolean;
  description?: string;
  // kebaktian
  assignments?: Assignment[];
  attendance_count?: number;
  attendance_notes?: string;
  offering_amount?: number;
  offering_notes?: string;
  // registration
  capacity?: number;
  currentRegistrants?: number;
  registrationDeadline?: Date;
  details?: string;
}

interface Assignment {
  volunteerId: string;
  volunteerName: string;
  role: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
}

interface Registrant {
  id: string;
  name: string;
  contact: string;
  description?: string;
  registeredAt?: Date;
  documentUrl?: string;
}

interface Schedule { id: string; name: string; }
interface Volunteer { id: string; name: string; ministries: string[]; }

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  primary: '#3b5bdb', primaryDark: '#2f4ac7',
  primaryBg: '#eff3ff', primaryBorder: '#c7d2fe',
  card: '#ffffff', border: '#e8ecf0',
  bg: '#f8fafc',
  text: '#1e293b', sub: '#64748b', muted: '#94a3b8',
  success: '#16a34a', successBg: '#f0fdf4', successBorder: '#bbf7d0',
  warn: '#d97706', warnBg: '#fffbeb', warnBorder: '#fde68a',
  error: '#dc2626', errorBg: '#fff5f5', errorBorder: '#fecaca',
};

// ─── Shared tiny components ───────────────────────────────────────────────────

function Badge({ label, color, bg, border }: { label: string; color: string; bg: string; border: string }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 800, color, background: bg,
      border: `1px solid ${border}`, borderRadius: 5, padding: '2px 7px',
      textTransform: 'uppercase', letterSpacing: '0.4px', flexShrink: 0 }}>
      {label}
    </span>
  );
}

function ActionChip({ icon, label, color = C.primary, bg = C.primaryBg,
  border = C.primaryBorder, onClick, disabled = false }: {
  icon: React.ReactNode; label: string; color?: string; bg?: string;
  border?: string; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: 'flex', alignItems: 'center', gap: 5,
      padding: '6px 12px', borderRadius: 7,
      background: bg, border: `1.5px solid ${border}`, color,
      fontSize: 12, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1, fontFamily: 'inherit', transition: 'all 0.15s',
    }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.opacity = '0.8'; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
    >
      {icon}{label}
    </button>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label style={{ display: 'block', fontSize: 11, fontWeight: 700,
    color: C.sub, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
    {children}
  </label>;
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: `1.5px solid ${C.border}`,
  borderRadius: 8, fontSize: 13, color: C.text, background: '#fff',
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  transition: 'border-color 0.2s',
};

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...inputStyle, ...props.style }}
    onFocus={e => (e.target.style.borderColor = C.primary)}
    onBlur={e => (e.target.style.borderColor = C.border)} />;
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props}
    style={{ ...inputStyle, resize: 'vertical', ...(props.style as React.CSSProperties) }}
    onFocus={e => (e.target.style.borderColor = C.primary)}
    onBlur={e => (e.target.style.borderColor = C.border)} />;
}

function Modal({ title, onClose, children, width = 520 }: {
  title: string; onClose: () => void; children: React.ReactNode; width?: number;
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
      zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '40px 16px', overflowY: 'auto' }}>
      <div style={{ background: C.card, borderRadius: 14, width: '100%', maxWidth: width,
        border: `1.5px solid ${C.border}`, boxShadow: '0 16px 48px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.text }}>{title}</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer',
            color: C.muted, display: 'flex', padding: 4 }}><XIcon /></button>
        </div>
        <div style={{ padding: '20px 20px 24px' }}>{children}</div>
      </div>
    </div>
  );
}

function SaveBtn({ label, loading, onClick }: { label: string; loading: boolean; onClick?: () => void }) {
  return (
    <button type={onClick ? 'button' : 'submit'} onClick={onClick} disabled={loading}
      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 22px',
        background: loading ? '#93a3c7' : C.primary, color: '#fff',
        border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
        cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
      {loading ? 'Menyimpan...' : label}
    </button>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const XIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const EditIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const TrashIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>;
const PeopleIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;
const PlusIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const ChartIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
const DocIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
const DownloadIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const CheckIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const ClockIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;

// ─── Registrant detail popup ──────────────────────────────────────────────────

function RegistrantDetailModal({ registrant, onClose, fmtDate }: {
  registrant: Registrant; onClose: () => void; fmtDate: (d: Date) => string;
}) {
  return (
    <Modal title="Detail Registran" onClose={onClose} width={440}>
      {/* Avatar + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
          background: C.primaryBg, color: C.primary,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 800 }}>
          {registrant.name[0]?.toUpperCase() ?? 'U'}
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.text }}>{registrant.name}</p>
          {registrant.registeredAt && (
            <p style={{ margin: '3px 0 0', fontSize: 12, color: C.muted }}>
              Terdaftar: {fmtDate(registrant.registeredAt)}
            </p>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Contact */}
        <div style={{ padding: '12px 14px', borderRadius: 9,
          background: C.bg, border: `1.5px solid ${C.border}` }}>
          <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 700, color: C.muted,
            textTransform: 'uppercase', letterSpacing: '0.06em' }}>Kontak</p>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.text }}>
            {registrant.contact || '—'}
          </p>
        </div>

        {/* Description */}
        {registrant.description && (
          <div style={{ padding: '12px 14px', borderRadius: 9,
            background: C.bg, border: `1.5px solid ${C.border}` }}>
            <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 700, color: C.muted,
              textTransform: 'uppercase', letterSpacing: '0.06em' }}>Keterangan</p>
            <p style={{ margin: 0, fontSize: 13, color: C.text }}>{registrant.description}</p>
          </div>
        )}

        {/* Document link */}
        {registrant.documentUrl && (
          <a href={registrant.documentUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 14px', borderRadius: 9,
              background: C.primaryBg, border: `1.5px solid ${C.primaryBorder}`,
              textDecoration: 'none', color: C.primary, fontWeight: 700, fontSize: 13 }}>
            <DocIcon /> Lihat Dokumen
          </a>
        )}
      </div>

      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ padding: '9px 20px', background: C.card,
          color: C.sub, border: `1.5px solid ${C.border}`, borderRadius: 8,
          fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Tutup
        </button>
      </div>
    </Modal>
  );
}

// ─── Export Registrants Modal ─────────────────────────────────────────────────

function ExportRegistrantsModal({
  onClose,
  registrants,
  eventTitle,
}: {
  onClose: () => void;
  registrants: Registrant[];
  eventTitle: string;
}) {
  const [exporting, setExporting] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleExport = () => {
    try {
      setExporting(true);

      // Build worksheet data
      const header = ['Nama', 'Kontak', 'Tanggal Pendaftaran', 'Keterangan'];
      const rows = registrants.map(r => [
        r.name,
        r.contact,
        r.registeredAt
          ? r.registeredAt.toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit' })
          : '-',
        r.description || '-',
      ]);

      const wsData = [header, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Column widths
      ws['!cols'] = [
        { wch: 25 }, // Nama
        { wch: 20 }, // Kontak
        { wch: 18 }, // Tanggal Pendaftaran
        { wch: 30 }, // Keterangan
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Registran');

      // Filename
      const now = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const filename = `registran_${eventTitle.replace(/\s+/g, '_')}_${now}.xlsx`;

      XLSX.writeFile(wb, filename);
      onClose();
    } catch (e) {
      console.error('Export error:', e);
      alert('Gagal mengekspor data registran');
    } finally {
      setExporting(false);
    }
  };

  const C = {
    text: '#1e293b', muted: '#64748b', sub: '#475569',
    primary: '#3b5bdb', primaryBg: '#dbeafe', primaryBorder: '#93c5fd',
    border: '#cbd5e1', card: '#ffffff',
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div style={{
        background: C.card, borderRadius: 12, border: `1px solid ${C.border}`,
        maxWidth: 500, width: '90%', maxHeight: '90vh', overflow: 'auto',
        boxShadow: '0 20px 25px rgba(0,0,0,0.1)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '20px 24px 16px',
          borderBottom: `1px solid ${C.border}`,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9,
            background: C.primaryBg, border: `1.5px solid ${C.primaryBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: C.primary, flexShrink: 0,
          }}>
            <DownloadIcon />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.text }}>Ekspor Registran</p>
            <p style={{ margin: 0, fontSize: 12, color: C.muted }}>Unduh daftar pendaftar sebagai file Excel</p>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px' }}>
          <div style={{
            padding: '12px', borderRadius: 8, background: '#f0fdf4',
            border: '1px solid #bbf7d0', marginBottom: 16,
          }}>
            <p style={{ margin: 0, fontSize: 13, color: '#166534', fontWeight: 600 }}>
              ✓ Siap mengekspor {registrants.length} registran
            </p>
          </div>

          {/* <div style={{ marginBottom: 16 }}>
            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Kolom yang akan diekspor
            </p>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: C.sub }}>
              <li>Nama registran</li>
              <li>Kontak (nomor telepon/email)</li>
              <li>Tanggal pendaftaran</li>
              <li>Keterangan tambahan</li>
            </ul>
          </div> */}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                flex: 1, padding: '11px 0', borderRadius: 9, cursor: 'pointer',
                background: '#f1f5f9', border: `1.5px solid ${C.border}`,
                fontSize: 14, fontWeight: 700, color: C.sub, fontFamily: 'inherit',
              }}
            >
              Batal
            </button>
            <button
              onClick={handleExport}
              disabled={exporting || registrants.length === 0}
              style={{
                flex: 2, padding: '11px 0', borderRadius: 9,
                cursor: exporting || registrants.length === 0 ? 'not-allowed' : 'pointer',
                background: exporting || registrants.length === 0 ? C.muted : C.primary,
                border: 'none',
                fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                transition: 'background 0.15s',
              }}
            >
              {exporting ? (
                <>
                  Mengekspor...
                </>
              ) : (
                <>
                  <DownloadIcon />
                  Unduh Excel
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Inline registrants panel ─────────────────────────────────────────────────
// Lives inside the expanded EventCard for registration events.
// Fetches registrants via onSnapshot only when the card is expanded.

function RegistrantsInlinePanel({ eventId, capacity, fmtDate, eventTitle }: {
  eventId: string; capacity: number; fmtDate: (d: Date) => string; eventTitle: string;
}) {
  const [registrants, setRegistrants] = useState<Registrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [detailRegistrant, setDetailRegistrant] = useState<Registrant | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'registrations'), where('eventId', '==', eventId)),
      snap => {
        const list: Registrant[] = snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name ?? 'Unknown',
            contact: data.contact ?? '-',
            description: data.description,
            documentUrl: data.documentUrl,
            registeredAt: data.registeredAt
              ? (data.registeredAt as Timestamp).toDate() : undefined,
          };
        }).sort((a, b) =>
          (b.registeredAt?.getTime() ?? 0) - (a.registeredAt?.getTime() ?? 0)
        );
        setRegistrants(list);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [eventId]);

  const handleDelete = async (r: Registrant) => {
    if (!confirm(`Hapus registrasi "${r.name}"?`)) return;
    setDeletingId(r.id);
    try {
      await deleteDoc(doc(db, 'registrations', r.id));
      await updateDoc(doc(db, 'events', eventId), { currentRegistrants: increment(-1) });
    } catch (e) { console.error(e); }
    finally { setDeletingId(null); }
  };

  const isFull = registrants.length >= capacity;

  return (
    <>
      {/* Section label + count pill + export button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: C.sub,
          textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Daftar Registran
        </p>
        {!loading && (
          <span style={{ fontSize: 10, fontWeight: 700,
            color: isFull ? C.error : C.success,
            background: isFull ? C.errorBg : C.successBg,
            border: `1px solid ${isFull ? C.errorBorder : C.successBorder}`,
            borderRadius: 10, padding: '1px 8px' }}>
            {registrants.length}/{capacity}
          </span>
        )}
        {!loading && registrants.length > 0 && (
          <button
            onClick={() => setShowExportModal(true)}
            style={{
              marginLeft: 'auto',
              padding: '4px 10px', borderRadius: 6,
              background: C.primaryBg, border: `1px solid ${C.primaryBorder}`,
              color: C.primary, cursor: 'pointer',
              fontSize: 11, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 4,
              transition: 'background 0.12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fbbf24')}
            onMouseLeave={e => (e.currentTarget.style.background = C.primaryBg)}
          >
            <DownloadIcon />
            Ekspor
          </button>
        )}
      </div>

      {loading ? (
        <p style={{ margin: 0, fontSize: 13, color: C.muted }}>Memuat registran...</p>
      ) : registrants.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: C.muted, fontStyle: 'italic' }}>
          Belum ada registran.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {/* Column header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr auto auto',
            gap: '0 12px', padding: '5px 10px',
            background: '#f1f5f9', borderRadius: 7 }}>
            {['Nama', 'Kontak', 'Dok.', ''].map((h, i) => (
              <span key={i} style={{ fontSize: 10, fontWeight: 700, color: C.muted,
                textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
            ))}
          </div>

          {/* Rows */}
          {registrants.map(r => (
            <div key={r.id} onClick={() => setDetailRegistrant(r)}
              style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr auto auto',
                gap: '0 12px', padding: '9px 10px', borderRadius: 8,
                border: `1.5px solid ${C.border}`, background: C.card,
                alignItems: 'center', cursor: 'pointer', transition: 'background 0.12s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f5f7ff')}
              onMouseLeave={e => (e.currentTarget.style.background = C.card)}
            >
              {/* Name + date */}
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.name}
                </p>
                {r.registeredAt && (
                  <p style={{ margin: '1px 0 0', fontSize: 10, color: C.muted }}>
                    {fmtDate(r.registeredAt)}
                  </p>
                )}
              </div>

              {/* Contact */}
              <p style={{ margin: 0, fontSize: 12, color: C.sub,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {r.contact}
              </p>

              {/* Document */}
              {r.documentUrl ? (
                <a href={r.documentUrl} target="_blank" rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  style={{ display: 'flex', alignItems: 'center', gap: 4,
                    fontSize: 11, fontWeight: 700, color: C.primary,
                    background: C.primaryBg, border: `1px solid ${C.primaryBorder}`,
                    borderRadius: 5, padding: '3px 8px', textDecoration: 'none',
                    whiteSpace: 'nowrap' }}>
                  <DocIcon /> Lihat
                </a>
              ) : (
                <span style={{ fontSize: 11, color: C.muted }}>—</span>
              )}

              {/* Delete */}
              <button onClick={e => { e.stopPropagation(); handleDelete(r); }}
                disabled={deletingId === r.id}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                  background: C.errorBg, border: `1.5px solid ${C.errorBorder}`,
                  color: C.error, cursor: deletingId === r.id ? 'not-allowed' : 'pointer',
                  opacity: deletingId === r.id ? 0.5 : 1, transition: 'all 0.15s' }}
                onMouseEnter={e => {
                  if (deletingId !== r.id) {
                    (e.currentTarget as HTMLButtonElement).style.background = C.error;
                    (e.currentTarget as HTMLButtonElement).style.color = '#fff';
                  }
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = C.errorBg;
                  (e.currentTarget as HTMLButtonElement).style.color = C.error;
                }}
              >
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Registrant detail popup */}
      {detailRegistrant && (
        <RegistrantDetailModal
          registrant={detailRegistrant}
          fmtDate={fmtDate}
          onClose={() => setDetailRegistrant(null)}
        />
      )}

      {/* Export modal */}
      {showExportModal && (
        <ExportRegistrantsModal
          registrants={registrants}
          eventTitle={eventTitle}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'upcoming' | 'finished'>('upcoming');

  const [showCreate, setShowCreate] = useState<null | 'kebaktian' | 'registration'>(null);
  const [editEvent, setEditEvent] = useState<EventDoc | null>(null);
  const [volunteersEvent, setVolunteersEvent] = useState<EventDoc | null>(null);
  const [finishDataEvent, setFinishDataEvent] = useState<EventDoc | null>(null);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);

  useEffect(() => {
    const unsubs: (() => void)[] = [];

    const regUnsub = onSnapshot(
      query(collection(db, 'events'), where('type', '==', 'registration')),
      snap => {
        const re = snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id, type: 'registration' as const,
            title: data.title ?? 'Registrasi',
            date: (data.date as Timestamp).toDate(),
            is_finished: data.is_finished ?? false,
            description: data.description,
            capacity: data.capacity ?? 0,
            currentRegistrants: data.currentRegistrants ?? 0,
            registrationDeadline: data.registrationDeadline
              ? (data.registrationDeadline as Timestamp).toDate() : undefined,
            details: data.details,
          } as EventDoc;
        });
        setEvents(prev => [...prev.filter(e => e.type !== 'registration'), ...re]);
        setLoading(false);
      }
    );
    unsubs.push(regUnsub);

    const svcUnsub = onSnapshot(collection(db, 'service_events'), snap => {
      const se = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id, type: 'kebaktian' as const,
          title: data.ministry ?? 'Kebaktian',
          date: (data.date as Timestamp).toDate(),
          is_finished: data.is_finished ?? false,
          description: data.description,
          assignments: data.assignments ?? [],
          attendance_count: data.attendance_count,
          attendance_notes: data.attendance_notes,
          offering_amount: data.offering_amount,
          offering_notes: data.offering_notes,
        } as EventDoc;
      });
      setEvents(prev => [...prev.filter(e => e.type !== 'kebaktian'), ...se]);
      setLoading(false);
    });
    unsubs.push(svcUnsub);

    getDocs(query(collection(db, 'schedules'), orderBy('order'))).then(snap => {
      setSchedules(snap.docs.map(d => ({ id: d.id, name: d.data().name })));
    });

    return () => unsubs.forEach(u => u());
  }, []);

  const now = new Date();

  const upcomingEvents = useMemo(() =>
    events.filter(e => {
      if (e.type === 'kebaktian') return !e.is_finished;
      return !e.is_finished && e.date > now;
    }).sort((a, b) => a.date.getTime() - b.date.getTime()),
  [events]);

  const finishedEvents = useMemo(() =>
    events.filter(e => {
      if (e.type === 'kebaktian') return e.is_finished;
      return e.date <= now;
    }).sort((a, b) => b.date.getTime() - a.date.getTime()),
  [events]);

  const displayed = tab === 'upcoming' ? upcomingEvents : finishedEvents;

  const handleDelete = async (e: EventDoc) => {
    if (!confirm(`Hapus "${e.title}"? Semua data terkait akan ikut terhapus.`)) return;
    if (e.type === 'registration') {
      const regs = await getDocs(query(collection(db, 'registrations'), where('eventId', '==', e.id)));
      const batch = writeBatch(db);
      regs.docs.forEach(r => batch.delete(r.ref));
      batch.delete(doc(db, 'events', e.id));
      await batch.commit();
    } else {
      await deleteDoc(doc(db, 'service_events', e.id));
    }
  };

  const fmtDate = (d: Date) =>
    d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div style={{ fontFamily: 'Nunito, sans-serif' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: C.card, borderRadius: 10,
          border: `1.5px solid ${C.border}`, padding: 5, width: 'fit-content' }}>
          {(['upcoming', 'finished'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '7px 20px', borderRadius: 7, border: 'none', cursor: 'pointer',
              background: tab === t ? C.primary : 'transparent',
              color: tab === t ? '#fff' : C.sub,
              fontSize: 13, fontWeight: tab === t ? 700 : 600, fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}>
              {t === 'upcoming' ? 'Akan Datang' : 'Selesai'}
              <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700,
                background: tab === t ? 'rgba(255,255,255,0.2)' : C.bg,
                color: tab === t ? '#fff' : C.muted, borderRadius: 10, padding: '1px 7px' }}>
                {t === 'upcoming' ? upcomingEvents.length : finishedEvents.length}
              </span>
            </button>
          ))}
        </div>

        {/* Create dropdown */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setCreateMenuOpen(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px',
              background: C.primary, color: '#fff', border: 'none', borderRadius: 9,
              fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            <PlusIcon /> Buat Event
          </button>
          {createMenuOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}
                onClick={() => setCreateMenuOpen(false)} />
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 10,
                boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 51, minWidth: 210, overflow: 'hidden' }}>
                <p style={{ margin: 0, padding: '10px 14px 6px', fontSize: 11, fontWeight: 700,
                  color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Pilih jenis event
                </p>
                {[
                  { type: 'kebaktian' as const, label: 'Kebaktian', sub: 'Jadwal ibadah dengan petugas' },
                  { type: 'registration' as const, label: 'Registrasi', sub: 'Form pendaftaran untuk acara' },
                ].map(opt => (
                  <button key={opt.type}
                    onClick={() => { setCreateMenuOpen(false); setShowCreate(opt.type); }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px',
                      background: 'none', border: 'none', borderTop: `1px solid ${C.border}`,
                      cursor: 'pointer', fontFamily: 'inherit' }}
                    onMouseEnter={e => (e.currentTarget.style.background = C.bg)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text }}>{opt.label}</p>
                    <p style={{ margin: 0, fontSize: 11, color: C.muted }}>{opt.sub}</p>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Events list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: C.muted }}>Memuat events...</div>
      ) : displayed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: C.muted }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
            {tab === 'upcoming' ? 'Tidak ada event mendatang.' : 'Belum ada riwayat event selesai.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {displayed.map(ev => (
            <EventCard key={ev.id} event={ev} isFinished={tab === 'finished'}
              fmtDate={fmtDate}
              onEdit={() => setEditEvent(ev)}
              onDelete={() => handleDelete(ev)}
              onVolunteers={() => setVolunteersEvent(ev)}
              onFinishData={() => setFinishDataEvent(ev)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {(showCreate === 'kebaktian' || (editEvent && editEvent.type === 'kebaktian')) && (
        <KebaktianModal schedules={schedules}
          existing={editEvent?.type === 'kebaktian' ? editEvent : null}
          onClose={() => { setShowCreate(null); setEditEvent(null); }} />
      )}
      {(showCreate === 'registration' || (editEvent && editEvent.type === 'registration')) && (
        <RegistrationModal
          existing={editEvent?.type === 'registration' ? editEvent : null}
          onClose={() => { setShowCreate(null); setEditEvent(null); }} />
      )}
      {volunteersEvent && (
        <VolunteersModal event={volunteersEvent} onClose={() => setVolunteersEvent(null)} />
      )}
      {finishDataEvent && (
        <FinishDataModal event={finishDataEvent} onClose={() => setFinishDataEvent(null)} />
      )}
    </div>
  );
}

// ─── Event card ───────────────────────────────────────────────────────────────

function EventCard({ event: ev, isFinished, fmtDate, onEdit, onDelete,
  onVolunteers, onFinishData }: {
  event: EventDoc; isFinished: boolean; fmtDate: (d: Date) => string;
  onEdit: () => void; onDelete: () => void;
  onVolunteers: () => void; onFinishData: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const isReg = ev.type === 'registration';
  const isPast = ev.date < new Date();

  const typeColor  = isReg ? C.success  : C.primary;
  const typeBg     = isReg ? C.successBg : C.primaryBg;
  const typeBorder = isReg ? C.successBorder : C.primaryBorder;

  const statusColor  = isFinished ? C.muted   : (isPast && !isReg ? C.warn      : typeColor);
  const statusBg     = isFinished ? '#f1f5f9' : (isPast && !isReg ? C.warnBg    : typeBg);
  const statusBorder = isFinished ? C.border   : (isPast && !isReg ? C.warnBorder : typeBorder);

  const handleToggleStatus = async () => {
    const action = ev.is_finished ? 'belum selesai' : 'selesai';
    const message = ev.is_finished 
      ? 'Anda yakin mau event nya belum selesai?' 
      : 'Anda yakin mau event nya selesai?';
    
    if (!confirm(message)) return;
    
    setTogglingStatus(true);
    try {
      const newStatus = !ev.is_finished;
      if (ev.type === 'registration') {
        await updateDoc(doc(db, 'events', ev.id), { is_finished: newStatus });
      } else {
        await updateDoc(doc(db, 'service_events', ev.id), { is_finished: newStatus });
      }
    } catch (err) {
      console.error('Error toggling event status:', err);
      alert('Gagal mengubah status event');
    } finally {
      setTogglingStatus(false);
    }
  };

  return (
    <div style={{ background: C.card, borderRadius: 12,
      border: `1.5px solid ${isFinished ? C.border : typeBorder}`,
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>

      {/* Clickable header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
        cursor: 'pointer' }} onClick={() => setExpanded(v => !v)}>

        {/* Date badge */}
        <div style={{ width: 46, flexShrink: 0, textAlign: 'center',
          background: statusBg, borderRadius: 9, padding: '4px 6px',
          border: `1.5px solid ${statusBorder}` }}>
          <p style={{ margin: 0, fontSize: 9, fontWeight: 800, color: statusColor,
            textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {ev.date.toLocaleDateString('id-ID', { month: 'short' })}
          </p>
          <p style={{ margin: 0, fontSize: 19, fontWeight: 800, color: statusColor, lineHeight: 1.1 }}>
            {ev.date.getDate()}
          </p>
        </div>

        {/* Title block */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
            <Badge label={isReg ? 'REGISTRASI' : 'IBADAH'}
              color={isFinished ? C.muted : typeColor}
              bg={isFinished ? '#f1f5f9' : typeBg}
              border={isFinished ? C.border : typeBorder} />
            {isPast && !isFinished && !isReg && (
              <Badge label="Belum selesai" color={C.warn} bg={C.warnBg} border={C.warnBorder} />
            )}
          </div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700,
            color: isFinished ? C.sub : C.text,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {ev.title}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: C.muted }}>
            {fmtDate(ev.date)}
            {isReg && ` · ${ev.currentRegistrants}/${ev.capacity} terdaftar`}
            {!isReg && ` · ${ev.assignments?.length ?? 0} petugas`}
          </p>
        </div>

        {/* Expand chevron */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.muted}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.2s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      {/* Expanded section */}
      {expanded && (
        <>
          {/* Action buttons */}
          <div style={{ borderTop: `1px solid ${C.border}`, padding: '10px 14px' }}>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              <ActionChip icon={<EditIcon />} label="Edit" onClick={onEdit} />
              {!isReg && (
                <ActionChip icon={<PeopleIcon />} label={`Petugas (${ev.assignments?.length ?? 0})`}
                  onClick={onVolunteers} />
              )}
              {!isReg && (
                <ActionChip icon={<ChartIcon />} label="Data Ibadah" onClick={onFinishData} />
              )}
              {!isReg && (
                <ActionChip 
                  icon={ev.is_finished ? <ClockIcon /> : <CheckIcon />} 
                  label={ev.is_finished ? 'Belum Selesai' : 'Tandai Selesai'}
                  color={ev.is_finished ? C.warn : C.success}
                  bg={ev.is_finished ? C.warnBg : C.successBg}
                  border={ev.is_finished ? C.warnBorder : C.successBorder}
                  onClick={handleToggleStatus}
                  disabled={togglingStatus}
                />
              )}
              <ActionChip icon={<TrashIcon />} label="Hapus"
                color={C.error} bg={C.errorBg} border={C.errorBorder} onClick={onDelete} />
            </div>
          </div>

          {/* Details panel */}
          <div style={{ borderTop: `1px solid ${C.border}`, padding: '14px 16px', background: C.bg }}>
            {isReg ? (
              <>
                <RegistrationDetails ev={ev} />
                {/* Divider */}
                <div style={{ height: 1, background: C.border, margin: '16px 0' }} />
                {/* Inline registrants list */}
                <RegistrantsInlinePanel
                  eventId={ev.id}
                  capacity={ev.capacity ?? 0}
                  fmtDate={fmtDate}
                  eventTitle={ev.title}
                />
              </>
            ) : (
              <ServiceDetails ev={ev} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Detail sub-components ────────────────────────────────────────────────────

function RegistrationDetails({ ev }: { ev: EventDoc }) {
  const deadlinePassed = ev.registrationDeadline && ev.registrationDeadline < new Date();
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px' }}>
      <InfoRow label="Kapasitas" value={`${ev.capacity} orang`} />
      <InfoRow label="Terdaftar" value={`${ev.currentRegistrants} orang`} />
      {ev.registrationDeadline && (
        <InfoRow label="Deadline"
          value={ev.registrationDeadline.toLocaleDateString('id-ID',
            { day: 'numeric', month: 'short', year: 'numeric' })
            + (deadlinePassed ? ' (BERAKHIR)' : '')}
          valueColor={deadlinePassed ? C.error : undefined} />
      )}
      {ev.details && <InfoRow label="Detail" value={ev.details} />}
    </div>
  );
}

function ServiceDetails({ ev }: { ev: EventDoc }) {
  if (!ev.assignments?.length) return (
    <p style={{ margin: 0, fontSize: 13, color: C.muted, fontStyle: 'italic' }}>Belum ada petugas.</p>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {ev.assignments.map((a, i) => {
        const sc = a.status === 'accepted' ? C.success
          : a.status === 'rejected' ? C.error : C.warn;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 12px', background: C.card, borderRadius: 8,
            border: `1.5px solid ${C.border}` }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              background: sc + '22', color: sc, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>
              {a.volunteerName[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text }}>{a.volunteerName}</p>
              <p style={{ margin: 0, fontSize: 11, color: C.muted }}>Tugas: {a.role}</p>
            </div>
            <span style={{ fontSize: 10, fontWeight: 800, color: sc,
              background: sc + '18', borderRadius: 5, padding: '2px 8px' }}>
              {a.status === 'accepted' ? 'DITERIMA' : a.status === 'rejected' ? 'DITOLAK' : 'MENUNGGU'}
            </span>
          </div>
        );
      })}
      {ev.is_finished && (ev.attendance_count !== undefined || ev.offering_amount !== undefined) && (
        <div style={{ display: 'flex', gap: 16, marginTop: 4, padding: '10px 14px',
          background: C.card, borderRadius: 8, border: `1.5px solid ${C.border}` }}>
          <InfoRow label="Kehadiran" value={`${ev.attendance_count ?? 0} orang`} />
          <InfoRow label="Persembahan"
            value={`Rp ${(ev.offering_amount ?? 0).toLocaleString('id-ID')}`} />
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: 11, color: C.muted, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 700,
        color: valueColor ?? C.text }}>{value}</p>
    </div>
  );
}

// ─── Kebaktian modal ──────────────────────────────────────────────────────────

function KebaktianModal({ schedules, existing, onClose }: {
  schedules: Schedule[]; existing: EventDoc | null; onClose: () => void;
}) {
  const [ministry, setMinistry] = useState(existing?.title ?? schedules[0]?.name ?? '');
  const [date, setDate] = useState(existing ? existing.date.toISOString().slice(0, 10) : '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [saving, setSaving] = useState(false);

  // ── Assignment state ──
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>(
    existing?.assignments ?? []
  );
  const [selectedVolId, setSelectedVolId] = useState('');
  const [roleInput, setRoleInput] = useState('');

  // Load volunteers (role === 'volunteer') once on mount
  useEffect(() => {
    getDocs(query(collection(db, 'users'), where('role', '==', 'volunteer'))).then(snap => {
      const vols: Volunteer[] = snap.docs.map(d => ({
        id: d.id,
        name: d.data().name ?? 'Tanpa Nama',
        ministries: d.data().ministries ?? [],
      })).sort((a, b) => a.name.localeCompare(b.name, 'id'));
      setVolunteers(vols);
      if (vols.length > 0 && !selectedVolId) setSelectedVolId(vols[0].id);
    });
  }, []);

  const addAssignment = () => {
    if (!selectedVolId || !roleInput.trim()) return;
    const vol = volunteers.find(v => v.id === selectedVolId);
    if (!vol) return;
    // Prevent duplicate volunteer
    if (assignments.some(a => a.volunteerId === selectedVolId)) return;
    setAssignments(prev => [...prev, {
      volunteerId: selectedVolId,
      volunteerName: vol.name,
      role: roleInput.trim(),
      status: 'pending',
    }]);
    setRoleInput('');
    // Move selector to next unassigned volunteer
    const next = volunteers.find(v =>
      v.id !== selectedVolId && !assignments.some(a => a.volunteerId === v.id) && v.id !== selectedVolId
    );
    if (next) setSelectedVolId(next.id);
  };

  const removeAssignment = (volunteerId: string) => {
    setAssignments(prev => prev.filter(a => a.volunteerId !== volunteerId));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;
    setSaving(true);
    try {
      const payload = {
        ministry, description,
        date: Timestamp.fromDate(new Date(date)),
        assignments,
      };
      if (existing) {
        await updateDoc(doc(db, 'service_events', existing.id), payload);
      } else {
        await addDoc(collection(db, 'service_events'), {
          ...payload, is_finished: false, createdAt: Timestamp.now(),
        });
      }
      onClose();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const assignedIds = new Set(assignments.map(a => a.volunteerId));
  const availableVols = volunteers.filter(v => !assignedIds.has(v.id));

  return (
    <Modal title={existing ? 'Edit Kebaktian' : 'Buat Kebaktian'} onClose={onClose} width={580}>
      <form onSubmit={handleSave}>
        {/* ── Basic info ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <FieldLabel>Jenis Kebaktian</FieldLabel>
            <select value={ministry} onChange={e => setMinistry(e.target.value)}
              required style={{ ...inputStyle }}
              onFocus={e => (e.target.style.borderColor = C.primary)}
              onBlur={e => (e.target.style.borderColor = C.border)}>
              {schedules.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>Tanggal</FieldLabel>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <FieldLabel>Keterangan / Tema (opsional)</FieldLabel>
          <TextArea rows={2} value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Tema ibadah, catatan khusus..." />
        </div>

        {/* ── Assignments section ── */}
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, marginBottom: 20 }}>
          <FieldLabel>Petugas / Volunteer</FieldLabel>

          {/* Add row */}
          <div style={{ display: 'flex', gap: 8, marginTop: 6, marginBottom: 12 }}>
            <select
              value={selectedVolId}
              onChange={e => setSelectedVolId(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
              onFocus={e => (e.target.style.borderColor = C.primary)}
              onBlur={e => (e.target.style.borderColor = C.border)}
            >
              {availableVols.length === 0
                ? <option value="">— Semua volunteer sudah ditambahkan —</option>
                : availableVols.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))
              }
            </select>
            <Input
              value={roleInput}
              onChange={e => setRoleInput(e.target.value)}
              placeholder="Tugas, mis. Liturgos"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAssignment(); }}}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              onClick={addAssignment}
              disabled={!selectedVolId || !roleInput.trim() || availableVols.length === 0}
              style={{
                padding: '9px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: (!selectedVolId || !roleInput.trim() || availableVols.length === 0)
                  ? '#e2e8f0' : C.primary,
                color: (!selectedVolId || !roleInput.trim() || availableVols.length === 0)
                  ? C.muted : '#fff',
                fontWeight: 700, fontSize: 13, fontFamily: 'inherit', flexShrink: 0,
              }}>
              + Tambah
            </button>
          </div>

          {/* Assignment list */}
          {assignments.length === 0 ? (
            <p style={{ margin: 0, fontSize: 12, color: C.muted, fontStyle: 'italic' }}>
              Belum ada petugas yang ditambahkan.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {assignments.map((a, i) => {
                const sc = a.status === 'accepted' ? C.success
                  : a.status === 'rejected' ? C.error : C.warn;
                const statusLabel = a.status === 'accepted' ? 'DITERIMA'
                  : a.status === 'rejected' ? 'DITOLAK' : 'MENUNGGU';
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 12px', borderRadius: 8,
                    background: C.bg, border: `1.5px solid ${C.border}`,
                  }}>
                    {/* Avatar */}
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: C.primaryBg, color: C.primary,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 800,
                    }}>
                      {a.volunteerName[0]?.toUpperCase()}
                    </div>
                    {/* Name + role */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {a.volunteerName}
                      </p>
                      <p style={{ margin: 0, fontSize: 11, color: C.muted }}>{a.role}</p>
                    </div>
                    {/* Status badge (only for existing assignments) */}
                    {existing && (
                      <span style={{
                        fontSize: 9, fontWeight: 800, color: sc,
                        background: sc + '18', border: `1px solid ${sc}33`,
                        borderRadius: 4, padding: '2px 7px', flexShrink: 0,
                      }}>
                        {statusLabel}
                      </span>
                    )}
                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => removeAssignment(a.volunteerId)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 24, height: 24, borderRadius: 5, flexShrink: 0,
                        background: C.errorBg, border: `1.5px solid ${C.errorBorder}`,
                        color: C.error, cursor: 'pointer',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = C.error;
                        (e.currentTarget as HTMLButtonElement).style.color = '#fff';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = C.errorBg;
                        (e.currentTarget as HTMLButtonElement).style.color = C.error;
                      }}
                    >
                      <XIcon />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <SaveBtn label={existing ? 'Simpan Perubahan' : 'Buat Kebaktian'} loading={saving} />
          <button type="button" onClick={onClose} style={{ padding: '10px 16px',
            background: 'transparent', color: C.sub, border: `1.5px solid ${C.border}`,
            borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Batal
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Registration modal ───────────────────────────────────────────────────────

function RegistrationModal({ existing, onClose }: {
  existing: EventDoc | null; onClose: () => void;
}) {
  const [title, setTitle] = useState(existing?.title ?? '');
  const [date, setDate] = useState(existing ? existing.date.toISOString().slice(0, 10) : '');
  const [deadline, setDeadline] = useState(
    existing?.registrationDeadline ? existing.registrationDeadline.toISOString().slice(0, 10) : ''
  );
  const [capacity, setCapacity] = useState(String(existing?.capacity ?? ''));
  const [description, setDescription] = useState(existing?.description ?? '');
  const [details, setDetails] = useState(existing?.details ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !capacity) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        type: 'registration', title, description, details,
        date: Timestamp.fromDate(new Date(date)),
        capacity: parseInt(capacity),
        registrationDeadline: deadline ? Timestamp.fromDate(new Date(deadline)) : null,
      };
      if (existing) {
        await updateDoc(doc(db, 'events', existing.id), payload);
      } else {
        await addDoc(collection(db, 'events'), {
          ...payload, currentRegistrants: 0, is_finished: false, createdAt: Timestamp.now(),
        });
      }
      onClose();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <Modal title={existing ? 'Edit Registrasi' : 'Buat Registrasi'} onClose={onClose} width={560}>
      <form onSubmit={handleSave}>
        <div style={{ marginBottom: 14 }}>
          <FieldLabel>Nama Event</FieldLabel>
          <Input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Retreat Pemuda 2026..." required />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <FieldLabel>Tanggal Event</FieldLabel>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
          <div>
            <FieldLabel>Deadline Registrasi (opsional)</FieldLabel>
            <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <FieldLabel>Kapasitas (orang)</FieldLabel>
          <Input type="number" value={capacity} onChange={e => setCapacity(e.target.value)}
            placeholder="50" min="1" required />
        </div>
        <div style={{ marginBottom: 14 }}>
          <FieldLabel>Deskripsi Singkat</FieldLabel>
          <TextArea rows={2} value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Tampil di list event..." />
        </div>
        <div style={{ marginBottom: 20 }}>
          <FieldLabel>Detail Lengkap</FieldLabel>
          <TextArea rows={4} value={details} onChange={e => setDetails(e.target.value)}
            placeholder="Informasi lengkap untuk peserta..." />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <SaveBtn label={existing ? 'Simpan Perubahan' : 'Buat Registrasi'} loading={saving} />
          <button type="button" onClick={onClose} style={{ padding: '10px 16px',
            background: 'transparent', color: C.sub, border: `1.5px solid ${C.border}`,
            borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Batal
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Volunteers modal ─────────────────────────────────────────────────────────

function VolunteersModal({ event: ev, onClose }: { event: EventDoc; onClose: () => void }) {
  const assignments = ev.assignments ?? [];
  return (
    <Modal title={`Petugas — ${ev.title}`} onClose={onClose} width={520}>
      {assignments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 32, color: C.muted, fontSize: 13 }}>
          Belum ada petugas yang di-assign.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {assignments.map((a, i) => {
            const sc = a.status === 'accepted' ? C.success
              : a.status === 'rejected' ? C.error : C.warn;
            const label = a.status === 'accepted' ? 'DITERIMA'
              : a.status === 'rejected' ? 'DITOLAK' : 'MENUNGGU';
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 9, border: `1.5px solid ${C.border}`,
                background: C.bg }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: sc + '22', color: sc, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800 }}>
                  {a.volunteerName[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.text }}>{a.volunteerName}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: C.muted }}>Tugas: {a.role}</p>
                </div>
                <span style={{ fontSize: 10, fontWeight: 800, color: sc,
                  background: sc + '18', border: `1px solid ${sc}33`,
                  borderRadius: 5, padding: '3px 9px', flexShrink: 0 }}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

// ─── Finish data modal ────────────────────────────────────────────────────────

function FinishDataModal({ event: ev, onClose }: { event: EventDoc; onClose: () => void }) {
  const [attCount, setAttCount] = useState(String(ev.attendance_count ?? ''));
  const [attNotes, setAttNotes] = useState(ev.attendance_notes ?? '');
  const [offAmount, setOffAmount] = useState(String(ev.offering_amount ?? ''));
  const [offNotes, setOffNotes] = useState(ev.offering_notes ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateDoc(doc(db, 'service_events', ev.id), {
        attendance_count: parseInt(attCount) || 0,
        attendance_notes: attNotes,
        offering_amount: parseInt(offAmount.replace(/\D/g, '')) || 0,
        offering_notes: offNotes,
      });
      onClose();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <Modal title={`Data Ibadah — ${ev.title}`} onClose={onClose}>
      <form onSubmit={handleSave}>
        <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: C.sub,
          textTransform: 'uppercase', letterSpacing: '0.07em' }}>Kehadiran</p>
        <div style={{ marginBottom: 12 }}>
          <FieldLabel>Jumlah Kehadiran</FieldLabel>
          <Input type="number" value={attCount} onChange={e => setAttCount(e.target.value)} placeholder="0" />
        </div>
        <div style={{ marginBottom: 20 }}>
          <FieldLabel>Catatan Kehadiran</FieldLabel>
          <TextArea rows={2} value={attNotes} onChange={e => setAttNotes(e.target.value)} />
        </div>
        <div style={{ height: 1, background: C.border, marginBottom: 16 }} />
        <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: C.sub,
          textTransform: 'uppercase', letterSpacing: '0.07em' }}>Persembahan</p>
        <div style={{ marginBottom: 12 }}>
          <FieldLabel>Total Persembahan (Rp)</FieldLabel>
          <Input type="number" value={offAmount} onChange={e => setOffAmount(e.target.value)} placeholder="0" />
        </div>
        <div style={{ marginBottom: 20 }}>
          <FieldLabel>Catatan Persembahan</FieldLabel>
          <TextArea rows={2} value={offNotes} onChange={e => setOffNotes(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <SaveBtn label="Simpan Data" loading={saving} />
          <button type="button" onClick={onClose} style={{ padding: '10px 16px',
            background: 'transparent', color: C.sub, border: `1.5px solid ${C.border}`,
            borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Batal
          </button>
        </div>
      </form>
    </Modal>
  );
}