// components/admin/SchedulesEditor.tsx
'use client';

import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, updateDoc, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';

interface Schedule {
  id: string;
  name: string;
  time: string;
  order: number;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
);

const SaveIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const XIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// ─── Primitives ───────────────────────────────────────────────────────────────

function StatusToast({ type, message }: { type: 'success' | 'error' | ''; message: string }) {
  if (!message) return null;
  const ok = type === 'success';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 9,
      padding: '11px 14px', borderRadius: 9, marginBottom: 20,
      background: ok ? '#f0fdf4' : '#fff5f5',
      border: `1.5px solid ${ok ? '#bbf7d0' : '#fecaca'}`,
      color: ok ? '#16a34a' : '#dc2626',
      fontSize: 13, fontWeight: 600,
    }}>
      {ok ? <CheckIcon /> : <XIcon />}
      {message}
    </div>
  );
}

const cellInputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px',
  border: '1.5px solid #e2e8f0', borderRadius: 7,
  fontSize: 13, color: '#1e293b', background: '#fff',
  outline: 'none', fontFamily: 'inherit',
  transition: 'border-color 0.2s',
};

const addInputStyle: React.CSSProperties = {
  padding: '9px 13px',
  border: '1.5px solid #e2e8f0', borderRadius: 8,
  fontSize: 13, color: '#1e293b', background: '#fff',
  outline: 'none', fontFamily: 'inherit',
  transition: 'border-color 0.2s',
};

const onFocus = (e: React.FocusEvent<HTMLInputElement>) => (e.target.style.borderColor = '#3b5bdb');
const onBlur  = (e: React.FocusEvent<HTMLInputElement>) => (e.target.style.borderColor = '#e2e8f0');

// ─── Main component ───────────────────────────────────────────────────────────

