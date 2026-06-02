'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';
import {
  collection, addDoc, getDocs, doc, deleteDoc,
  query, orderBy, Timestamp, getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
);

const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface Schedule {
  id: string;
  name: string;
  time: string;
  order: number;
}

interface OfferingRow {
  nominal: number;
  qty: number;
}

const OFFERING_NOMINALS = [100000, 50000, 20000, 10000, 5000, 1000];

interface AttendancePerson {
  name: string;
  gender: 'pria' | 'wanita';
}

interface SMClass {
  id: string;
  label: string;
  members: AttendancePerson[];
}

// For regular services
interface RegularAttendance {
  pria: number;
  wanita: number;
  notes: string;
}

// For Sunday school
interface SMAttendance {
  classes: SMClass[];
}

interface Volunteer {
  id: string;
  role: string;
  status: string;
  volunteerId: string;
  volunteerName: string;
}

interface ServiceEvent {
  id: string;
  ministry: string;
  date: Timestamp;
  description: string;
  is_finished: boolean;
  attendance_count: number;
  attendance_notes: string;
  offering_amount: number;
  offering_notes: string;
  offering_breakdown: OfferingRow[];
  attendance_data?: RegularAttendance | SMAttendance;
  createdAt: Timestamp;
  createdBy?: string;
  createdByName?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatRp = (n: number | undefined | null) =>
  'Rp ' + (n ?? 0).toLocaleString('id-ID');

const isSM = (name: string) =>
  name.toLowerCase().includes('sekolah minggu') || name.toLowerCase().includes('sm');

const formatDate = (ts: Timestamp | undefined | null) => {
  if (!ts?.toDate) return '—';
  const d = ts.toDate();
  return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

const formatDateShort = (ts: Timestamp | undefined | null) => {
  if (!ts?.toDate) return '—';
  const d = ts.toDate();
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

// ─── PDF Generator (client-side via jsPDF from CDN) ──────────────────────────

declare global {
  interface Window {
    jspdf?: { jsPDF: new (options: Record<string, unknown>) => unknown };
  }
}

type JsPDFConstructor = new (options: Record<string, unknown>) => unknown;

async function loadJsPDF(): Promise<JsPDFConstructor> {
  return new Promise((resolve, reject) => {
    if (window.jspdf) { resolve(window.jspdf.jsPDF); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = () => {
      if (window.jspdf) resolve(window.jspdf.jsPDF);
      else reject(new Error('jsPDF not found after load'));
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function generatePDF(event: ServiceEvent) {
  const JsPDF = await loadJsPDF();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as any;

  const margin = 18;
  const pageW = 210;
  const contentW = pageW - margin * 2;
  let y = margin;

  // ── Header ──
  doc.setFillColor(59, 91, 219);
  doc.rect(0, 0, pageW, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('GKI Alam Sutera', margin, 13);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Laporan Ibadah', margin, 21);
  doc.text(formatDateShort(event.date), pageW - margin, 21, { align: 'right' });
  y = 42;

  // ── Service info ──
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(event.ministry, margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(formatDate(event.date), margin, y);
  if (event.description) {
    y += 5;
    doc.text('Tema: ' + event.description, margin, y);
  }
  y += 10;

  // ── Divider ──
  doc.setDrawColor(232, 236, 240);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // ── Attendance ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text('KEHADIRAN', margin, y);
  y += 7;

  const smAttendance = event.attendance_data as SMAttendance | undefined;
  const regAttendance = event.attendance_data as RegularAttendance | undefined;

  if (isSM(event.ministry) && smAttendance?.classes) {
    // Sunday school table
    let totalPria = 0, totalWanita = 0;
    smAttendance.classes.forEach(cls => {
      const pria = cls.members.filter(m => m.gender === 'pria').length;
      const wanita = cls.members.filter(m => m.gender === 'wanita').length;
      totalPria += pria;
      totalWanita += wanita;

      // Class header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(59, 91, 219);
      doc.text(cls.label, margin, y);
      y += 5;

      // Members list
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      cls.members.forEach(m => {
        doc.text(`• ${m.name} (${m.gender === 'pria' ? 'L' : 'P'})`, margin + 4, y);
        y += 4.5;
        if (y > 270) { doc.addPage(); y = margin; }
      });

      // Class summary
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Pria: ${pria}  Wanita: ${wanita}  Total: ${pria + wanita}`, margin + 4, y);
      y += 7;
    });

    // Grand total row
    doc.setFillColor(239, 243, 255);
    doc.roundedRect(margin, y - 1, contentW, 10, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(`Total Kehadiran`, margin + 3, y + 6);
    doc.text(`Pria: ${totalPria}   Wanita: ${totalWanita}   Total: ${totalPria + totalWanita}`, pageW - margin - 3, y + 6, { align: 'right' });
    y += 16;
  } else {
    // Regular attendance
    const pria = regAttendance?.pria ?? 0;
    const wanita = regAttendance?.wanita ?? 0;
    const total = pria + wanita;

    const colW = contentW / 3;
    const cells = [
      { label: 'Pria', value: String(pria) },
      { label: 'Wanita', value: String(wanita) },
      { label: 'Total', value: String(total), highlight: true },
    ];
    cells.forEach((cell, i) => {
      const x = margin + i * colW;
      doc.setFillColor(cell.highlight ? 59 : 248, cell.highlight ? 91 : 250, cell.highlight ? 219 : 252);
      doc.roundedRect(x, y, colW - 3, 18, 3, 3, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(cell.highlight ? 255 : 100, cell.highlight ? 255 : 116, cell.highlight ? 255 : 139);
      doc.text(cell.label, x + (colW - 3) / 2, y + 6, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(cell.highlight ? 255 : 30, cell.highlight ? 255 : 41, cell.highlight ? 255 : 59);
      doc.text(cell.value, x + (colW - 3) / 2, y + 14, { align: 'center' });
    });
    y += 26;

    if (regAttendance?.notes) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text('Catatan: ' + regAttendance.notes, margin, y);
      y += 8;
    }
  }

  // ── Divider ──
  doc.setDrawColor(232, 236, 240);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // ── Offering ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text('PERSEMBAHAN', margin, y);
  y += 7;

  // Table header
  doc.setFillColor(239, 243, 255);
  doc.rect(margin, y, contentW, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(59, 91, 219);
  doc.text('Nominal', margin + 3, y + 5);
  doc.text('Jumlah', margin + 60, y + 5);
  doc.text('Subtotal', pageW - margin - 3, y + 5, { align: 'right' });
  y += 9;

  event.offering_breakdown.forEach((row, idx) => {
    if (row.qty === 0) return;
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 1, contentW, 7, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(formatRp(row.nominal), margin + 3, y + 5);
    doc.text('× ' + row.qty, margin + 60, y + 5);
    doc.text(formatRp(row.nominal * row.qty), pageW - margin - 3, y + 5, { align: 'right' });
    y += 7;
  });

  y += 3;
  doc.setFillColor(59, 91, 219);
  doc.roundedRect(margin, y, contentW, 12, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL PERSEMBAHAN', margin + 4, y + 8);
  doc.text(formatRp(event.offering_amount), pageW - margin - 4, y + 8, { align: 'right' });
  y += 20;

  if (event.offering_notes) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Catatan: ' + event.offering_notes, margin, y);
    y += 8;
  }

  // ── Footer ──
  const pageH = 297;
  doc.setDrawColor(232, 236, 240);
  doc.line(margin, pageH - 18, pageW - margin, pageH - 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('GKI Alam Sutera — Dokumen ini digenerate otomatis oleh sistem', pageW / 2, pageH - 11, { align: 'center' });
  if (event.createdByName) {
    doc.text('Dibuat oleh: ' + event.createdByName, pageW / 2, pageH - 6, { align: 'center' });
  }

  const fileName = `laporan-${event.ministry.replace(/\s+/g, '-').toLowerCase()}-${event.date.toDate().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

// Offering table
function OfferingTable({
  rows, onChange,
}: {
  rows: OfferingRow[];
  onChange: (rows: OfferingRow[]) => void;
}) {
  const total = rows.reduce((s, r) => s + r.nominal * r.qty, 0);

  return (
    <div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#eff3ff' }}>
            {['Nominal', 'Jumlah Lembar/Keping', 'Subtotal'].map(h => (
              <th key={h} style={{ padding: '8px 10px', textAlign: h === 'Subtotal' ? 'right' : 'left', color: '#3b5bdb', fontWeight: 700, fontSize: 12 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.nominal} style={{ background: i % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '8px 10px', fontWeight: 600, color: '#1e293b' }}>{formatRp(row.nominal)}</td>
              <td style={{ padding: '6px 10px' }}>
                <input
                  type="number"
                  min={0}
                  value={row.qty || ''}
                  placeholder="0"
                  onChange={e => {
                    const newRows = [...rows];
                    newRows[i] = { ...row, qty: parseInt(e.target.value) || 0 };
                    onChange(newRows);
                  }}
                  style={{
                    width: 80, padding: '5px 8px', border: '1px solid #e2e8f0',
                    borderRadius: 6, fontSize: 13, textAlign: 'center', fontFamily: 'inherit',
                  }}
                />
              </td>
              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: row.qty ? '#3b5bdb' : '#cbd5e1' }}>
                {row.qty ? formatRp(row.nominal * row.qty) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: '#3b5bdb' }}>
            <td colSpan={2} style={{ padding: '10px 10px', color: '#ffffff', fontWeight: 700, fontSize: 13 }}>TOTAL</td>
            <td style={{ padding: '10px 10px', textAlign: 'right', color: '#ffffff', fontWeight: 800, fontSize: 14 }}>{formatRp(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// Regular attendance
function RegularAttendanceForm({
  value, onChange,
}: {
  value: RegularAttendance;
  onChange: (v: RegularAttendance) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 12 }}>
        {(['pria', 'wanita'] as const).map(g => (
          <div key={g} style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 5, textTransform: 'uppercase' }}>
              {g === 'pria' ? 'Pria' : 'Wanita'}
            </label>
            <input
              type="number" min={0}
              value={value[g] || ''}
              placeholder="0"
              onChange={e => onChange({ ...value, [g]: parseInt(e.target.value) || 0 })}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 16, textAlign: 'center', fontFamily: 'inherit', fontWeight: 700 }}
            />
          </div>
        ))}
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 5, textTransform: 'uppercase' }}>Total</label>
          <div style={{
            width: '100%', padding: '10px 12px', background: '#eff3ff',
            borderRadius: 8, fontSize: 16, textAlign: 'center', fontWeight: 800, color: '#3b5bdb',
          }}>
            {value.pria + value.wanita}
          </div>
        </div>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 5 }}>Catatan (opsional)</label>
        <input
          type="text"
          value={value.notes}
          onChange={e => onChange({ ...value, notes: e.target.value })}
          placeholder="Catatan kehadiran..."
          style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' }}
        />
      </div>
    </div>
  );
}

// Sunday school attendance
const DEFAULT_SM_CLASSES: SMClass[] = [
  { id: 'kecil', label: 'Kelas Kecil', members: [] },
  { id: 'besar', label: 'Kelas Besar', members: [] },
  { id: 'guru', label: 'Guru', members: [] },
];

function SMAttendanceForm({
  value, onChange,
}: {
  value: SMAttendance;
  onChange: (v: SMAttendance) => void;
}) {
  const [newClassName, setNewClassName] = useState('');
  const [newMemberName, setNewMemberName] = useState<Record<string, string>>({});
  const [newMemberGender, setNewMemberGender] = useState<Record<string, 'pria' | 'wanita'>>({});

  const addMember = (classId: string) => {
    const name = (newMemberName[classId] || '').trim();
    if (!name) return;
    const gender = newMemberGender[classId] || 'pria';
    const updated = value.classes.map(c =>
      c.id === classId ? { ...c, members: [...c.members, { name, gender }] } : c
    );
    onChange({ classes: updated });
    setNewMemberName(p => ({ ...p, [classId]: '' }));
  };

  const removeMember = (classId: string, idx: number) => {
    const updated = value.classes.map(c =>
      c.id === classId ? { ...c, members: c.members.filter((_, i) => i !== idx) } : c
    );
    onChange({ classes: updated });
  };

  const addClass = () => {
    const label = newClassName.trim();
    if (!label) return;
    const id = label.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
    onChange({ classes: [...value.classes, { id, label, members: [] }] });
    setNewClassName('');
  };

  const removeClass = (classId: string) => {
    onChange({ classes: value.classes.filter(c => c.id !== classId) });
  };

  // Summary
  const summary = value.classes.map(c => ({
    label: c.label,
    pria: c.members.filter(m => m.gender === 'pria').length,
    wanita: c.members.filter(m => m.gender === 'wanita').length,
  }));
  const grandPria = summary.reduce((s, c) => s + c.pria, 0);
  const grandWanita = summary.reduce((s, c) => s + c.wanita, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {value.classes.map(cls => {
        const clsPria = cls.members.filter(m => m.gender === 'pria').length;
        const clsWanita = cls.members.filter(m => m.gender === 'wanita').length;
        return (
          <div key={cls.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
            {/* Class header */}
            <div style={{ background: '#eff3ff', padding: '9px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: '#3b5bdb' }}>{cls.label}</span>
                <span style={{ fontSize: 11, color: '#64748b', background: '#ffffff', padding: '2px 8px', borderRadius: 20, border: '1px solid #e2e8f0' }}>
                  p {clsPria} · w {clsWanita} · Total {clsPria + clsWanita}
                </span>
              </div>
              {!['kecil', 'besar', 'guru'].includes(cls.id.split('-')[0]) && (
                <button onClick={() => removeClass(cls.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Hapus Kelas</button>
              )}
            </div>

            {/* Members */}
            <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {cls.members.length === 0 && (
                <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Belum ada anggota</p>
              )}
              {cls.members.map((m, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '1px dashed #f1f5f9' }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                    background: m.gender === 'pria' ? '#dbeafe' : '#fce7f3',
                    color: m.gender === 'pria' ? '#1d4ed8' : '#be185d',
                  }}>{m.gender === 'pria' ? 'L' : 'P'}</span>
                  <span style={{ flex: 1, fontSize: 13, color: '#1e293b' }}>{m.name}</span>
                  <button
                    onClick={() => removeMember(cls.id, idx)}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 4px' }}
                  >×</button>
                </div>
              ))}

              {/* Add member row */}
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <input
                  type="text"
                  placeholder="Nama anggota..."
                  value={newMemberName[cls.id] || ''}
                  onChange={e => setNewMemberName(p => ({ ...p, [cls.id]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addMember(cls.id)}
                  style={{ flex: 1, padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, fontFamily: 'inherit' }}
                />
                <select
                  value={newMemberGender[cls.id] || 'pria'}
                  onChange={e => setNewMemberGender(p => ({ ...p, [cls.id]: e.target.value as 'pria' | 'wanita' }))}
                  style={{ padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, fontFamily: 'inherit' }}
                >
                  <option value="pria">Pria</option>
                  <option value="wanita">Wanita</option>
                </select>
                <button
                  onClick={() => addMember(cls.id)}
                  style={{ padding: '6px 12px', background: '#3b5bdb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                >+ Tambah</button>
              </div>
            </div>
          </div>
        );
      })}

      {/* Add new class */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Nama kelas baru..."
          value={newClassName}
          onChange={e => setNewClassName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addClass()}
          style={{ flex: 1, padding: '7px 12px', border: '1px dashed #3b5bdb', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: '#3b5bdb' }}
        />
        <button
          onClick={addClass}
          style={{ padding: '7px 16px', background: 'transparent', border: '1px solid #3b5bdb', color: '#3b5bdb', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
        >+ Tambah Kelas</button>
      </div>

      {/* Summary */}
      <div style={{ background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '8px 14px', background: '#1e293b' }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 12 }}>RINGKASAN KEHADIRAN</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              {['Kelas', 'Pria', 'Wanita', 'Total'].map(h => (
                <th key={h} style={{ padding: '6px 12px', textAlign: h === 'Kelas' ? 'left' : 'center', color: '#64748b', fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summary.map((s, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '6px 12px', color: '#334155', fontWeight: 600 }}>{s.label}</td>
                <td style={{ padding: '6px 12px', textAlign: 'center', color: '#1d4ed8' }}>{s.pria}</td>
                <td style={{ padding: '6px 12px', textAlign: 'center', color: '#be185d' }}>{s.wanita}</td>
                <td style={{ padding: '6px 12px', textAlign: 'center', fontWeight: 700, color: '#1e293b' }}>{s.pria + s.wanita}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#eff3ff' }}>
              <td style={{ padding: '8px 12px', fontWeight: 800, color: '#3b5bdb' }}>TOTAL</td>
              <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800, color: '#1d4ed8' }}>{grandPria}</td>
              <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800, color: '#be185d' }}>{grandWanita}</td>
              <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800, color: '#3b5bdb', fontSize: 14 }}>{grandPria + grandWanita}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type View = 'list' | 'create' | 'detail';

export default function ServiceEventsManager() {
  const { user } = useAuth();

  const [view, setView] = useState<View>('list');
  const [events, setEvents] = useState<ServiceEvent[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ServiceEvent | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [eventDate, setEventDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [eventDescription, setEventDescription] = useState('');
  const [offeringRows, setOfferingRows] = useState<OfferingRow[]>(
    OFFERING_NOMINALS.map(n => ({ nominal: n, qty: 0 }))
  );
  const [offeringNotes, setOfferingNotes] = useState('');
  const [regularAttendance, setRegularAttendance] = useState<RegularAttendance>({ pria: 0, wanita: 0, notes: '' });
  const [smAttendance, setSmAttendance] = useState<SMAttendance>({ classes: DEFAULT_SM_CLASSES.map(c => ({ ...c, members: [] })) });
  const [formStep, setFormStep] = useState<1 | 2>(1);

  // Current user name
  const [userName, setUserName] = useState('');
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid)).then(snap => {
      if (snap.exists()) {
        const data = snap.data() as { name?: string };
        setUserName(data.name || user.email || '');
      }
    });
  }, [user]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [evSnap, schSnap] = await Promise.all([
        getDocs(query(collection(db, 'service_events'), orderBy('date', 'desc'))),
        getDocs(query(collection(db, 'schedules'), orderBy('order'))),
      ]);
      setEvents(evSnap.docs.map(d => ({ id: d.id, ...d.data() } as ServiceEvent)));
      setSchedules(schSnap.docs.map(d => ({ id: d.id, ...d.data() } as Schedule)));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setSelectedSchedule(null);
    setEventDate(new Date().toISOString().split('T')[0]);
    setEventDescription('');
    setOfferingRows(OFFERING_NOMINALS.map(n => ({ nominal: n, qty: 0 })));
    setOfferingNotes('');
    setRegularAttendance({ pria: 0, wanita: 0, notes: '' });
    setSmAttendance({ classes: DEFAULT_SM_CLASSES.map(c => ({ ...c, members: [] })) });
    setFormStep(1);
  };

  const handleSave = async () => {
    if (!selectedSchedule || !user) return;
    setSaving(true);

    const isSunSchool = isSM(selectedSchedule.name);
    const totalOffering = offeringRows.reduce((s, r) => s + r.nominal * r.qty, 0);

    let attendanceCount = 0;
    let attendanceData: RegularAttendance | SMAttendance;

    if (isSunSchool) {
      attendanceData = smAttendance;
      attendanceCount = smAttendance.classes.reduce((s, c) => s + c.members.length, 0);
    } else {
      attendanceData = regularAttendance;
      attendanceCount = regularAttendance.pria + regularAttendance.wanita;
    }

    try {
      await addDoc(collection(db, 'service_events'), {
        ministry: selectedSchedule.name,
        date: Timestamp.fromDate(new Date(eventDate + 'T07:00:00')),
        description: eventDescription,
        is_finished: true,
        attendance_count: attendanceCount,
        attendance_notes: isSunSchool ? '' : (regularAttendance.notes || ''),
        offering_amount: totalOffering,
        offering_notes: offeringNotes,
        offering_breakdown: offeringRows,
        attendance_data: attendanceData,
        createdAt: Timestamp.now(),
        createdBy: user.uid,
        createdByName: userName,
      });
      await fetchAll();
      resetForm();
      setView('list');
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'service_events', id));
      setEvents(prev => prev.filter(e => e.id !== id));
      if (selectedEvent?.id === id) { setSelectedEvent(null); setView('list'); }
    } catch (e) { console.error(e); }
    setDeleteConfirm(null);
  };

  const handleDownloadPDF = async (event: ServiceEvent) => {
    setPdfLoading(true);
    try { await generatePDF(event); }
    catch (e) { console.error(e); alert('Gagal membuat PDF. Coba lagi.'); }
    setPdfLoading(false);
  };

  // ── Styles ──
  const s = {
    label: { display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
    input: { width: '100%', padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: '#1e293b', outline: 'none' },
    section: { marginBottom: 28 },
    sectionTitle: { fontSize: 14, fontWeight: 800, color: '#1e293b', marginBottom: 14, paddingBottom: 8, borderBottom: '2px solid #eff3ff' },
  };

  // ── LIST VIEW ──
  if (view === 'list') {
    return (
      <div>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1e293b' }}>Laporan Ibadah</h2>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: '#94a3b8' }}>Kelola laporan kehadiran & persembahan ibadah</p>
          </div>
          <button
            onClick={() => { resetForm(); setView('create'); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#3b5bdb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
          >
            <span style={{ fontSize: 16 }}>+</span>
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Memuat data...</div>
        ) : events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>
            <p style={{ margin: 0, fontWeight: 600 }}>Belum ada laporan ibadah</p>
            <p style={{ margin: '4px 0 0', fontSize: 12 }}>Klik Buat Laporan untuk menambahkan</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {events.map(ev => (
              <div
                key={ev.id}
                style={{
                  background: '#fff', border: '1px solid #e8ecf0', borderRadius: 10, padding: '14px 16px',
                  display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: 'box-shadow 0.15s',
                }}
                onClick={() => { setSelectedEvent(ev); setView('detail'); }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
              >
                {/* Date badge */}
                <div style={{ minWidth: 48, textAlign: 'center', background: '#eff3ff', borderRadius: 8, padding: '6px 4px' }}>
                  <div style={{ fontSize: 11, color: '#3b5bdb', fontWeight: 700, textTransform: 'uppercase' }}>
                    {ev.date?.toDate?.()?.toLocaleDateString('id-ID', { month: 'short' }) ?? '—'}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#3b5bdb', lineHeight: 1 }}>
                    {ev.date?.toDate?.()?.getDate() ?? '—'}
                  </div>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.ministry}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>
                    {ev.description ? `"${ev.description}" · ` : ''}{formatDateShort(ev.date)}
                  </p>
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Hadir</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b' }}>{ev.attendance_count}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Persembahan</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#3b5bdb' }}>{formatRp(ev.offering_amount ?? 0)}</div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => handleDownloadPDF(ev)}
                    disabled={pdfLoading}
                    title="Download PDF"
                    style={{ padding: '6px 10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, cursor: 'pointer', color: '#16a34a', fontSize: 12, fontWeight: 700 }}
                  >
                    <DownloadIcon />
                  </button>
                    <button
                  onClick={() => handleDelete(ev.id)}
                  title="Hapus"
                  style={{ padding: '6px 10px', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', color: '#ef4444', fontSize: 12, fontWeight: 700 }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#dc2626'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#fff5f5'; e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#fecaca'; }}
                >
                  <TrashIcon />
                </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete confirm modal */}
        {deleteConfirm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 320, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
              <h3 style={{ margin: '0 0 8px', color: '#1e293b' }}>Hapus Laporan?</h3>
              <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b' }}>Data laporan ini akan dihapus permanen dan tidak bisa dikembalikan.</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handleDelete(deleteConfirm)} style={{ flex: 1, padding: '9px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>Hapus</button>
                <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: '9px', background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>Batal</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── DETAIL VIEW ──
  if (view === 'detail' && selectedEvent) {
    const ev = selectedEvent;
    const smData = ev.attendance_data as SMAttendance | undefined;
    const regData = ev.attendance_data as RegularAttendance | undefined;
    const isSunday = isSM(ev.ministry);

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => setView('list')} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', color: '#64748b', fontWeight: 700, fontSize: 13 }}>← Kembali</button>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#1e293b' }}>{ev.ministry}</h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>{formatDate(ev.date)}</p>
          </div>
          <button
            onClick={() => handleDownloadPDF(ev)}
            disabled={pdfLoading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
          >
            {pdfLoading ? 'Membuat PDF...' : '⬇ Download PDF'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          {[
            { label: 'Total Kehadiran', value: ev.attendance_count + ' orang', color: '#3b5bdb', bg: '#eff3ff' },
            { label: 'Total Persembahan', value: formatRp(ev.offering_amount ?? 0), color: '#16a34a', bg: '#f0fdf4' },
          ].map(stat => (
            <div key={stat.label} style={{ background: stat.bg, borderRadius: 10, padding: '16px 18px' }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: stat.color, textTransform: 'uppercase' }}>{stat.label}</p>
              <p style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 800, color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Attendance detail */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, marginBottom: 16, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 700, fontSize: 13, color: '#1e293b' }}>Kehadiran</div>
          <div style={{ padding: 16 }}>
            {isSunday && smData?.classes ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f1f5f9' }}>
                    {['Kelas', 'Pria', 'Wanita', 'Total'].map(h => (
                      <th key={h} style={{ padding: '7px 12px', textAlign: h === 'Kelas' ? 'left' : 'center', color: '#64748b', fontWeight: 700 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {smData.classes.map((cls, i) => {
                    const p = cls.members.filter(m => m.gender === 'pria').length;
                    const w = cls.members.filter(m => m.gender === 'wanita').length;
                    return (
                      <tr key={cls.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                        <td style={{ padding: '7px 12px', fontWeight: 600 }}>{cls.label}</td>
                        <td style={{ padding: '7px 12px', textAlign: 'center', color: '#1d4ed8' }}>{p}</td>
                        <td style={{ padding: '7px 12px', textAlign: 'center', color: '#be185d' }}>{w}</td>
                        <td style={{ padding: '7px 12px', textAlign: 'center', fontWeight: 700 }}>{p + w}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#eff3ff' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 800, color: '#3b5bdb' }}>TOTAL</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800, color: '#1d4ed8' }}>
                      {smData.classes.reduce((s, c) => s + c.members.filter(m => m.gender === 'pria').length, 0)}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800, color: '#be185d' }}>
                      {smData.classes.reduce((s, c) => s + c.members.filter(m => m.gender === 'wanita').length, 0)}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800, color: '#3b5bdb', fontSize: 14 }}>{ev.attendance_count}</td>
                  </tr>
                </tfoot>
              </table>
            ) : (
              <div style={{ display: 'flex', gap: 12 }}>
                {[
                  { label: 'Pria', value: regData?.pria ?? 0 },
                  { label: 'Wanita', value: regData?.wanita ?? 0 },
                  { label: 'Total', value: ev.attendance_count },
                ].map(item => (
                  <div key={item.label} style={{ flex: 1, textAlign: 'center', background: '#f8fafc', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>{item.label}</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#1e293b' }}>{item.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Offering detail */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 700, fontSize: 13, color: '#1e293b' }}>Persembahan</div>
          <div style={{ padding: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  {['Nominal', 'Jumlah', 'Subtotal'].map(h => (
                    <th key={h} style={{ padding: '7px 10px', textAlign: h === 'Subtotal' ? 'right' : 'left', color: '#64748b', fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(ev.offering_breakdown ?? []).filter(r => r.qty > 0).map((row, i) => (
                  <tr key={row.nominal} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                    <td style={{ padding: '7px 10px', fontWeight: 600 }}>{formatRp(row.nominal)}</td>
                    <td style={{ padding: '7px 10px', color: '#64748b' }}>× {row.qty}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600, color: '#3b5bdb' }}>{formatRp(row.nominal * row.qty)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#3b5bdb' }}>
                  <td colSpan={2} style={{ padding: '9px 10px', color: '#fff', fontWeight: 700 }}>TOTAL</td>
                  <td style={{ padding: '9px 10px', textAlign: 'right', color: '#fff', fontWeight: 800, fontSize: 14 }}>{formatRp(ev.offering_amount ?? 0)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ── CREATE VIEW ──
  return (
    <div>
      {/* Back header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
        <button onClick={() => { setView('list'); resetForm(); }} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', color: '#64748b', fontWeight: 700, fontSize: 13 }}>← Kembali</button>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#1e293b' }}>Buat Laporan Ibadah</h2>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>Langkah {formStep} dari 2</p>
        </div>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, background: '#f8fafc', borderRadius: 10, padding: 4, border: '1px solid #e2e8f0' }}>
        {[{ n: 1, label: 'Pilih Ibadah' }, { n: 2, label: 'Input Data' }].map(step => (
          <div key={step.n} style={{ flex: 1, textAlign: 'center', padding: '8px', borderRadius: 7, background: formStep === step.n ? '#3b5bdb' : 'transparent', transition: 'background 0.15s' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: formStep === step.n ? '#fff' : '#94a3b8' }}>
              {step.n}. {step.label}
            </span>
          </div>
        ))}
      </div>

      {/* ── STEP 1: Pick service ── */}
      {formStep === 1 && (
        <div>
          <div style={s.section}>
            <p style={s.sectionTitle}>Pilih Jenis Ibadah</p>
            {loading ? (
              <p style={{ color: '#94a3b8', fontSize: 13 }}>Memuat jadwal...</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                {schedules.map(sch => {
                  const active = selectedSchedule?.id === sch.id;
                  return (
                    <button
                      key={sch.id}
                      onClick={() => setSelectedSchedule(sch)}
                      style={{
                        padding: '14px 16px', border: active ? '2px solid #3b5bdb' : '2px solid #e2e8f0',
                        borderRadius: 10, background: active ? '#eff3ff' : '#fff', cursor: 'pointer',
                        textAlign: 'left', transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 700, color: active ? '#3b5bdb' : '#1e293b', marginBottom: 3 }}>{sch.name}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>{sch.time}</div>
                      {isSM(sch.name) && (
                        <div style={{ marginTop: 6, fontSize: 10, fontWeight: 700, color: '#f59e0b', background: '#fffbeb', padding: '2px 8px', borderRadius: 20, display: 'inline-block', border: '1px solid #fde68a' }}>
                          Sekolah Minggu
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div style={s.section}>
            <label style={s.label}>Tanggal Ibadah</label>
            <input
              type="date"
              value={eventDate}
              onChange={e => setEventDate(e.target.value)}
              style={{ ...s.input, maxWidth: 220 }}
            />
          </div>

          <div style={s.section}>
            <label style={s.label}>Tema / Deskripsi (opsional)</label>
            <input
              type="text"
              value={eventDescription}
              onChange={e => setEventDescription(e.target.value)}
              placeholder="Mis: Kemuliaan Allah, Paskah 2026..."
              style={s.input}
            />
          </div>

          <button
            disabled={!selectedSchedule}
            onClick={() => setFormStep(2)}
            style={{
              padding: '11px 28px', background: selectedSchedule ? '#3b5bdb' : '#e2e8f0',
              color: selectedSchedule ? '#fff' : '#94a3b8', border: 'none', borderRadius: 8,
              cursor: selectedSchedule ? 'pointer' : 'not-allowed', fontWeight: 700, fontSize: 14,
            }}
          >
            Lanjut →
          </button>
        </div>
      )}

      {/* ── STEP 2: Input data ── */}
      {formStep === 2 && selectedSchedule && (
        <div>
          {/* Selected service banner */}
          <div style={{ background: '#eff3ff', borderRadius: 10, padding: '10px 16px', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 800, color: '#3b5bdb', fontSize: 14 }}>{selectedSchedule.name}</span>
              <span style={{ color: '#64748b', fontSize: 12, marginLeft: 8 }}>{selectedSchedule.time}</span>
            </div>
            <span style={{ color: '#64748b', fontSize: 12 }}>{eventDate}</span>
          </div>

          {/* Attendance */}
          <div style={s.section}>
            <p style={s.sectionTitle}>Kehadiran</p>
            {isSM(selectedSchedule.name) ? (
              <SMAttendanceForm value={smAttendance} onChange={setSmAttendance} />
            ) : (
              <RegularAttendanceForm value={regularAttendance} onChange={setRegularAttendance} />
            )}
          </div>

          {/* Offering */}
          <div style={s.section}>
            <p style={s.sectionTitle}>Persembahan</p>
            <OfferingTable rows={offeringRows} onChange={setOfferingRows} />
            <div style={{ marginTop: 12 }}>
              <label style={s.label}>Catatan Persembahan (opsional)</label>
              <input
                type="text"
                value={offeringNotes}
                onChange={e => setOfferingNotes(e.target.value)}
                placeholder="Catatan tambahan persembahan..."
                style={s.input}
              />
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setFormStep(1)} style={{ padding: '11px 20px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>← Kembali</button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ flex: 1, padding: '11px 28px', background: saving ? '#94a3b8' : '#3b5bdb', color: '#fff', border: 'none', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14 }}
            >
              {saving ? 'Menyimpan...' : '✓ Simpan Laporan'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}