// components/admin/SettingsEditor.tsx
'use client';

import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
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

export default function SettingsEditor() {
  const router = useRouter();

  const [settings, setSettings] = useState<SettingsData>(initialSettings);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | '', message: string }>({ type: '', message: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const settingsDocRef = doc(db, "settings", "homePage");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(settingsDocRef);
        // if (docSnap.exists()) {
        //   setSettings(docSnap.data() as SettingsData);
        // }
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSettings({
            ...initialSettings,
            ...data,
            heroImageUrls: data.heroImageUrls || (data.heroImageUrl ? [data.heroImageUrl] : [])
          });
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
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

  // buat saving array gambar hero
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
        const downloadUrl = await getDownloadURL(snapshot.ref);
        newUrls.push(downloadUrl);
      }

      setSettings(prev => ({
        ...prev,
        heroImageUrls: [...prev.heroImageUrls, ...newUrls]
      }));
      setStatusMessage({ type: 'success', message: 'Gambar berhasil diunggah!' });
    } catch (error) {
      console.error("Upload error:", error);
      setStatusMessage({ type: 'error', message: 'Gagal mengunggah gambar.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setSettings(prev => ({
      ...prev,
      heroImageUrls: prev.heroImageUrls.filter((_, index) => index !== indexToRemove)
    }));
  };

  // ----

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage({ type: '', message: '' });

    try {
      await updateDoc(settingsDocRef, settings as unknown as Record<string, unknown>);
      setStatusMessage({ type: 'success', message: 'Pengaturan disimpan!' });
      router.refresh();
      setStatusMessage({ type: 'success', message: 'Pengaturan disimpan!' }); // ulang aja
    } catch (error) {
      console.error("Error updating settings:", error);
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

      <h3 className="text-xl font-semibold text-gray-800 pt-2">Header Utama</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Judul Utama</label>
          <input name="heroTitle" type="text" value={settings.heroTitle} onChange={handleChange} className={inputClass} required />
        </div>

{/* ---- */}

        <div className="border-2 border-dashed border-gray-300 p-4 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">Gambar Banner (Bisa lebih dari 1)</label>
          
          {/* File Input */}
          <input 
            type="file" 
            accept="image/*" 
            multiple 
            onChange={handleImageUpload} 
            disabled={isUploading}
            className="mb-4 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {isUploading && <p className="text-blue-600 text-sm">Mengunggah gambar...</p>}

          {/* Image Preview Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            {settings.heroImageUrls.map((url, index) => (
              <div key={index} className="relative group">
                <img src={url} alt={`Hero ${index}`} className="w-full h-32 object-cover rounded-md shadow-sm" />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-80 hover:opacity-100"
                  title="Hapus gambar"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </div>

{/* yg lama */}
        {/* <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">URL Gambar Utama</label>
          <input name="heroImageUrl" type="url" value={settings.heroImageUrl} onChange={handleChange} className={inputClass} required />
        </div>*/}
      </div> 

      <h3 className="text-xl font-semibold text-gray-800 pt-2">Visi & Misi</h3>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Visi</label>
        <textarea name="visi" value={settings.visi} onChange={handleChange} rows={4} className={inputClass} required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Misi</label>
        <textarea name="misi" value={settings.misi} onChange={handleChange} rows={6} className={inputClass} required />
      </div>

      <h3 className="text-xl font-semibold text-gray-800 pt-2">Gereja Induk</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Judul</label>
          <input name="gerejaIndukTitle" type="text" value={settings.gerejaIndukTitle} onChange={handleChange} className={inputClass} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">URL Gambar</label>
          <input name="gerejaIndukImageUrl" type="url" value={settings.gerejaIndukImageUrl} onChange={handleChange} className={inputClass} required />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
        <textarea name="gerejaIndukDescription" value={settings.gerejaIndukDescription} onChange={handleChange} rows={4} className={inputClass} required />
      </div>
      
      <button type="submit" className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50" disabled={isSaving || isUploading}>
        {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
      </button>
    </form>
  );
}