// components/admin/NewsManager.tsx
'use client';

import { useRouter } from 'next/navigation';
import React, { useState, useEffect, ChangeEvent, FormEvent, useRef } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Image from 'next/image';

interface NewsItem {
  id: string;
  title: string;
  body: string;
  imageUrl: string;
  pdfUrl?: string;
  date: Timestamp;
}

interface NewsDraft {
  id: string;
  title: string;
  body: string;
  imageFile: File | null;
  existingImageUrl: string;
  pdfFile: File | null;
  existingPdfUrl: string;
}

const createEmptyDraft = (): NewsDraft => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  title: '',
  body: '',
  imageFile: null,
  existingImageUrl: '',
  pdfFile: null,
  existingPdfUrl: '',
});

// ─── Icons ────────────────────────────────────────────────────────────────────

const PlusIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const EditIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
    <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
);

const UploadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
    <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>
  </svg>
);

const PdfIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);

const SearchIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: '1.5px solid #e2e8f0',
  borderRadius: 8,
  fontSize: 14,
  color: '#1e293b',
  background: '#fff',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {children}
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

function FileDropZone({
  label, accept, hint, file, existingUrl, existingLabel, onChange,
}: {
  label: string; accept: string; hint: string;
  file: File | null; existingUrl: string; existingLabel: string;
  onChange: (f: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const hasFile = file || existingUrl;

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) onChange(f); }}
        style={{
          border: `2px dashed ${dragging ? '#3b5bdb' : hasFile ? '#bbf7d0' : '#e2e8f0'}`,
          borderRadius: 10, padding: '18px 16px', textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? '#eff3ff' : hasFile ? '#f0fdf4' : '#f8fafc',
          transition: 'all 0.2s',
        }}
      >
        <div style={{ color: hasFile ? '#16a34a' : '#94a3b8', marginBottom: 6, display: 'flex', justifyContent: 'center' }}>
          {hasFile ? <CheckIcon /> : <UploadIcon />}
        </div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: hasFile ? '#16a34a' : '#64748b' }}>
          {file ? file.name : existingUrl ? existingLabel : 'Klik atau drag & drop'}
        </p>
        <p style={{ margin: '3px 0 0', fontSize: 11, color: '#94a3b8' }}>{hint}</p>
      </div>
      <input ref={inputRef} type="file" accept={accept} style={{ display: 'none' }}
        onChange={(e: ChangeEvent<HTMLInputElement>) => e.target.files && onChange(e.target.files[0])} />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NewsManager() {
  const router = useRouter();

  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | ''; message: string }>({ type: '', message: '' });
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [existingPdfUrl, setExistingPdfUrl] = useState('');
  const [drafts, setDrafts] = useState<NewsDraft[]>([createEmptyDraft()]);

  const newsCollectionRef = collection(db, 'news');

  const fetchNews = async () => {
    setLoading(true);
    try {
      const q = query(newsCollectionRef, orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      setNewsList(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as NewsItem[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNews(); }, []);

  const handleFileUpload = async (file: File, path: string): Promise<string> => {
    const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  };

  const updateDraft = (index: number, updates: Partial<NewsDraft>) => {
    setDrafts(prev => prev.map((draft, draftIndex) => draftIndex === index ? { ...draft, ...updates } : draft));
  };

  const handleAddDraft = () => {
    setDrafts(prev => [...prev, createEmptyDraft()]);
  };

  const handleRemoveDraft = (index: number) => {
    setDrafts(prev => {
      if (prev.length === 1) {
        return [createEmptyDraft()];
      }
      return prev.filter((_, draftIndex) => draftIndex !== index);
    });
  };

  const resetForm = () => {
    setTitle(''); setBody('');
    setImageFile(null); setExistingImageUrl('');
    setPdfFile(null); setExistingPdfUrl('');
    setDrafts([createEmptyDraft()]);
    setIsEditing(false); setEditId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage({ type: '', message: '' });

    try {
      if (isEditing && editId) {
        const finalImageUrl = imageFile ? await handleFileUpload(imageFile, 'news_images') : existingImageUrl;
        const finalPdfUrl = pdfFile ? await handleFileUpload(pdfFile, 'news_pdfs') : existingPdfUrl;
        const newsData = {
          title,
          body,
          imageUrl: finalImageUrl || 'https://picsum.photos/600/400',
          pdfUrl: finalPdfUrl || '',
          date: Timestamp.now(),
        };

        await updateDoc(doc(db, 'news', editId), newsData as unknown as Record<string, unknown>);
        setStatusMessage({ type: 'success', message: 'Berita berhasil diperbarui!' });
        router.refresh();
        await fetchNews();
        resetForm();
        return;
      }

      const draftsToPublish = drafts.filter(draft => draft.title.trim() || draft.body.trim());

      if (draftsToPublish.length === 0) {
        setStatusMessage({ type: 'error', message: 'Isi judul dan konten untuk setidaknya satu berita.' });
        return;
      }

      for (const draft of draftsToPublish) {
        if (!draft.title.trim() || !draft.body.trim()) {
          setStatusMessage({ type: 'error', message: 'Setiap berita harus memiliki judul dan konten.' });
          return;
        }
      }

      for (const draft of draftsToPublish) {
        const finalImageUrl = draft.imageFile ? await handleFileUpload(draft.imageFile, 'news_images') : draft.existingImageUrl;
        const finalPdfUrl = draft.pdfFile ? await handleFileUpload(draft.pdfFile, 'news_pdfs') : draft.existingPdfUrl;

        await addDoc(newsCollectionRef, {
          title: draft.title.trim(),
          body: draft.body.trim(),
          imageUrl: finalImageUrl || 'https://picsum.photos/600/400',
          pdfUrl: finalPdfUrl || '',
          date: Timestamp.now(),
        });
      }

      setStatusMessage({
        type: 'success',
        message: draftsToPublish.length > 1 ? `${draftsToPublish.length} berita berhasil diterbitkan!` : 'Berita berhasil diterbitkan!',
      });
      router.refresh();
      await fetchNews();
      resetForm();
    } catch (e) {
      console.error(e);
      setStatusMessage({ type: 'error', message: 'Gagal menyimpan berita.' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setStatusMessage({ type: '', message: '' }), 5000);
    }
  };

  const handleEditClick = (item: NewsItem) => {
    setIsEditing(true); setEditId(item.id);
    setTitle(item.title); setBody(item.body || '');
    setExistingImageUrl(item.imageUrl); setExistingPdfUrl(item.pdfUrl || '');
    setImageFile(null); setPdfFile(null);
    setDrafts([createEmptyDraft()]);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus berita ini?')) return;
    try {
      await deleteDoc(doc(db, 'news', id));
      setNewsList(prev => prev.filter(i => i.id !== id));
      setStatusMessage({ type: 'success', message: 'Berita dihapus.' });
      setTimeout(() => setStatusMessage({ type: '', message: '' }), 3000);
    } catch {
      setStatusMessage({ type: 'error', message: 'Gagal menghapus.' });
    }
  };

  const formatDate = (ts: Timestamp) =>
    ts?.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  const filteredNewsList = newsList.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif" }}>
      <StatusToast type={statusMessage.type} message={statusMessage.message} />

      {/* ── Toolbar: search + add button ── */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
        {/* Search */}
        <div style={{ flex: 1, position: 'relative' }}>
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}>
            <SearchIcon />
          </div>
          <input
            type="text"
            placeholder="Cari berita berdasarkan judul..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 38, paddingRight: searchQuery ? 36 : 14 }}
            onFocus={e => (e.target.style.borderColor = '#3b5bdb')}
            onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#94a3b8', display: 'flex', alignItems: 'center', padding: 2,
              }}
            >
              <XIcon />
            </button>
          )}
        </div>

        {/* Add button */}
        {!showForm && (
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '10px 16px', flexShrink: 0,
              background: '#3b5bdb', color: '#fff',
              border: 'none', borderRadius: 8,
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#2f4ac7')}
            onMouseLeave={e => (e.currentTarget.style.background = '#3b5bdb')}
          >
            <PlusIcon /> Tambah
          </button>
        )}
      </div>

      {/* Article count */}
      <p style={{ margin: '0 0 20px', fontSize: 13, color: '#94a3b8' }}>
        {loading ? 'Memuat...' : searchQuery
          ? `${filteredNewsList.length} dari ${newsList.length} berita`
          : `${newsList.length} berita`
        }
      </p>

      {/* ── Form ── */}
      {showForm && (
        <div style={{ border: '1.5px solid #e2e8f0', borderRadius: 12, marginBottom: 24, overflow: 'hidden' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px', background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0',
          }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
              {isEditing ? 'Edit Berita' : 'Tambah Berita Baru'}
            </p>
            <button onClick={resetForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', padding: 4 }}>
              <XIcon />
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ padding: '20px 20px 24px' }}>
            {isEditing ? (
              <>
                <div style={{ marginBottom: 16 }}>
                  <FieldLabel>Judul Berita</FieldLabel>
                  <input
                    type="text" value={title} onChange={e => setTitle(e.target.value)}
                    placeholder="Masukkan judul berita..." required style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = '#3b5bdb')}
                    onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <FieldLabel>Konten / Deskripsi</FieldLabel>
                  <textarea
                    value={body} onChange={e => setBody(e.target.value)}
                    placeholder="Tulis isi berita di sini..."
                    rows={5} required
                    style={{ ...inputStyle, resize: 'vertical' }}
                    onFocus={e => (e.target.style.borderColor = '#3b5bdb')}
                    onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 22 }}>
                  <FileDropZone
                    label="Gambar (Opsional)" accept="image/*" hint="PNG, JPG hingga 5MB"
                    file={imageFile} existingUrl={existingImageUrl} existingLabel="Gambar terpasang"
                    onChange={setImageFile}
                  />
                  <FileDropZone
                    label="PDF (Opsional)" accept="application/pdf" hint="File PDF"
                    file={pdfFile} existingUrl={existingPdfUrl} existingLabel="PDF terpasang"
                    onChange={setPdfFile}
                  />
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {drafts.map((draft, index) => (
                  <div key={draft.id} style={{ border: '1.5px solid #e2e8f0', borderRadius: 10, padding: 16, background: '#f8fafc' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Berita {index + 1}</p>
                      {drafts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDraft(index)}
                          style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                        >
                          Hapus
                        </button>
                      )}
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <FieldLabel>Judul Berita</FieldLabel>
                      <input
                        type="text"
                        value={draft.title}
                        onChange={e => updateDraft(index, { title: e.target.value })}
                        placeholder="Masukkan judul berita..."
                        style={inputStyle}
                        onFocus={e => (e.target.style.borderColor = '#3b5bdb')}
                        onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                      />
                    </div>

                    <div style={{ marginBottom: 20 }}>
                      <FieldLabel>Konten / Deskripsi</FieldLabel>
                      <textarea
                        value={draft.body}
                        onChange={e => updateDraft(index, { body: e.target.value })}
                        placeholder="Tulis isi berita di sini..."
                        rows={4}
                        style={{ ...inputStyle, resize: 'vertical' }}
                        onFocus={e => (e.target.style.borderColor = '#3b5bdb')}
                        onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <FileDropZone
                        label="Gambar (Opsional)"
                        accept="image/*"
                        hint="PNG, JPG hingga 5MB"
                        file={draft.imageFile}
                        existingUrl={draft.existingImageUrl}
                        existingLabel="Gambar terpasang"
                        onChange={(file) => updateDraft(index, { imageFile: file, existingImageUrl: '' })}
                      />
                      <FileDropZone
                        label="PDF (Opsional)"
                        accept="application/pdf"
                        hint="File PDF"
                        file={draft.pdfFile}
                        existingUrl={draft.existingPdfUrl}
                        existingLabel="PDF terpasang"
                        onChange={(file) => updateDraft(index, { pdfFile: file, existingPdfUrl: '' })}
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddDraft}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '10px 14px', background: '#eff3ff', color: '#3b5bdb',
                    border: '1.5px solid #c7d2fe', borderRadius: 8,
                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  <PlusIcon /> Tambah Berita Lain
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button
                type="submit" disabled={isSaving}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '10px 20px',
                  background: isSaving ? '#93a3c7' : '#3b5bdb',
                  color: '#fff', border: 'none', borderRadius: 8,
                  fontSize: 13, fontWeight: 700, cursor: isSaving ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!isSaving) e.currentTarget.style.background = '#2f4ac7'; }}
                onMouseLeave={e => { if (!isSaving) e.currentTarget.style.background = '#3b5bdb'; }}
              >
                {isSaving ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Terbitkan Berita'}
              </button>
              <button
                type="button" onClick={resetForm}
                style={{
                  padding: '10px 16px', background: 'transparent', color: '#64748b',
                  border: '1.5px solid #e2e8f0', borderRadius: 8,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── News list ── */}
      {loading ? (
        <div style={{ color: '#94a3b8', fontSize: 14, padding: '24px 0', textAlign: 'center' }}>Memuat berita...</div>
      ) : newsList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Belum ada berita</p>
          <p style={{ margin: '4px 0 0', fontSize: 13 }}>Klik Tambah untuk membuat warta pertama</p>
        </div>
      ) : filteredNewsList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Tidak ada hasil</p>
          <p style={{ margin: '4px 0 0', fontSize: 13 }}>Coba ubah kata kunci pencarian</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredNewsList.map(item => (
            <div
              key={item.id}
              style={{
                display: 'flex', gap: 14, alignItems: 'center',
                padding: '14px 16px',
                border: '1.5px solid #e8ecf0', borderRadius: 10,
                background: '#fff', transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#c7d2fe')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#e8ecf0')}
            >
              <div style={{ width: 56, height: 56, borderRadius: 8, overflow: 'hidden', background: '#f1f5f9', flexShrink: 0, position: 'relative' }}>
                <Image src={item.imageUrl} alt={item.title} fill style={{ objectFit: 'cover' }} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.title}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>{formatDate(item.date)}</p>
                  {item.pdfUrl && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#fff5f5', color: '#dc2626', fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 5 }}>
                      <PdfIcon /> PDF
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                  onClick={() => handleEditClick(item)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px',
                    background: '#f1f5f9', color: '#3b5bdb', border: '1.5px solid #e2e8f0', borderRadius: 7,
                    fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#eff3ff'; e.currentTarget.style.borderColor = '#c7d2fe'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                >
                  <EditIcon /> Edit
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px',
                    background: '#fff5f5', color: '#dc2626', border: '1.5px solid #fecaca', borderRadius: 7,
                    fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#dc2626'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#fff5f5'; e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#fecaca'; }}
                >
                  <TrashIcon /> Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}