// components/admin/SettingsEditor.tsx
'use client';

import { useRouter } from 'next/navigation';
import React, { useState, useEffect, useRef } from 'react';
import { db, storage } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface SettingsData {
  heroTitle: string;
  heroImageUrls: string[];
  visi: string;
  misi: string;
  gerejaIndukTitle: string;
  gerejaIndukDescription: string;
  gerejaIndukImageUrl: string;
}

const initialSettings: SettingsData = {
  heroTitle: '',
  heroImageUrls: [],
  visi: '',
  misi: '',
  gerejaIndukTitle: '',
  gerejaIndukDescription: '',
  gerejaIndukImageUrl: '',
};

// ─── Icons ────────────────────────────────────────────────────────────────────

const UploadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
    <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>
  </svg>
);

const XIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const SaveIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/>
    <polyline points="7 3 7 8 15 8"/>
  </svg>
);

// ─── Reusable primitives ──────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '28px 0 18px' }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {children}
      </p>
      <div style={{ flex: 1, height: 1, background: '#e8ecf0' }} />
    </div>
  );
}

function FieldLabel({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {children}
      {optional && <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'none', letterSpacing: 0 }}>(opsional)</span>}
    </label>
  );
}

function StatusToast({ type, message }: { type: 'success' | 'error' | ''; message: string }) {
  if (!message) return null;
  const ok = type === 'success';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 16px', borderRadius: 10,
      background: ok ? '#f0fdf4' : '#fff5f5',
      border: `1.5px solid ${ok ? '#bbf7d0' : '#fecaca'}`,
      color: ok ? '#16a34a' : '#dc2626',
      fontSize: 13, fontWeight: 600, marginBottom: 20,
    }}>
      {ok ? <CheckIcon /> : <XIcon />}
      {message}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px',
  border: '1.5px solid #e2e8f0', borderRadius: 8,
  fontSize: 14, color: '#1e293b', background: '#fff',
  outline: 'none', fontFamily: 'inherit',
  boxSizing: 'border-box', transition: 'border-color 0.2s',
};

function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <FieldLabel optional={optional}>{label}</FieldLabel>
      {children}
    </div>
  );
}

// ─── Banner upload component ──────────────────────────────────────────────────

