// components/admin/NewsManager.tsx
'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { db, storage } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Image from 'next/image';

interface NewsItem {
  id: string;
  title: string;
  body: string;
  imageUrl: string;
  pdfUrl?: string; // Optional PDF URL
  date: Timestamp;
}

export default function NewsManager() {
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | '', message: string }>({ type: '', message: '' });

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  
  // Image State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState('');

  // PDF State (NEW)
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [existingPdfUrl, setExistingPdfUrl] = useState('');

  const newsCollectionRef = collection(db, "news");

  const fetchNews = async () => {
    setLoading(true);
    try {
      const q = query(newsCollectionRef, orderBy("date", "desc"));
      const querySnapshot = await getDocs(q);
      const fetchedNews = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as NewsItem[];
      setNewsList(fetchedNews);
    } catch (error) {
      console.error("Error fetching news:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNews(); }, []);

  // Helper to upload files
  const handleFileUpload = async (file: File, path: string): Promise<string> => {
    const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const resetForm = () => {
    setTitle('');
    setBody('');
    setImageFile(null);
    setExistingImageUrl('');
    setPdfFile(null); // Reset PDF
    setExistingPdfUrl(''); // Reset PDF
    setIsEditing(false);
    setEditId(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage({ type: '', message: '' });

    try {
      let finalImageUrl = existingImageUrl;
      let finalPdfUrl = existingPdfUrl;

      // Upload Image if new one selected
      if (imageFile) {
        finalImageUrl = await handleFileUpload(imageFile, 'news_images');
      }

      // Upload PDF if new one selected (NEW)
      if (pdfFile) {
        finalPdfUrl = await handleFileUpload(pdfFile, 'news_pdfs');
      }

      const newsData = {
        title,
        body,
        imageUrl: finalImageUrl || "https://picsum.photos/600/400",
        pdfUrl: finalPdfUrl || "", // Save PDF URL
        date: Timestamp.now(),
      };

      if (isEditing && editId) {
        const newsDoc = doc(db, "news", editId);
        await updateDoc(newsDoc, newsData as unknown as Record<string, unknown>);
        setStatusMessage({ type: 'success', message: 'Berita berhasil diperbarui!' });
      } else {
        await addDoc(newsCollectionRef, newsData);
        setStatusMessage({ type: 'success', message: 'Berita baru berhasil diterbitkan!' });
      }

      await fetchNews();
      resetForm();

    } catch (error) {
      console.error("Error saving news:", error);
      setStatusMessage({ type: 'error', message: 'Gagal menyimpan berita.' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setStatusMessage({ type: '', message: '' }), 5000);
    }
  };

  const handleEditClick = (item: NewsItem) => {
    setIsEditing(true);
    setEditId(item.id);
    setTitle(item.title);
    setBody(item.body || '');
    setExistingImageUrl(item.imageUrl);
    setExistingPdfUrl(item.pdfUrl || ''); // Load existing PDF
    setImageFile(null);
    setPdfFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Hapus berita ini?")) return;
    try {
      await deleteDoc(doc(db, "news", id));
      setNewsList(prev => prev.filter(item => item.id !== id));
      setStatusMessage({ type: 'success', message: 'Berita dihapus.' });
    } catch (error) {
      setStatusMessage({ type: 'error', message: 'Gagal menghapus.' });
    }
  };

  // Common class for inputs with Dark Text
  const inputClass = "w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900";

  return (
    <div className="bg-white space-y-8">
      {statusMessage.message && (
        <div className={`p-4 rounded-lg text-white font-medium ${statusMessage.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {statusMessage.message}
        </div>
      )}

      {/* FORM */}
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <h3 className="text-xl font-bold text-gray-700 mb-4">{isEditing ? 'Edit Berita' : 'Tambah Berita Baru'}</h3>
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Judul Berita</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} required />
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Konten / Deskripsi</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} className={inputClass} required />
          </div>

          {/* Image Upload */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Upload Gambar (Opsional)</label>
                {existingImageUrl && !imageFile && <div className="text-xs text-green-600 mb-1">✓ Gambar terpasang</div>}
                <input 
                    type="file" 
                    onChange={(e: ChangeEvent<HTMLInputElement>) => e.target.files && setImageFile(e.target.files[0])}
                    accept="image/*"
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
            </div>

            {/* PDF Upload (NEW) */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Upload PDF (Opsional)</label>
                {existingPdfUrl && !pdfFile && <div className="text-xs text-green-600 mb-1">✓ PDF terpasang</div>}
                <input 
                    type="file" 
                    onChange={(e: ChangeEvent<HTMLInputElement>) => e.target.files && setPdfFile(e.target.files[0])}
                    accept="application/pdf" // Only accept PDF
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                />
            </div>
          </div>

          <div className="flex space-x-3">
            <button type="submit" disabled={isSaving} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 transition disabled:opacity-50">
              {isSaving ? 'Menyimpan...' : (isEditing ? 'Update Berita' : 'Terbitkan Berita')}
            </button>
            {isEditing && (
              <button type="button" onClick={resetForm} className="px-6 py-2 bg-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-400 transition">
                Batal
              </button>
            )}
          </div>
        </form>
      </div>

      {/* LIST */}
      <div className="grid gap-6 md:grid-cols-2">
        {newsList.map((item) => (
          <div key={item.id} className="border border-gray-200 rounded-xl p-4 flex gap-4 bg-white items-start">
            <div className="relative w-24 h-24 flex-shrink-0 bg-gray-200 rounded-md overflow-hidden">
              <Image src={item.imageUrl} alt={item.title} fill className="object-cover" />
            </div>
            <div className="flex-grow overflow-hidden">
              <h4 className="font-bold text-lg text-gray-900 truncate">{item.title}</h4>
              <p className="text-xs text-blue-600 mb-1">{item.date?.toDate().toLocaleDateString()}</p>
              {/* Indicator if PDF exists */}
              {item.pdfUrl && <span className="inline-block bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded mb-2">PDF Attached 📎</span>}
              <div className="mt-2 flex space-x-3">
                <button onClick={() => handleEditClick(item)} className="text-sm text-blue-600 font-medium hover:underline">Edit</button>
                <button onClick={() => handleDelete(item.id)} className="text-sm text-red-600 font-medium hover:underline">Hapus</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}