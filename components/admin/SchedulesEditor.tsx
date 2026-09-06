// components/admin/SchedulesEditor.tsx
'use client';

import { useRouter } from 'next/navigation';
import React, { useState, useEffect, useRef } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, getDocs, updateDoc, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

interface Schedule {
  id: string;
  name: string;
  time: string;
  order: number;
  imageUrl: string;
  imagePath?: string;
  description: string;
}

// ─── Colors ───────────────────────────────────────────────────────────────
const C = {
  bg: '#FAF7F1',
  bgSoft: '#F2EDE2',
  border: '#E5DFD1',
  ink: '#2C2A26',
  inkSoft: '#6B6459',
  inkFaint: '#A39C8C',
  accent: '#3b5bdb',
  accentHover: '#2f4ac7',
  accentDisabled: '#B7BEDD',
  danger: '#dc2626',
  dangerBg: '#fff5f5',
  dangerBorder: '#fecaca',
  success: '#16a34a',
  successBg: '#f0fdf4',
  successBorder: '#bbf7d0',
};

// ─── Icons ────────────────────────────────────────────────────────────────

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
const ImageIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
);
const UploadIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

// ─── Primitives ─────────────────────────────────────────────────────────────

function StatusToast({ type, message }: { type: 'success' | 'error' | ''; message: string }) {
  if (!message) return null;
  const ok = type === 'success';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 9,
      padding: '11px 14px', borderRadius: 9, marginBottom: 20,
      background: ok ? C.successBg : C.dangerBg,
      border: `1.5px solid ${ok ? C.successBorder : C.dangerBorder}`,
      color: ok ? C.success : C.danger,
      fontSize: 13, fontWeight: 600,
    }}>
      {ok ? <CheckIcon /> : <XIcon />}
      {message}
    </div>
  );
}

const cellInputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px',
  border: `1.5px solid ${C.border}`, borderRadius: 7,
  fontSize: 13, color: C.ink, background: '#FFFEFB',
  outline: 'none', fontFamily: 'inherit',
  transition: 'border-color 0.2s',
};

const textAreaStyle: React.CSSProperties = {
  ...cellInputStyle,
  minHeight: 64, resize: 'vertical', lineHeight: 1.5,
};

const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => (e.target.style.borderColor = C.accent);
const onBlur  = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => (e.target.style.borderColor = C.border);

// ─── Photo field (thumbnail + local file upload) ────────────────────────────