function BannerUpload({
  urls, isUploading,
  onUpload, onRemove,
}: {
  urls: string[]; isUploading: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (i: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) {
      const fakeEvent = { target: { files: e.dataTransfer.files } } as unknown as React.ChangeEvent<HTMLInputElement>;
      onUpload(fakeEvent);
    }
  };

  return (
    <div>
      <FieldLabel>Gambar Banner <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#94a3b8', fontSize: 11 }}>(bisa lebih dari 1)</span></FieldLabel>

      {/* Upload zone */}
      <div
        onClick={() => !isUploading && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragging ? '#3b5bdb' : '#e2e8f0'}`,
          borderRadius: 10, padding: '20px 16px',
          textAlign: 'center', cursor: isUploading ? 'not-allowed' : 'pointer',
          background: dragging ? '#eff3ff' : '#f8fafc',
          transition: 'all 0.2s', marginBottom: urls.length ? 12 : 0,
        }}
      >
        <div style={{ color: '#94a3b8', display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
          <UploadIcon />
        </div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#64748b' }}>
          {isUploading ? 'Mengunggah...' : 'Klik atau drag & drop gambar'}
        </p>
        <p style={{ margin: '3px 0 0', fontSize: 11, color: '#94a3b8' }}>PNG, JPG, WebP hingga 5MB</p>
      </div>
      <input ref={inputRef} type="file" accept="image/*" multiple disabled={isUploading}
        style={{ display: 'none' }} onChange={onUpload} />

      {/* Preview grid */}
      {urls.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
          {urls.map((url, i) => (
            <div key={i} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', aspectRatio: '16/9', background: '#f1f5f9' }}>
              <img src={url} alt={`Banner ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onRemove(i); }}
                style={{
                  position: 'absolute', top: 5, right: 5,
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.6)', border: 'none',
                  color: '#fff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#dc2626')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.6)')}
              >
                <XIcon />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SettingsEditor() {
  const router = useRouter();

  const [settings, setSettings] = useState<SettingsData>(initialSettings);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | ''; message: string }>({ type: '', message: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const settingsDocRef = doc(db, 'settings', 'homePage');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(settingsDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSettings({
            ...initialSettings, ...data,
            heroImageUrls: data.heroImageUrls || (data.heroImageUrl ? [data.heroImageUrl] : []),
          });
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setStatusMessage({ type: '', message: '' });
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const storageRef = ref(storage, `hero_images/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        newUrls.push(await getDownloadURL(snapshot.ref));
      }
      setSettings(prev => ({ ...prev, heroImageUrls: [...prev.heroImageUrls, ...newUrls] }));
      setStatusMessage({ type: 'success', message: `${newUrls.length} gambar berhasil diunggah!` });
      setTimeout(() => setStatusMessage({ type: '', message: '' }), 3000);
    } catch (error) {
      console.error('Upload error:', error);
      setStatusMessage({ type: 'error', message: 'Gagal mengunggah gambar.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = (i: number) => {
    setSettings(prev => ({ ...prev, heroImageUrls: prev.heroImageUrls.filter((_, idx) => idx !== i) }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage({ type: '', message: '' });
    try {
      await updateDoc(settingsDocRef, settings as unknown as Record<string, unknown>);
      setStatusMessage({ type: 'success', message: 'Pengaturan berhasil disimpan!' });
      router.refresh();
    } catch (error) {
      console.error('Error updating settings:', error);
      setStatusMessage({ type: 'error', message: 'Gagal menyimpan.' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setStatusMessage({ type: '', message: '' }), 5000);
    }
  };

  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => (e.target.style.borderColor = '#3b5bdb');
  const onBlur  = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => (e.target.style.borderColor = '#e2e8f0');

  if (loading) return (
    <div style={{ color: '#94a3b8', fontSize: 14, padding: '24px 0' }}>Memuat pengaturan...</div>
  );

  return (
    <form onSubmit={handleSave} style={{ fontFamily: "'Nunito', sans-serif" }}>
      <StatusToast type={statusMessage.type} message={statusMessage.message} />

      {/* ── Header Utama ── */}
      <SectionHeading>Header Utama</SectionHeading>

      <Field label="Judul Utama">
        <input
          name="heroTitle" type="text" value={settings.heroTitle}
          onChange={handleChange} required
          placeholder="Judul yang tampil di halaman utama..."
          style={inputStyle} onFocus={onFocus} onBlur={onBlur}
        />
      </Field>

      <BannerUpload
        urls={settings.heroImageUrls}
        isUploading={isUploading}
        onUpload={handleImageUpload}
        onRemove={handleRemoveImage}
      />

      {/* ── Visi & Misi ── */}
      <SectionHeading>Visi &amp; Misi</SectionHeading>

      <Field label="Visi">
        <textarea
          name="visi" value={settings.visi}
          onChange={handleChange} rows={3} required
          placeholder="Visi gereja..."
          style={{ ...inputStyle, resize: 'vertical' }} onFocus={onFocus} onBlur={onBlur}
        />
      </Field>

      <Field label="Misi">
        <textarea
          name="misi" value={settings.misi}
          onChange={handleChange} rows={5} required
          placeholder="Misi gereja..."
          style={{ ...inputStyle, resize: 'vertical' }} onFocus={onFocus} onBlur={onBlur}
        />
      </Field>

      {/* ── Gereja Induk ── */}
      <SectionHeading>Gereja Induk</SectionHeading>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Field label="Judul">
          <input
            name="gerejaIndukTitle" type="text" value={settings.gerejaIndukTitle}
            onChange={handleChange} required
            placeholder="Nama gereja induk..."
            style={inputStyle} onFocus={onFocus} onBlur={onBlur}
          />
        </Field>
        <Field label="URL Gambar">
          <input
            name="gerejaIndukImageUrl" type="url" value={settings.gerejaIndukImageUrl}
            onChange={handleChange} required
            placeholder="https://..."
            style={inputStyle} onFocus={onFocus} onBlur={onBlur}
          />
        </Field>
      </div>

      <Field label="Deskripsi">
        <textarea
          name="gerejaIndukDescription" value={settings.gerejaIndukDescription}
          onChange={handleChange} rows={4} required
          placeholder="Deskripsi singkat gereja induk..."
          style={{ ...inputStyle, resize: 'vertical' }} onFocus={onFocus} onBlur={onBlur}
        />
      </Field>

      {/* ── Save button ── */}
      <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1.5px solid #e8ecf0' }}>
        <button
          type="submit"
          disabled={isSaving || isUploading}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '11px 24px',
            background: isSaving || isUploading ? '#93a3c7' : '#3b5bdb',
            color: '#fff', border: 'none', borderRadius: 8,
            fontSize: 14, fontWeight: 700, cursor: isSaving || isUploading ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { if (!isSaving && !isUploading) e.currentTarget.style.background = '#2f4ac7'; }}
          onMouseLeave={e => { if (!isSaving && !isUploading) e.currentTarget.style.background = '#3b5bdb'; }}
        >
          <SaveIcon />
          {isSaving ? 'Menyimpan...' : isUploading ? 'Mengunggah...' : 'Simpan Perubahan'}
        </button>
      </div>
    </form>
  );
}
