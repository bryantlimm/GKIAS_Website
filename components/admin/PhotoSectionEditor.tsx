// components/admin/PhotoSectionEditor.tsx
'use client';

import { useRouter } from 'next/navigation';
import React, { useState, useEffect, useRef } from 'react';
import { db, storage } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface PhotoSectionData {
  title: string;
  description: string;
  imageUrls: string[];
}

const initialData: PhotoSectionData = { title: '', description: '', imageUrls: [] };

// ─── Icons ────────────────────────────────────────────────────────────────────

const SaveIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
  </svg>
);

const UploadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
    <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const XIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
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

export default function PhotoSectionEditor() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [data, setData] = useState<PhotoSectionData>(initialData);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | ''; message: string }>({ type: '', message: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const sectionDocRef = doc(db, 'settings', 'photoSection');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const docSnap = await getDoc(sectionDocRef);
        if (docSnap.exists()) setData({ ...initialData, ...docSnap.data() });
      } catch (error) {
        console.error('Error fetching photo section settings:', error);
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

  const uploadFiles = async (files: FileList) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setStatusMessage({ type: '', message: '' });
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const storageRef = ref(storage, `gallery_images/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        newUrls.push(await getDownloadURL(snapshot.ref));
      }
      setData(prev => ({ ...prev, imageUrls: [...prev.imageUrls, ...newUrls] }));
      setStatusMessage({ type: 'success', message: `${newUrls.length} foto berhasil diunggah!` });
      setTimeout(() => setStatusMessage({ type: '', message: '' }), 3000);
    } catch (error) {
      console.error('Upload error:', error);
      setStatusMessage({ type: 'error', message: 'Gagal mengunggah foto.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) uploadFiles(e.target.files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  };

  const handleRemoveImage = (i: number) => {
    setData(prev => ({ ...prev, imageUrls: prev.imageUrls.filter((_, idx) => idx !== i) }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage({ type: '', message: '' });
    try {
      await setDoc(sectionDocRef, data as unknown as Record<string, unknown>, { merge: true });
      setStatusMessage({ type: 'success', message: 'Pengaturan galeri berhasil disimpan!' });
      router.refresh();
    } catch (error) {
      console.error('Error updating settings:', error);
      setStatusMessage({ type: 'error', message: 'Gagal menyimpan.' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setStatusMessage({ type: '', message: '' }), 5000);
    }
  };

  if (loading) return <div style={{ color: '#94a3b8', fontSize: 14, padding: '24px 0' }}>Memuat data galeri...</div>;

  return (
    <form onSubmit={handleSave} style={{ fontFamily: "'Nunito', sans-serif" }}>
      <StatusToast type={statusMessage.type} message={statusMessage.message} />

      {/* Title */}
      <div style={{ marginBottom: 16 }}>
        <FieldLabel>Judul Seksi Foto</FieldLabel>
        <input
          name="title" type="text" value={data.title} onChange={handleChange}
          placeholder="Misal: Galeri Pelayanan"
          required style={inputStyle} onFocus={onFocus} onBlur={onBlur}
        />
      </div>

      {/* Description */}
      <div style={{ marginBottom: 24 }}>
        <FieldLabel>Deskripsi Singkat</FieldLabel>
        <textarea
          name="description" value={data.description} onChange={handleChange}
          rows={3} placeholder="Teks yang muncul di atas foto..."
          required style={{ ...inputStyle, resize: 'vertical' }} onFocus={onFocus} onBlur={onBlur}
        />
      </div>

      {/* Photo upload */}
      <div style={{ marginBottom: 28 }}>
        <FieldLabel>
          Foto Galeri{' '}
          <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#94a3b8', fontSize: 11 }}>
            (bisa lebih dari 1)
          </span>
        </FieldLabel>

        {/* Drop zone */}
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
            transition: 'all 0.2s',
            marginBottom: data.imageUrls.length ? 14 : 0,
          }}
        >
          <div style={{ color: '#94a3b8', display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
            <UploadIcon />
          </div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: isUploading ? '#3b5bdb' : '#64748b' }}>
            {isUploading ? 'Mengunggah...' : 'Klik atau drag & drop foto galeri'}
          </p>
          <p style={{ margin: '3px 0 0', fontSize: 11, color: '#94a3b8' }}>PNG, JPG, WebP hingga 5MB</p>
        </div>
        <input ref={inputRef} type="file" accept="image/*" multiple disabled={isUploading}
          style={{ display: 'none' }} onChange={handleImageUpload} />

        {/* Photo grid */}
        {data.imageUrls.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
                {data.imageUrls.length} foto
              </span>
              <button
                type="button"
                onClick={() => setData(prev => ({ ...prev, imageUrls: [] }))}
                style={{ fontSize: 12, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}
              >
                Hapus semua
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
              {data.imageUrls.map((url, i) => (
                <div key={i} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', aspectRatio: '1', background: '#f1f5f9' }}>
                  <img src={url} alt={`Galeri ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); handleRemoveImage(i); }}
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
          </>
        )}
      </div>

      {/* Save */}
      <div style={{ paddingTop: 20, borderTop: '1.5px solid #e8ecf0' }}>
        <button
          type="submit" disabled={isSaving || isUploading}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '11px 24px',
            background: isSaving || isUploading ? '#93a3c7' : '#3b5bdb',
            color: '#fff', border: 'none', borderRadius: 8,
            fontSize: 14, fontWeight: 700,
            cursor: isSaving || isUploading ? 'not-allowed' : 'pointer',
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