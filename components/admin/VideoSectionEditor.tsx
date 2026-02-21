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

const initialData: VideoSectionData = {
  title: '',
  description: '',
  youtubeUrl: '',
};

export default function VideoSectionEditor() {
  const router = useRouter();

  const [data, setData] = useState<VideoSectionData>(initialData);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | '', message: string }>({ type: '', message: '' });
  const [isSaving, setIsSaving] = useState(false);

  const sectionDocRef = doc(db, "settings", "youtubeSection");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const docSnap = await getDoc(sectionDocRef);
        if (docSnap.exists()) {
          setData({ ...initialData, ...docSnap.data() });
        }
      } catch (error) {
        console.error("Error fetching video section settings:", error);
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
      setStatusMessage({ type: 'success', message: 'Pengaturan Video disimpan!' });
      router.refresh();
    } catch (error) {
      console.error("Error updating video settings:", error);
      setStatusMessage({ type: 'error', message: 'Gagal menyimpan.' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setStatusMessage({ type: '', message: '' }), 5000);
    }
  };

  if (loading) return <div>Loading...</div>;

  const inputClass = "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900";

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {statusMessage.message && (
        <div className={`p-4 rounded-lg text-white font-medium ${statusMessage.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {statusMessage.message}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Judul Seksi Video</label>
        <input name="title" type="text" value={data.title} onChange={handleChange} className={inputClass} placeholder="Misal: Saksikan Ibadah Minggu Ini" required />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
        <textarea name="description" value={data.description} onChange={handleChange} rows={4} className={inputClass} placeholder="Teks yang muncul di sebelah video..." required />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Link YouTube</label>
        <input 
          name="youtubeUrl" 
          type="url" 
          value={data.youtubeUrl} 
          onChange={handleChange} 
          className={inputClass} 
          placeholder="https://www.youtube.com/watch?v=... atau https://www.youtube.com/live/..." 
          required 
        />
        <p className="text-xs text-gray-500 mt-1">Bisa menggunakan link dari address bar atau link Share YouTube.</p>
      </div>

      <button type="submit" className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50" disabled={isSaving}>
        {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
      </button>
    </form>
  );
}