function PhotoField({
  imageUrl,
  uploading,
  onUploadClick,
  onRemove,
}: {
  imageUrl: string;
  uploading: boolean;
  onUploadClick: () => void;
  onRemove: () => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <div style={{
        width: 48, height: 48, borderRadius: 9, flexShrink: 0,
        background: C.bgSoft, border: `1.5px solid ${C.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', color: C.inkFaint,
      }}>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <ImageIcon />
        )}
      </div>

      <button
        type="button"
        onClick={onUploadClick}
        disabled={uploading}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 13px', borderRadius: 7,
          background: uploading ? C.bgSoft : '#FFFEFB',
          border: `1.5px solid ${C.border}`, color: C.inkSoft,
          fontSize: 12.5, fontWeight: 700,
          cursor: uploading ? 'not-allowed' : 'pointer',
        }}
      >
        <UploadIcon />
        {uploading ? 'Mengunggah…' : imageUrl ? 'Ganti Foto' : 'Upload Foto'}
      </button>

      {imageUrl && !uploading && (
        <button
          type="button"
          onClick={onRemove}
          style={{
            fontSize: 12, color: C.inkFaint, background: 'none', border: 'none',
            cursor: 'pointer', textDecoration: 'underline', padding: 0,
          }}
        >
          Hapus
        </button>
      )}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function SchedulesEditor() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | ''; message: string }>({ type: '', message: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<Omit<Schedule, 'id'>>({ name: '', time: '', order: 0, imageUrl: '', imagePath: '', description: '' });
  

  // Local-file upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<string | null>(null); // schedule id, or 'new'
  const [uploadingTarget, setUploadingTarget] = useState<string | null>(null);

  // Helper: extract storage path from download URL
  const getStoragePathFromUrl = (url: string) => {
    try {
      const m = url.match(/\/o\/([^?]+)/);
      if (!m || !m[1]) return null;
      return decodeURIComponent(m[1]);
    } catch (e) {
      return null;
    }
  };

  // Helper: delete a file from Firebase Storage by path or download URL
  const deleteStorageFile = async (pathOrUrl?: string) => {
    if (!pathOrUrl) return;
    let path = pathOrUrl;
    if (pathOrUrl.startsWith('http')) {
      const extracted = getStoragePathFromUrl(pathOrUrl);
      if (!extracted) return;
      path = extracted;
    }
    try {
      // deleteObject will throw if file doesn't exist or permission denied
      await deleteObject(ref(storage, path));
    } catch (err) {
      // ignore errors but log
      console.warn('Failed to delete storage file:', err);
    }
  };

  const schedulesCollectionRef = collection(db, 'schedules');

  const fetchSchedules = async () => {
    try {
      const q = query(schedulesCollectionRef, orderBy('order', 'asc'));
      const snapshot = await getDocs(q);
      setSchedules(snapshot.docs.map(d => ({
        id: d.id,
        name: d.data().name || '',
        time: d.data().time || '',
        order: d.data().order || 0,
        imageUrl: d.data().imageUrl || '',
        description: d.data().description || '',
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

  // ── Local file → Firebase Storage → download URL ──
  const triggerUpload = (target: string) => {
    uploadTargetRef.current = target;
    fileInputRef.current?.click();
  };

  // Compress image file client-side using canvas
  const compressImage = (file: File, maxWidth = 1600, quality = 0.8): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxWidth) {
            const ratio = maxWidth / width;
            width = Math.round(maxWidth);
            height = Math.round(height * ratio);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Canvas not supported');
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (!blob) return reject(new Error('Compression resulted in empty blob'));
            resolve(blob);
            URL.revokeObjectURL(url);
          }, 'image/jpeg', quality);
        } catch (err) {
          URL.revokeObjectURL(url);
          reject(err);
        }
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(e);
      };
      img.src = url;
    });
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = uploadTargetRef.current;
    e.target.value = ''; // allow re-selecting the same file again later
    if (!file || !target) return;

    if (!file.type.startsWith('image/')) {
      showToast('error', 'File harus berupa gambar.');
      return;
    }

    setUploadingTarget(target);
    try {
      const path = `schedules/${target}-${Date.now()}-${file.name}`;
      const storageRef = ref(storage, path);

      // Compress before uploading
      const blob = await compressImage(file);
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);

      if (target === 'new') {
        setNewItem(prev => ({ ...prev, imageUrl: url, imagePath: path }));
      } else {
        handleChange(target, 'imageUrl', url);
        handleChange(target, 'imagePath', path);
      }
      showToast('success', 'Foto berhasil diunggah.');
    } catch (error) {
      console.error('Upload error:', error);
      showToast('error', 'Gagal mengunggah foto.');
    } finally {
      setUploadingTarget(null);
      uploadTargetRef.current = null;
    }
  };

  const handleRemovePhoto = (target: string) => {
    (async () => {
      if (target === 'new') {
        // delete previously uploaded temp file if exists
        await deleteStorageFile(newItem.imagePath || newItem.imageUrl);
        setNewItem(prev => ({ ...prev, imageUrl: '', imagePath: '' }));
      } else {
        const sched = schedules.find(s => s.id === target);
        if (sched) {
          await deleteStorageFile(sched.imagePath || sched.imageUrl);
        }
        handleChange(target, 'imageUrl', '');
        handleChange(target, 'imagePath', '');
      }
    })();
  };

  // ── CRUD ──
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
      setNewItem({ name: '', time: '', order: 0, imageUrl: '', description: '' });
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
      // delete associated image from storage (if any)
      const sched = schedules.find(s => s.id === id);
      if (sched) {
        await deleteStorageFile(sched.imagePath || sched.imageUrl);
      }
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
    <div style={{ color: C.inkFaint, fontSize: 14, padding: '24px 0' }}>Memuat jadwal...</div>
  );

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif" }}>
      {/* Single hidden file input, reused for every row + the add-new form */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelected}
        style={{ display: 'none' }}
      />

      <StatusToast type={statusMessage.type} message={statusMessage.message} />

      <form onSubmit={handleSaveAll}>
        <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: C.inkFaint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Jadwal Saat Ini
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
          {schedules.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: C.inkFaint, fontSize: 14 }}>
              Belum ada jadwal. Tambahkan di bawah.
            </div>
          ) : schedules.map(schedule => (
            <div
              key={schedule.id}
              style={{
                display: 'flex', flexDirection: 'column', gap: 10,
                padding: 16, borderRadius: 14,
                background: C.bg, border: `1.5px solid ${C.border}`,
              }}
            >
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="text" value={schedule.name}
                  onChange={e => handleChange(schedule.id, 'name', e.target.value)}
                  style={{ ...cellInputStyle, flex: 1, fontWeight: 700 }}
                  onFocus={onFocus} onBlur={onBlur}
                  placeholder="Nama kebaktian"
                />
                <input
                  type="number" value={schedule.order}
                  onChange={e => handleChange(schedule.id, 'order', parseInt(e.target.value) || 0)}
                  style={{ ...cellInputStyle, width: 64, textAlign: 'center', flexShrink: 0 }}
                  onFocus={onFocus} onBlur={onBlur}
                  min="0" title="Urutan"
                />
                <button
                  type="button"
                  onClick={() => handleDelete(schedule.id)}
                  disabled={deletingId === schedule.id || isSaving}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 32, height: 32, flexShrink: 0,
                    background: C.dangerBg, color: C.danger,
                    border: `1.5px solid ${C.dangerBorder}`, borderRadius: 7,
                    cursor: deletingId === schedule.id ? 'not-allowed' : 'pointer',
                    opacity: deletingId === schedule.id ? 0.5 : 1,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (deletingId !== schedule.id) { e.currentTarget.style.background = C.danger; e.currentTarget.style.color = '#fff'; }}}
                  onMouseLeave={e => { e.currentTarget.style.background = C.dangerBg; e.currentTarget.style.color = C.danger; }}
                >
                  <TrashIcon />
                </button>
              </div>

              <input
                type="text" value={schedule.time}
                onChange={e => handleChange(schedule.id, 'time', e.target.value)}
                style={cellInputStyle} onFocus={onFocus} onBlur={onBlur}
                placeholder="Waktu (e.g. 09:00 WIB)"
              />

              <PhotoField
                imageUrl={schedule.imageUrl}
                uploading={uploadingTarget === schedule.id}
                onUploadClick={() => triggerUpload(schedule.id)}
                onRemove={() => handleRemovePhoto(schedule.id)}
              />

              <textarea
                value={schedule.description}
                onChange={e => handleChange(schedule.id, 'description', e.target.value)}
                style={textAreaStyle} onFocus={onFocus} onBlur={onBlur}
                placeholder="Deskripsi ibadah (ditampilkan di popup situs)…"
              />
            </div>
          ))}
        </div>

        {schedules.length > 0 && (
          <button
            type="submit" disabled={isSaving}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '10px 20px',
              background: isSaving ? C.accentDisabled : C.accent,
              color: '#fff', border: 'none', borderRadius: 8,
              fontSize: 13, fontWeight: 700,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s', marginBottom: 28,
            }}
            onMouseEnter={e => { if (!isSaving) e.currentTarget.style.background = C.accentHover; }}
            onMouseLeave={e => { if (!isSaving) e.currentTarget.style.background = C.accent; }}
          >
            <SaveIcon />
            {isSaving ? 'Menyimpan...' : 'Simpan Semua Perubahan'}
          </button>
        )}
      </form>

      {/* ── Add new ── */}
      <div style={{ borderTop: `1.5px solid ${C.border}`, paddingTop: 24 }}>
        <p style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 800, color: C.ink, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Tambah Jadwal Baru
        </p>

        <form
          onSubmit={handleAddSchedule}
          style={{
            display: 'flex', flexDirection: 'column', gap: 10,
            padding: 16, borderRadius: 14,
            background: C.bg, border: `1.5px dashed ${C.border}`,
          }}
        >
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              type="text" placeholder="Nama kebaktian…"
              value={newItem.name}
              onChange={e => setNewItem(prev => ({ ...prev, name: e.target.value }))}
              required
              style={{ ...cellInputStyle, flex: '2 1 160px' }}
              onFocus={onFocus} onBlur={onBlur}
            />
            <input
              type="text" placeholder="Waktu (e.g. 09:00 WIB)"
              value={newItem.time}
              onChange={e => setNewItem(prev => ({ ...prev, time: e.target.value }))}
              required
              style={{ ...cellInputStyle, flex: '2 1 140px' }}
              onFocus={onFocus} onBlur={onBlur}
            />
            <input
              type="number" placeholder="Urutan"
              value={newItem.order === 0 ? '' : newItem.order}
              onChange={e => setNewItem(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
              min="0"
              style={{ ...cellInputStyle, width: 90, flexShrink: 0 }}
              onFocus={onFocus} onBlur={onBlur}
            />
          </div>

          <PhotoField
            imageUrl={newItem.imageUrl}
            uploading={uploadingTarget === 'new'}
            onUploadClick={() => triggerUpload('new')}
            onRemove={() => handleRemovePhoto('new')}
          />

          <textarea
            placeholder="Deskripsi ibadah (ditampilkan di popup situs)…"
            value={newItem.description}
            onChange={e => setNewItem(prev => ({ ...prev, description: e.target.value }))}
            style={textAreaStyle}
            onFocus={onFocus} onBlur={onBlur}
          />

          <button
            type="submit" disabled={isSaving}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '9px 18px',
              background: isSaving ? C.accentDisabled : C.accent,
              color: '#fff', border: 'none', borderRadius: 8,
              fontSize: 13, fontWeight: 700,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s', alignSelf: 'flex-start',
            }}
            onMouseEnter={e => { if (!isSaving) e.currentTarget.style.background = C.accentHover; }}
            onMouseLeave={e => { if (!isSaving) e.currentTarget.style.background = C.accent; }}
          >
            <PlusIcon /> Tambah
          </button>
        </form>
      </div>
    </div>
  );
}