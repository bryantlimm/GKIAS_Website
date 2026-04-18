// components/admin/AdminHomePage.tsx
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '@/lib/firebase';
import {
  collection, query, where, getDocs, onSnapshot,
  deleteDoc, doc, Timestamp,
} from 'firebase/firestore';
import * as XLSX from 'xlsx';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ServiceEvent {
  id: string;
  ministry: string;
  date: Date;
  offering_amount?: number;
  offering_notes?: string;
  attendance_count?: number;
  attendance_notes?: string;
  is_finished?: boolean;
  description?: string;
}

interface RegistrationEvent {
  id: string;
  title: string;
  date: Date;
  type: 'registration';
  capacity: number;
  currentRegistrants: number;
  description?: string;
  registrationDeadline?: Date;
  is_finished?: boolean;
}

interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: string;
  ministries?: string[];
  createdAt?: Date;
}

// ─── Colour palette ───────────────────────────────────────────────────────────
const C = {
  primary:  '#3b5bdb',
  primaryDark: '#2f4ac7',
  primaryBg: '#eff3ff',
  primaryBorder: '#c7d2fe',
  bg:       '#f0f4f8',
  card:     '#ffffff',
  border:   '#e8ecf0',
  text:     '#1e293b',
  sub:      '#64748b',
  muted:    '#94a3b8',
  success:  '#16a34a',
  successBg:'#f0fdf4',
  successBorder:'#bbf7d0',
  warn:     '#d97706',
  warnBg:   '#fffbeb',
  warnBorder: '#fde68a',
  error:    '#dc2626',
  errorBg:  '#fff5f5',
  errorBorder:'#fecaca',
};