export default function SchedulesEditor() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | ''; message: string }>({ type: '', message: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<Omit<Schedule, 'id'>>({ name: '', time: '', order: 0 });

  const schedulesCollectionRef = collection(db, 'schedules');

  const fetchSchedules = async () => {
    try {
      const q = query(schedulesCollectionRef, orderBy('order', 'asc'));
      const snapshot = await getDocs(q);
      setSchedules(snapshot.docs.map(d => ({
        id: d.id, name: d.data().name, time: d.data().time, order: d.data().order,
      })));
    } catch (error) {
      console.error('Error fetching schedules:', error);
      setStatusMessage({ type: 'error', message: 'Gagal memuat jadwal.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSchedules(); }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setStatusMessage({ type, message });
    setTimeout(() => setStatusMessage({ type: '', message: '' }), 4000);
  };

  const handleChange = (id: string, field: keyof Schedule, value: string | number) => {
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await Promise.all(schedules.map(({ id, ...data }) =>
        updateDoc(doc(db, 'schedules', id), data as unknown as Record<string, unknown>)
      ));
      router.refresh();
      showToast('success', 'Semua jadwal berhasil disimpan!');
    } catch (error) {
      console.error(error);
      showToast('error', 'Gagal menyimpan jadwal.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || !newItem.time) {
      showToast('error', 'Nama dan waktu tidak boleh kosong.');
      return;
    }
    setIsSaving(true);
    try {
      const newDocRef = doc(schedulesCollectionRef);
      await setDoc(newDocRef, newItem as unknown as Record<string, unknown>);
      router.refresh();
      setSchedules(prev => [...prev, { ...newItem, id: newDocRef.id }].sort((a, b) => a.order - b.order));
      setNewItem({ name: '', time: '', order: 0 });
      showToast('success', 'Jadwal baru ditambahkan!');
    } catch (error) {
      console.error(error);
      showToast('error', 'Gagal menambahkan jadwal.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus jadwal ini?')) return;
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'schedules', id));
      router.refresh();
      setSchedules(prev => prev.filter(s => s.id !== id));
      showToast('success', 'Jadwal dihapus.');
    } catch (error) {
      console.error(error);
      showToast('error', 'Gagal menghapus jadwal.');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return (
    <div style={{ color: '#94a3b8', fontSize: 14, padding: '24px 0' }}>Memuat jadwal...</div>
  );

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif" }}>
      <StatusToast type={statusMessage.type} message={statusMessage.message} />

      {/* ── Existing schedules ── */}
      <form onSubmit={handleSaveAll}>

        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 80px 60px',
          gap: 8, padding: '8px 12px', marginBottom: 6,
        }}>
          {['Nama Kebaktian', 'Waktu', 'Urutan', ''].map(h => (
            <span key={h} style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
          ))}
        </div>

        {/* Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {schedules.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8', fontSize: 14 }}>
              Belum ada jadwal. Tambahkan di bawah.
            </div>
          ) : schedules.map(schedule => (
            <div
              key={schedule.id}
              style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 80px 60px',
                gap: 8, alignItems: 'center',
                padding: '10px 12px',
                // border: '1.5px solid #e8ecf0', borderRadius: 0,
                background: '#fff', transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#c7d2fe')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#e8ecf0')}
            > 
            {/* fadsjhfkjfadsf */}
              <input
                type="text" value={schedule.name}
                onChange={e => handleChange(schedule.id, 'name', e.target.value)}
                style={cellInputStyle} onFocus={onFocus} onBlur={onBlur}
                placeholder="Nama kebaktian"
              />
              <input
                type="text" value={schedule.time}
                onChange={e => handleChange(schedule.id, 'time', e.target.value)}
                style={cellInputStyle} onFocus={onFocus} onBlur={onBlur}
                placeholder="Waktu"
              />
              <input
                type="number" value={schedule.order}
                onChange={e => handleChange(schedule.id, 'order', parseInt(e.target.value) || 0)}
                style={{ ...cellInputStyle, textAlign: 'center' }}
                onFocus={onFocus} onBlur={onBlur}
                min="0"
              />
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => handleDelete(schedule.id)}
                  disabled={deletingId === schedule.id || isSaving}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 32, height: 32,
                    background: '#fff5f5', color: '#dc2626',
                    border: '1.5px solid #fecaca', borderRadius: 7,
                    cursor: deletingId === schedule.id ? 'not-allowed' : 'pointer',
                    opacity: deletingId === schedule.id ? 0.5 : 1,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (deletingId !== schedule.id) { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#dc2626'; }}}
                  onMouseLeave={e => { e.currentTarget.style.background = '#fff5f5'; e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#fecaca'; }}
                >
                  <TrashIcon />
                </button>
              </div>
            </div> 
          ))}
        </div>

        {/* Save all */}
        {schedules.length > 0 && (
          <button
            type="submit" disabled={isSaving}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '10px 20px',
              background: isSaving ? '#93a3c7' : '#3b5bdb',
              color: '#fff', border: 'none', borderRadius: 8,
              fontSize: 13, fontWeight: 700,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s', marginBottom: 28,
            }}
            onMouseEnter={e => { if (!isSaving) e.currentTarget.style.background = '#2f4ac7'; }}
            onMouseLeave={e => { if (!isSaving) e.currentTarget.style.background = '#3b5bdb'; }}
          >
            <SaveIcon />
            {isSaving ? 'Menyimpan...' : 'Simpan Semua Perubahan'}
          </button>
        )}
      </form>

      {/* ── Add new ── */}
      <div style={{ borderTop: '1.5px solid #e8ecf0', paddingTop: 24 }}>
        <p style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Tambah Jadwal Baru
        </p>

        <form onSubmit={handleAddSchedule}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <input
              type="text"
              placeholder="Nama kebaktian..."
              value={newItem.name}
              onChange={e => setNewItem(prev => ({ ...prev, name: e.target.value }))}
              required
              style={{ ...addInputStyle, flex: '2 1 160px' }}
              onFocus={onFocus} onBlur={onBlur}
            />
            <input
              type="text"
              placeholder="Waktu (e.g. 09:00 WIB)"
              value={newItem.time}
              onChange={e => setNewItem(prev => ({ ...prev, time: e.target.value }))}
              required
              style={{ ...addInputStyle, flex: '2 1 140px' }}
              onFocus={onFocus} onBlur={onBlur}
            />
            <input
              type="number"
              placeholder="Urutan"
              value={newItem.order === 0 ? '' : newItem.order}
              onChange={e => setNewItem(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
              min="0"
              style={{ ...addInputStyle, width: 90, flexShrink: 0 }}
              onFocus={onFocus} onBlur={onBlur}
            />
            <button
              type="submit" disabled={isSaving}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 18px',
                background: isSaving ? '#93a3c7' : '#3b5bdb',
                color: '#fff', border: 'none', borderRadius: 8,
                fontSize: 13, fontWeight: 700,
                cursor: isSaving ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s', flexShrink: 0,
              }}
              onMouseEnter={e => { if (!isSaving) e.currentTarget.style.background = '#2f4ac7'; }}
              onMouseLeave={e => { if (!isSaving) e.currentTarget.style.background = '#3b5bdb'; }}
            >
              <PlusIcon /> Tambah
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
