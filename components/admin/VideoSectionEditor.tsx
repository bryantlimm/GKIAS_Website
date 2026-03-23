// components/admin/VideoSectionEditor.tsx
'use client';

import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface VideoSectionData {
  title: string;
  description: string;
  youtubeUrl: string;
}

const initialData: VideoSectionData = { title: '', description: '', youtubeUrl: '' };

// ─── Icons ────────────────────────────────────────────────────────────────────

const SaveIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
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

const YoutubeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 001.46 6.42 29 29 0 001 12a29 29 0 00.46 5.58 2.78 2.78 0 001.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.96A29 29 0 0023 12a29 29 0 00-.46-5.58z"/>
    <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/>
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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px',
  border: '1.5px solid #e2e8f0', borderRadius: 8,
  fontSize: 14, color: '#1e293b', background: '#fff',
  outline: 'none', fontFamily: 'inherit',
  boxSizing: 'border-box', transition: 'border-color 0.2s',
};

const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => (e.target.style.borderColor = '#3b5bdb');
const onBlur  = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => (e.target.style.borderColor = '#e2e8f0');

// ─── Main component ───────────────────────────────────────────────────────────

export default function VideoSectionEditor() {
  const router = useRouter();
  const [data, setData] = useState<VideoSectionData>(initialData);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | ''; message: string }>({ type: '', message: '' });
  const [isSaving, setIsSaving] = useState(false);

  const sectionDocRef = doc(db, 'settings', 'youtubeSection');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const docSnap = await getDoc(sectionDocRef);
        if (docSnap.exists()) setData({ ...initialData, ...docSnap.data() });
      } catch (error) {
        console.error('Error fetching video section settings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage({ type: '', message: '' });
    try {
      await setDoc(sectionDocRef, data as unknown as Record<string, unknown>, { merge: true });
      setStatusMessage({ type: 'success', message: 'Pengaturan video berhasil disimpan!' });
      router.refresh();
    } catch (error) {
      console.error('Error updating video settings:', error);
      setStatusMessage({ type: 'error', message: 'Gagal menyimpan.' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setStatusMessage({ type: '', message: '' }), 5000);
    }
  };

  if (loading) return <div style={{ color: '#94a3b8', fontSize: 14, padding: '24px 0' }}>Memuat pengaturan video...</div>;

  return (
    <form onSubmit={handleSave} style={{ fontFamily: "'Nunito', sans-serif" }}>
      <StatusToast type={statusMessage.type} message={statusMessage.message} />

      <div style={{ marginBottom: 16 }}>
        <FieldLabel>Judul Seksi Video</FieldLabel>
        <input
          name="title" type="text" value={data.title} onChange={handleChange}
          placeholder="Misal: Saksikan Ibadah Minggu Ini"
          required style={inputStyle} onFocus={onFocus} onBlur={onBlur}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <FieldLabel>Deskripsi</FieldLabel>
        <textarea
          name="description" value={data.description} onChange={handleChange}
          rows={4} placeholder="Teks yang muncul di sebelah video..."
          required style={{ ...inputStyle, resize: 'vertical' }} onFocus={onFocus} onBlur={onBlur}
        />
      </div>

      <div style={{ marginBottom: 28 }}>
        <FieldLabel>Link YouTube</FieldLabel>
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}>
            <YoutubeIcon />
          </div>
          <input
            name="youtubeUrl" type="url" value={data.youtubeUrl} onChange={handleChange}
            placeholder="https://www.youtube.com/watch?v=..."
            required
            style={{ ...inputStyle, paddingLeft: 40 }}
            onFocus={onFocus} onBlur={onBlur}
          />
        </div>
        <p style={{ margin: '6px 0 0', fontSize: 12, color: '#94a3b8' }}>
          Bisa menggunakan link dari address bar atau link Share YouTube.
        </p>
      </div>

      <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1.5px solid #e8ecf0' }}>
        <button
          type="submit" disabled={isSaving}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '11px 24px',
            background: isSaving ? '#93a3c7' : '#3b5bdb',
            color: '#fff', border: 'none', borderRadius: 8,
            fontSize: 14, fontWeight: 700,
            cursor: isSaving ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { if (!isSaving) e.currentTarget.style.background = '#2f4ac7'; }}
          onMouseLeave={e => { if (!isSaving) e.currentTarget.style.background = '#3b5bdb'; }}
        >
          <SaveIcon />
          {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </button>
      </div>
    </form>
  );
}