// ─── Primitives ───────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
      {children}
    </p>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: C.text, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {children}
      </p>
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C.card, borderRadius: 12, border: `1.5px solid ${C.border}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: 20,
      ...style,
    }}>
      {children}
    </div>
  );
}

function SelectPill({
  value, options, onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        fontSize: 12, fontWeight: 600, color: C.primary,
        background: C.primaryBg, border: `1.5px solid ${C.primaryBorder}`,
        borderRadius: 20, padding: '3px 10px', cursor: 'pointer', outline: 'none',
        fontFamily: 'inherit',
      }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function DateRangePicker({
  from, to, onFromChange, onToChange,
}: {
  from: string; to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
}) {
  const inputStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: C.primary,
    background: C.primaryBg, border: `1.5px solid ${C.primaryBorder}`,
    borderRadius: 6, padding: '2px 6px', cursor: 'pointer', outline: 'none',
    fontFamily: 'inherit', minWidth: 0,
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 1, minWidth: 0 }}>
      <input type="date" value={from} onChange={e => onFromChange(e.target.value)} style={inputStyle} />
      <span style={{ fontSize: 10, color: C.muted, flexShrink: 0 }}>–</span>
      <input type="date" value={to} onChange={e => onToChange(e.target.value)} style={inputStyle} />
    </div>
  );
}

function RoleTag({ role }: { role: string }) {
  const map: Record<string, { label: string; color: string; bg: string; border: string }> = {
    admin:    { label: 'Admin',   color: C.error,   bg: C.errorBg,   border: C.errorBorder },
    volunteer:{ label: 'Pelayan', color: C.success,  bg: C.successBg, border: C.successBorder },
    regular:  { label: 'Jemaat',  color: C.sub,      bg: '#f1f5f9',   border: C.border },
  };
  const s = map[role] ?? map.regular;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, color: s.color,
      background: s.bg, border: `1.5px solid ${s.border}`,
      borderRadius: 20, padding: '3px 10px',
    }}>
      {s.label}
    </span>
  );
}

// ─── Line Chart ───────────────────────────────────────────────────────────────

function LineChart({
  data, width = 600, height = 220,
}: {
  data: { date: string; value: number }[];
  width?: number;
  height?: number;
}) {
  if (data.length === 0) return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 13 }}>
      Belum ada data
    </div>
  );

  const PAD = { top: 20, right: 20, bottom: 48, left: 52 };
  const W = width - PAD.left - PAD.right;
  const H = height - PAD.top - PAD.bottom;

  const maxVal = Math.max(...data.map(d => d.value), 1);
  const minVal = 0;

  const xScale = (i: number) => (i / (data.length - 1 || 1)) * W;
  const yScale = (v: number) => H - ((v - minVal) / (maxVal - minVal || 1)) * H;

  const points = data.map((d, i) => `${xScale(i)},${yScale(d.value)}`).join(' ');
  const areaPoints = `0,${H} ` + data.map((d, i) => `${xScale(i)},${yScale(d.value)}`).join(' ') + ` ${xScale(data.length - 1)},${H}`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => Math.round(minVal + t * (maxVal - minVal)));
  const xTickEvery = Math.ceil(data.length / 12);
  const xTicks = data.filter((_, i) => i % xTickEvery === 0 || i === data.length - 1);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.primary} stopOpacity="0.18" />
          <stop offset="100%" stopColor={C.primary} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <g transform={`translate(${PAD.left},${PAD.top})`}>
        {yTicks.map(t => (
          <g key={t}>
            <line x1={0} y1={yScale(t)} x2={W} y2={yScale(t)} stroke={C.border} strokeWidth={1} strokeDasharray="4 4" />
            <text x={-8} y={yScale(t) + 4} textAnchor="end" fontSize={10} fill={C.muted} fontFamily="Nunito, sans-serif">
              {t.toLocaleString('id-ID')}
            </text>
          </g>
        ))}
        <polygon points={areaPoints} fill="url(#chartGrad)" />
        <polyline points={points} fill="none" stroke={C.primary} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <circle key={i} cx={xScale(i)} cy={yScale(d.value)} r={3} fill={C.card} stroke={C.primary} strokeWidth={2} />
        ))}
        {xTicks.map((d, i) => {
          const origI = data.indexOf(d);
          return (
            <text key={i} x={xScale(origI)} y={H + 18} textAnchor="middle" fontSize={10} fill={C.muted} fontFamily="Nunito, sans-serif">
              {d.date}
            </text>
          );
        })}
      </g>
    </svg>
  );
}

// ─── Export CSV Modal ─────────────────────────────────────────────────────────

function ExportOfferingModal({
  onClose,
  finishedEvents,
  ministries,
}: {
  onClose: () => void;
  finishedEvents: ServiceEvent[];
  ministries: string[];
}) {
  const toDateStr = (d: Date) => d.toISOString().slice(0, 10);
  const thisMonthStart = () => {
    const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d;
  };

  const [from, setFrom] = useState(toDateStr(thisMonthStart()));
  const [to, setTo]     = useState(toDateStr(new Date()));
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMinistries, setSelectedMinistries] = useState<Set<string>>(new Set(ministries));

  const overlayRef = useRef<HTMLDivElement>(null);

  // Handle "Semua" checkbox
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMinistries(new Set(ministries));
    } else {
      setSelectedMinistries(new Set());
    }
  };

  // Handle individual ministry checkbox
  const handleMinistryToggle = (ministry: string) => {
    const updated = new Set(selectedMinistries);
    if (updated.has(ministry)) {
      updated.delete(ministry);
    } else {
      updated.add(ministry);
    }
    setSelectedMinistries(updated);
  };

  // Close on backdrop click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  // Preview: how many rows will be exported
  const previewCount = useMemo(() => {
    const f = new Date(from); f.setHours(0,0,0,0);
    const t = new Date(to);   t.setHours(23,59,59,999);
    const dates = new Set(
      finishedEvents
        .filter(e => e.offering_amount !== undefined && e.date >= f && e.date <= t)
        .map(e => e.date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }))
    );
    return dates.size;
  }, [from, to, finishedEvents]);

  const handleExport = () => {
    setError(null);
    if (!from || !to) { setError('Pilih rentang tanggal terlebih dahulu.'); return; }
    if (from > to)    { setError('Tanggal mulai tidak boleh setelah tanggal akhir.'); return; }
    if (selectedMinistries.size === 0) { setError('Pilih setidaknya satu pelayanan.'); return; }

    setExporting(true);

    try {
      const f = new Date(from); f.setHours(0,0,0,0);
      const t = new Date(to);   t.setHours(23,59,59,999);

      // Filter events in range that have offering data and are in selected ministries
      const inRange = finishedEvents.filter(
        e => e.offering_amount !== undefined && e.date >= f && e.date <= t && selectedMinistries.has(e.ministry)
      );

      if (inRange.length === 0) {
        setError('Tidak ada data persembahan dalam rentang tanggal ini.');
        setExporting(false);
        return;
      }

      // Build date → ministry → amount map
      // Date key: locale string for display
      const dateKeyOf = (d: Date) =>
        d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });

      const map: Record<string, Record<string, number>> = {};
      for (const e of inRange) {
        const dk = dateKeyOf(e.date);
        if (!map[dk]) map[dk] = {};
        map[dk][e.ministry] = (map[dk][e.ministry] ?? 0) + (e.offering_amount ?? 0);
      }

      // Sort dates chronologically
      const sortedDates = Object.keys(map).sort((a, b) => {
        // parse dd/mm/yyyy
        const parse = (s: string) => {
          const [d, m, y] = s.split('/');
          return new Date(+y, +m - 1, +d).getTime();
        };
        return parse(a) - parse(b);
      });

      // Only include selected ministries
      const ministriesInRange = Array.from(selectedMinistries).filter(m =>
        inRange.some(e => e.ministry === m)
      );

      if (ministriesInRange.length === 0) {
        setError('Tidak ada data untuk pelayanan yang dipilih dalam rentang tanggal ini.');
        setExporting(false);
        return;
      }

      // Build rows: header + data (transposed: ministries in rows, dates in columns)
      const header = ['Pelayanan', ...sortedDates];
      const rows = ministriesInRange.map(ministry => {
        return [
          ministry,
          ...sortedDates.map(dk => map[dk][ministry] ?? 0),
        ];
      });

      // Grand total row
      const totalRow = ['TOTAL', ...sortedDates.map(dk =>
        ministriesInRange.reduce((sum, m) => sum + (map[dk][m] ?? 0), 0)
      )];

      // Build worksheet
      const wsData = [header, ...rows, totalRow];
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Column widths
      ws['!cols'] = [
        { wch: 18 }, // Pelayanan
        ...sortedDates.map(() => ({ wch: 14 })),
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Persembahan');

      // Filename: persembahan_YYYYMMDD-YYYYMMDD.xlsx
      const fn = (s: string) => s.split('/').reverse().join(''); // ddmmyyyy → yyyymmdd... actually just use from/to
      const fileFrom = from.replace(/-/g, '');
      const fileTo   = to.replace(/-/g, '');
      XLSX.writeFile(wb, `persembahan_${fileFrom}-${fileTo}.xlsx`);

      onClose();
    } catch (e) {
      console.error(e);
      setError('Terjadi kesalahan saat mengekspor. Silakan coba lagi.');
    } finally {
      setExporting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px',
    border: `1.5px solid ${C.border}`, borderRadius: 8,
    fontSize: 14, color: C.text, background: '#fff',
    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,23,42,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        backdropFilter: 'blur(2px)',
      }}
    >
      <div style={{
        background: '#fff', borderRadius: 16,
        border: `1.5px solid ${C.border}`,
        boxShadow: '0 24px 64px rgba(0,0,0,0.16)',
        width: '100%', maxWidth: 440,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px 16px',
          borderBottom: `1px solid ${C.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9,
              background: C.primaryBg, border: `1.5px solid ${C.primaryBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: C.primary, flexShrink: 0,
            }}>
              <DownloadIcon />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.text }}>Ekspor Persembahan</p>
              <p style={{ margin: 0, fontSize: 12, color: C.muted }}>Unduh data sebagai file Excel (.xlsx)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: C.muted, padding: 4, display: 'flex', alignItems: 'center',
              borderRadius: 6,
            }}
          >
            <XSmallIcon />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px' }}>

          {/* Error */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '10px 12px', borderRadius: 8, marginBottom: 16,
              background: C.errorBg, border: `1.5px solid ${C.errorBorder}`,
            }}>
              <span style={{ color: C.error, flexShrink: 0, marginTop: 1 }}><ErrorIcon /></span>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.error }}>{error}</p>
            </div>
          )}

          {/* Ministry Filter */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Pilih Pelayanan
            </label>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8,
              padding: '12px', borderRadius: 8, border: `1px solid ${C.border}`,
              background: '#f8fafc',
            }}>
              {/* Semua checkbox */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: C.text }}>
                <input
                  type="checkbox"
                  checked={selectedMinistries.size === ministries.length}
                  onChange={e => handleSelectAll(e.target.checked)}
                  style={{ cursor: 'pointer', width: 16, height: 16 }}
                />
                Semua
              </label>
              {/* Individual ministry checkboxes */}
              {ministries.map(m => (
                <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: C.sub }}>
                  <input
                    type="checkbox"
                    checked={selectedMinistries.has(m)}
                    onChange={() => handleMinistryToggle(m)}
                    style={{ cursor: 'pointer', width: 16, height: 16 }}
                  />
                  {m}
                </label>
              ))}
            </div>
          </div>

          {/* Date range */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Dari Tanggal
              </label>
              <input
                type="date"
                value={from}
                max={to}
                onChange={e => setFrom(e.target.value)}
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = C.primary)}
                onBlur={e => (e.target.style.borderColor = C.border)}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Sampai Tanggal
              </label>
              <input
                type="date"
                value={to}
                min={from}
                onChange={e => setTo(e.target.value)}
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = C.primary)}
                onBlur={e => (e.target.style.borderColor = C.border)}
              />
            </div>
          </div>

          {/* Preview info */}
          <div style={{
            padding: '11px 14px', borderRadius: 8, marginBottom: 20,
            background: previewCount > 0 ? C.successBg : '#f8fafc',
            border: `1.5px solid ${previewCount > 0 ? C.successBorder : C.border}`,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ color: previewCount > 0 ? C.success : C.muted, flexShrink: 0 }}>
              <InfoIcon />
            </span>
            <p style={{ margin: 0, fontSize: 13, color: previewCount > 0 ? C.success : C.muted, fontWeight: 600 }}>
              {previewCount > 0
                ? `${previewCount} tanggal dengan data ditemukan dalam rentang ini`
                : 'Tidak ada data dalam rentang tanggal ini'}
            </p>
          </div>

          {/* CSV structure preview */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Struktur File
            </p>
            <div style={{
              borderRadius: 8, border: `1px solid ${C.border}`,
              overflow: 'hidden', fontSize: 11, fontFamily: 'monospace',
            }}>
              {/* Header row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: `100px repeat(${Math.min(ministries.length, 3)}, 1fr) 80px`,
                background: '#f8fafc', borderBottom: `1px solid ${C.border}`,
              }}>
                {['Tanggal', ...ministries.slice(0, 3), 'Total'].map((h, i) => (
                  <div key={i} style={{ padding: '6px 8px', fontWeight: 700, color: C.sub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {i === 3 && ministries.length > 3 ? `+${ministries.length - 2} lagi…` : h}
                  </div>
                ))}
              </div>
              {/* Sample row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: `100px repeat(${Math.min(ministries.length, 3)}, 1fr) 80px`,
                borderBottom: `1px solid ${C.border}`,
              }}>
                {['dd/mm/yyyy', ...ministries.slice(0, 3).map(() => 'Rp …'), 'Rp …'].map((v, i) => (
                  <div key={i} style={{ padding: '5px 8px', color: C.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {i === 3 && ministries.length > 3 ? '…' : v}
                  </div>
                ))}
              </div>
              {/* Total row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: `100px repeat(${Math.min(ministries.length, 3)}, 1fr) 80px`,
                background: '#f8fafc',
              }}>
                {['TOTAL', ...ministries.slice(0, 3).map(() => 'Rp …'), 'Rp …'].map((v, i) => (
                  <div key={i} style={{ padding: '5px 8px', fontWeight: 700, color: C.sub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {i === 3 && ministries.length > 3 ? '…' : v}
                  </div>
                ))}
              </div>
            </div>
          </div>

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
              disabled={exporting || previewCount === 0}
              style={{
                flex: 2, padding: '11px 0', borderRadius: 9,
                cursor: exporting || previewCount === 0 ? 'not-allowed' : 'pointer',
                background: exporting || previewCount === 0 ? C.muted : C.primary,
                border: 'none',
                fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                transition: 'background 0.15s',
              }}
            >
              {exporting ? (
                <>
                  <SpinnerIcon />
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

// ─── Export Users Modal ───────────────────────────────────────────────────────

function ExportUsersModal({
  onClose,
  users,
}: {
  onClose: () => void;
  users: UserAccount[];
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
      const header = ['Nama', 'Email', 'Role', 'Pelayanan', 'Tanggal Bergabung'];
      const rows = users.map(u => [
        u.name,
        u.email,
        u.role.charAt(0).toUpperCase() + u.role.slice(1), // Capitalize role
        u.ministries && u.ministries.length > 0 ? u.ministries.join(', ') : '-',
        u.createdAt
          ? u.createdAt.toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit' })
          : '-',
      ]);

      const wsData = [header, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Column widths
      ws['!cols'] = [
        { wch: 25 }, // Nama
        { wch: 25 }, // Email
        { wch: 15 }, // Role
        { wch: 30 }, // Pelayanan
        { wch: 18 }, // Tanggal Bergabung
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Akun');

      // Filename
      const now = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const filename = `akun_${now}.xlsx`;

      XLSX.writeFile(wb, filename);
      onClose();
    } catch (e) {
      console.error('Export error:', e);
      alert('Gagal mengekspor data akun');
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
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: C.text }}>Ekspor Akun</p>
            <p style={{ margin: 0, fontSize: 12, color: C.muted }}>Unduh daftar akun sebagai file Excel</p>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px' }}>
          <div style={{
            padding: '12px', borderRadius: 8, background: '#f0fdf4',
            border: '1px solid #bbf7d0', marginBottom: 16,
          }}>
            <p style={{ margin: 0, fontSize: 13, color: '#166534', fontWeight: 600 }}>
              ✓ Siap mengekspor {users.length} akun
            </p>
          </div>

          {/* <div style={{ marginBottom: 16 }}>
            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Kolom yang akan diekspor
            </p>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: C.sub }}>
              <li>Nama akun</li>
              <li>Email</li>
              <li>Role (Admin, Volunteer, Regular)</li>
              <li>Pelayanan yang ditangani</li>
              <li>Tanggal bergabung</li>
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
              disabled={exporting || users.length === 0}
              style={{
                flex: 2, padding: '11px 0', borderRadius: 9,
                cursor: exporting || users.length === 0 ? 'not-allowed' : 'pointer',
                background: exporting || users.length === 0 ? C.muted : C.primary,
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

// ─── Main AdminHomePage ───────────────────────────────────────────────────────

export default function AdminHomePage() {
  const [serviceEvents, setServiceEvents] = useState<ServiceEvent[]>([]);
  const [regEvents, setRegEvents] = useState<RegistrationEvent[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showExportUsersModal, setShowExportUsersModal] = useState(false);

  const [offeringService, setOfferingService]   = useState('all');
  const [attendanceService, setAttendanceService] = useState('all');

  const thisMonthStart = () => {
    const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d;
  };
  const toDateStr = (d: Date) => d.toISOString().slice(0, 10);

  const [offeringFrom, setOfferingFrom]     = useState(toDateStr(thisMonthStart()));
  const [offeringTo, setOfferingTo]         = useState(toDateStr(new Date()));
  const [attendanceFrom, setAttendanceFrom] = useState(toDateStr(thisMonthStart()));
  const [attendanceTo, setAttendanceTo]     = useState(toDateStr(new Date()));
  const [chartService, setChartService] = useState('all');

  useEffect(() => {
    const load = async () => {
      try {
        const seSnap = await getDocs(collection(db, 'service_events'));
        const se: ServiceEvent[] = seSnap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            ministry: data.ministry ?? 'Kebaktian',
            date: (data.date as Timestamp).toDate(),
            offering_amount: data.offering_amount,
            offering_notes: data.offering_notes,
            attendance_count: data.attendance_count,
            attendance_notes: data.attendance_notes,
            is_finished: data.is_finished ?? false,
            description: data.description,
          };
        }).sort((a, b) => b.date.getTime() - a.date.getTime());
        setServiceEvents(se);

        const evSnap = await getDocs(
          query(collection(db, 'events'), where('type', '==', 'registration'))
        );
        const re: RegistrationEvent[] = evSnap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            title: data.title ?? 'Event',
            date: (data.date as Timestamp).toDate(),
            type: 'registration' as const,
            capacity: data.capacity ?? 0,
            currentRegistrants: data.currentRegistrants ?? 0,
            description: data.description,
            registrationDeadline: data.registrationDeadline
              ? (data.registrationDeadline as Timestamp).toDate()
              : undefined,
            is_finished: data.is_finished ?? false,
          };
        }).sort((a, b) => a.date.getTime() - b.date.getTime());
        setRegEvents(re);

        const usSnap = await getDocs(collection(db, 'users'));
        const us: UserAccount[] = usSnap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name ?? 'Tanpa Nama',
            email: data.email ?? '',
            role: data.role ?? 'regular',
            ministries: data.ministries ?? [],
            createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : undefined,
          };
        }).sort((a, b) => a.name.localeCompare(b.name, 'id'));
        setUsers(us);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const ministries = useMemo(() => {
    const set = new Set(serviceEvents.map(e => e.ministry));
    return Array.from(set).sort();
  }, [serviceEvents]);

  const serviceOptions = [{ value: 'all', label: 'Semua' }, ...ministries.map(m => ({ value: m, label: m }))];
  const finishedEvents = useMemo(() => serviceEvents.filter(e => e.is_finished), [serviceEvents]);

  function lastFinishedByService(ministry: string): ServiceEvent | undefined {
    const pool = ministry === 'all' ? finishedEvents : finishedEvents.filter(e => e.ministry === ministry);
    return pool[0];
  }

  function sumInRange(field: 'offering_amount' | 'attendance_count', from: string, to: string): number {
    const f = new Date(from); f.setHours(0,0,0,0);
    const t = new Date(to);   t.setHours(23,59,59,999);
    return finishedEvents
      .filter(e => e.date >= f && e.date <= t)
      .reduce((acc, e) => acc + (e[field] ?? 0), 0);
  }

  const lastOffering = useMemo(() => {
    if (offeringService === 'all') {
      const byMinistry: Record<string, number> = {};
      for (const e of finishedEvents) {
        if (!(e.ministry in byMinistry) && e.offering_amount !== undefined) {
          byMinistry[e.ministry] = e.offering_amount;
        }
      }
      const vals = Object.values(byMinistry);
      return vals.length ? vals.reduce((a, b) => a + b, 0) : undefined;
    }
    return lastFinishedByService(offeringService)?.offering_amount;
  }, [offeringService, finishedEvents]);

  const totalOffering   = useMemo(() => sumInRange('offering_amount',  offeringFrom,   offeringTo),   [offeringFrom, offeringTo, finishedEvents]);
  const totalAttendance = useMemo(() => sumInRange('attendance_count', attendanceFrom, attendanceTo), [attendanceFrom, attendanceTo, finishedEvents]);

  const lastAttendance = useMemo(() => {
    if (attendanceService === 'all') {
      const byMinistry: Record<string, number> = {};
      for (const e of finishedEvents) {
        if (!(e.ministry in byMinistry) && e.attendance_count !== undefined) {
          byMinistry[e.ministry] = e.attendance_count;
        }
      }
      const vals = Object.values(byMinistry);
      return vals.length ? vals.reduce((a, b) => a + b, 0) : undefined;
    }
    return lastFinishedByService(attendanceService)?.attendance_count;
  }, [attendanceService, finishedEvents]);

  const chartData = useMemo(() => {
    const pool = chartService === 'all'
      ? finishedEvents
      : finishedEvents.filter(e => e.ministry === chartService);
    const map: Record<string, number> = {};
    for (const e of pool) {
      if (e.attendance_count === undefined) continue;
      const key = e.date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      map[key] = (map[key] ?? 0) + e.attendance_count;
    }
    const sorted = [...pool]
      .filter(e => e.attendance_count !== undefined)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    const seen = new Set<string>();
    const result: { date: string; value: number }[] = [];
    for (const e of sorted) {
      const key = e.date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ date: key, value: map[key] });
      }
    }
    return result;
  }, [chartService, finishedEvents]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return [
      ...serviceEvents
        .filter(e => !e.is_finished)
        .map(e => ({
          id: e.id, title: e.ministry, date: e.date,
          type: 'kebaktian' as const, subtitle: e.description ?? '',
          badge: null as string | null, isFull: false,
        })),
      ...regEvents
        .filter(e => !e.is_finished && e.date > now)
        .map(e => ({
          id: e.id, title: e.title, date: e.date,
          type: 'registrasi' as const, subtitle: e.description ?? '',
          badge: `${e.currentRegistrants}/${e.capacity}`,
          isFull: e.currentRegistrants >= e.capacity,
        })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [serviceEvents, regEvents]);

  const filteredUsers = useMemo(() => {
    if (!userSearch) return users;
    const q = userSearch.toLowerCase();
    return users.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, userSearch]);

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Hapus akun "${userName}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setDeletingId(userId);
    try {
      await deleteDoc(doc(db, 'users', userId));
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (e) {
      alert('Gagal menghapus akun.');
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  const fmtCurrency = (v?: number) => v === undefined ? '—' : `Rp ${v.toLocaleString('id-ID')}`;
  const fmtNumber = (v?: number) => v === undefined ? '—' : v.toLocaleString('id-ID');
  const fmtDate = (d: Date) => d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh', color: C.muted, fontFamily: 'Nunito, sans-serif' }}>
      Memuat data...
    </div>
  );

  return (
    <div style={{ fontFamily: 'Nunito, sans-serif' }}>

      {/* Export Modal */}
      {showExportModal && (
        <ExportOfferingModal
          onClose={() => setShowExportModal(false)}
          finishedEvents={finishedEvents}
          ministries={ministries}
        />
      )}

      {/* Export Users Modal */}
      {showExportUsersModal && (
        <ExportUsersModal
          onClose={() => setShowExportUsersModal(false)}
          users={filteredUsers}
        />
      )}

      {/* ══ SECTION 1: STAT CARDS ══════════════════════════════════════════ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div /> {/* spacer */}
        {/* Export button */}
        <button
          onClick={() => setShowExportModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '8px 16px', borderRadius: 9, cursor: 'pointer',
            background: C.primaryBg, border: `1.5px solid ${C.primaryBorder}`,
            fontSize: 13, fontWeight: 700, color: C.primary, fontFamily: 'inherit',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = C.primary;
            e.currentTarget.style.color = '#fff';
            e.currentTarget.style.borderColor = C.primary;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = C.primaryBg;
            e.currentTarget.style.color = C.primary;
            e.currentTarget.style.borderColor = C.primaryBorder;
          }}
        >
          <DownloadIcon />
          Ekspor Persembahan
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard
          label="Persembahan Terakhir"
          value={fmtCurrency(lastOffering)}
          valueColor={C.primary}
          filter={<SelectPill value={offeringService} options={serviceOptions} onChange={setOfferingService} />}
          sub={offeringService === 'all' ? 'Gabungan semua kebaktian' : `Kebaktian: ${offeringService}`}
        />
        <StatCard
          label="Total Persembahan"
          value={fmtCurrency(totalOffering)}
          valueColor={C.primary}
          filter={<DateRangePicker from={offeringFrom} to={offeringTo} onFromChange={setOfferingFrom} onToChange={setOfferingTo} />}
          sub="Dalam rentang tanggal terpilih"
        />
        <StatCard
          label="Kehadiran Terakhir"
          value={fmtNumber(lastAttendance) + (lastAttendance !== undefined ? ' orang' : '')}
          valueColor={C.primary}
          filter={<SelectPill value={attendanceService} options={serviceOptions} onChange={setAttendanceService} />}
          sub={attendanceService === 'all' ? 'Gabungan semua kebaktian' : `Kebaktian: ${attendanceService}`}
        />
        <StatCard
          label="Total Kehadiran"
          value={fmtNumber(totalAttendance) + (totalAttendance > 0 ? ' orang' : '')}
          valueColor={C.primary}
          filter={<DateRangePicker from={attendanceFrom} to={attendanceTo} onFromChange={setAttendanceFrom} onToChange={setAttendanceTo} />}
          sub="Dalam rentang tanggal terpilih"
        />
      </div>

      {/* ══ SECTION 2: CHART + UPCOMING ═══════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 16, marginBottom: 32 }}>
        <Card style={{ padding: '20px 20px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: C.text }}>Kehadiran per Ibadah</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: C.muted }}>Berdasarkan ibadah yang telah selesai</p>
            </div>
            <SelectPill value={chartService} options={serviceOptions} onChange={setChartService} />
          </div>
          <div style={{ width: '100%', height: 220 }}>
            <LineChart data={chartData} />
          </div>
        </Card>

        <Card style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: 320 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px', borderBottom: `1px solid ${C.border}` }}>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: C.text }}>Event Mendatang</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: C.muted }}>{upcomingEvents.length} event</p>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px 12px' }}>
            {upcomingEvents.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: C.muted, fontSize: 13 }}>
                Tidak ada event mendatang.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {upcomingEvents.map(ev => {
                  const isReg = ev.type === 'registrasi';
                  const typeColor  = isReg ? C.success  : C.primary;
                  const typeBg     = isReg ? C.successBg : C.primaryBg;
                  const typeBorder = isReg ? C.successBorder : C.primaryBorder;
                  const isPast = ev.date < new Date();
                  return (
                    <div key={ev.id} style={{ padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${isPast ? C.warnBorder : typeBorder}`, background: isPast ? C.warnBg : '#fafbfc' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{ flexShrink: 0, width: 36, textAlign: 'center', background: isPast ? '#fff' : typeBg, borderRadius: 7, padding: '3px 4px', border: `1px solid ${isPast ? C.warnBorder : typeBorder}` }}>
                          <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: isPast ? C.warn : typeColor, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                            {ev.date.toLocaleDateString('id-ID', { month: 'short' })}
                          </p>
                          <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: isPast ? C.warn : typeColor, lineHeight: 1 }}>
                            {ev.date.getDate()}
                          </p>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.4px', color: typeColor, background: typeBg, border: `1px solid ${typeBorder}`, borderRadius: 4, padding: '1px 5px', textTransform: 'uppercase', flexShrink: 0 }}>
                              {isReg ? 'REGISTRASI' : 'IBADAH'}
                            </span>
                            {isPast && (
                              <span style={{ fontSize: 9, fontWeight: 700, color: C.warn, background: C.warnBg, border: `1px solid ${C.warnBorder}`, borderRadius: 4, padding: '1px 5px' }}>
                                BELUM SELESAI
                              </span>
                            )}
                          </div>
                          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {ev.title}
                          </p>
                          {ev.subtitle && (
                            <p style={{ margin: '1px 0 0', fontSize: 10, color: C.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {ev.subtitle}
                            </p>
                          )}
                        </div>
                        {ev.badge && (
                          <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, color: ev.isFull ? C.error : C.success, background: ev.isFull ? C.errorBg : C.successBg, border: `1px solid ${ev.isFull ? C.errorBorder : C.successBorder}`, borderRadius: 5, padding: '2px 6px' }}>
                            {ev.badge}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ══ SECTION 3: USERS ══════════════════════════════════════════════ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <SectionHeading>Daftar Akun</SectionHeading>
        </div>
        {filteredUsers.length > 0 && (
          <button
            onClick={() => setShowExportUsersModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 16px', borderRadius: 9, cursor: 'pointer',
              background: C.primaryBg, border: `1.5px solid ${C.primaryBorder}`,
              fontSize: 13, fontWeight: 700, color: C.primary, fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = C.primary;
              e.currentTarget.style.color = '#fff';
              e.currentTarget.style.borderColor = C.primary;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = C.primaryBg;
              e.currentTarget.style.color = C.primary;
              e.currentTarget.style.borderColor = C.primaryBorder;
            }}
          >
            <DownloadIcon />
            Ekspor Akun
          </button>
        )}
      </div>
      <div style={{ position: 'relative', marginBottom: 16, maxWidth: 400 }}>
        <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }}>
          <SearchIcon />
        </div>
        <input
          type="text"
          placeholder="Cari nama atau email..."
          value={userSearch}
          onChange={e => setUserSearch(e.target.value)}
          style={{ width: '100%', padding: '10px 14px 10px 38px', border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 14, color: C.text, background: C.card, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
          onFocus={e => (e.target.style.borderColor = C.primary)}
          onBlur={e => (e.target.style.borderColor = C.border)}
        />
        {userSearch && (
          <button onClick={() => setUserSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', alignItems: 'center', padding: 2 }}>
            <XSmallIcon />
          </button>
        )}
      </div>

      <p style={{ margin: '0 0 12px', fontSize: 13, color: C.muted }}>
        {filteredUsers.length} dari {users.length} akun
      </p>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 2.5fr 1fr 1fr auto', gap: 0, padding: '10px 20px', background: '#f8fafc', borderBottom: `1px solid ${C.border}` }}>
          {['Nama', 'Email', 'Role', 'Bergabung', ''].map(h => (
            <span key={h} style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</span>
          ))}
        </div>
        {filteredUsers.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: C.muted, fontSize: 14 }}>Tidak ada akun yang cocok.</div>
        ) : (
          filteredUsers.map((user, i) => (
            <div
              key={user.id}
              style={{ display: 'grid', gridTemplateColumns: '2fr 2.5fr 1fr 1fr auto', gap: 0, padding: '14px 20px', alignItems: 'center', borderBottom: i < filteredUsers.length - 1 ? `1px solid ${C.border}` : 'none', transition: 'background 0.12s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#fafbfc')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: C.primaryBg, color: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>
                  {user.name[0]?.toUpperCase() ?? 'U'}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</p>
                  {user.ministries && user.ministries.length > 0 && (
                    <p style={{ margin: 0, fontSize: 11, color: C.muted }}>{user.ministries.join(', ')}</p>
                  )}
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: C.sub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</p>
              <div><RoleTag role={user.role} /></div>
              <p style={{ margin: 0, fontSize: 12, color: C.muted }}>{user.createdAt ? fmtDate(user.createdAt) : '—'}</p>
              <button
                onClick={() => handleDeleteUser(user.id, user.name)}
                disabled={deletingId === user.id || user.role === 'admin'}
                title={user.role === 'admin' ? 'Admin tidak bisa dihapus dari sini' : 'Hapus akun'}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 7, background: user.role === 'admin' ? '#f1f5f9' : '#fff5f5', border: `1.5px solid ${user.role === 'admin' ? C.border : '#fecaca'}`, color: user.role === 'admin' ? C.muted : C.error, cursor: user.role === 'admin' || deletingId === user.id ? 'not-allowed' : 'pointer', opacity: deletingId === user.id ? 0.5 : 1, transition: 'all 0.15s' }}
                onMouseEnter={e => { if (user.role !== 'admin' && deletingId !== user.id) { e.currentTarget.style.background = C.error; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = C.error; } }}
                onMouseLeave={e => { if (user.role !== 'admin') { e.currentTarget.style.background = '#fff5f5'; e.currentTarget.style.color = C.error; e.currentTarget.style.borderColor = '#fecaca'; } }}
              >
                <TrashSmallIcon />
              </button>
            </div>
          ))
        )}
      </Card>
      <div style={{ height: 40 }} />
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, valueColor, filter, sub }: {
  label: string; value: string; valueColor: string; filter: React.ReactNode; sub: string;
}) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: `1.5px solid ${C.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.sub }}>{label}</p>
        {filter}
      </div>
      <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: valueColor, lineHeight: 1.1 }}>{value}</p>
      <p style={{ margin: '6px 0 0', fontSize: 11, color: C.muted }}>{sub}</p>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}

function XSmallIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

function TrashSmallIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
      <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" style={{ animation: 'spin 0.8s linear infinite', transformOrigin: 'center' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}