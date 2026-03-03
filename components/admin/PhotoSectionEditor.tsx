// components/admin/PhotoSectionEditor.tsx
'use client';

import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { db, storage } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore'; // Changed to setDoc
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface PhotoSectionData {
  title: string;
  description: string;
  imageUrls: string[];
}

const initialData: PhotoSectionData = {
  title: '',
  description: '',
  imageUrls: [],
};

export default function PhotoSectionEditor() {
  const router = useRouter();

  const [data, setData] = useState<PhotoSectionData>(initialData);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | '', message: string }>({ type: '', message: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Using a separate document for the photo section
  const sectionDocRef = doc(db, "settings", "photoSection");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const docSnap = await getDoc(sectionDocRef);
        if (docSnap.exists()) {
          setData({ ...initialData, ...docSnap.data() });
        }
      } catch (error) {
        console.error("Error fetching photo section settings:", error);
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) 
        return (
    <div className="p-10 bg-gray-100 text-center">
      <p>Debug: PhotoSection data received, but imageUrls is empty.</p>
    </div>
    );

    setIsUploading(true);
    setStatusMessage({ type: '', message: '' });

    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const storageRef = ref(storage, `gallery_images/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        newUrls.push(downloadUrl);
      }

      setData(prev => ({
        ...prev,
        imageUrls: [...prev.imageUrls, ...newUrls]
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
    setData(prev => ({
      ...prev,
      imageUrls: prev.imageUrls.filter((_, index) => index !== indexToRemove)
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage({ type: '', message: '' });

    try {
      // Use setDoc with merge: true so it creates the document if this is the first time!
      await setDoc(sectionDocRef, data as unknown as Record<string, unknown>, { merge: true });
      setStatusMessage({ type: 'success', message: 'Pengaturan Galeri disimpan!' });
      router.refresh();
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Judul Seksi Foto</label>
          <input name="title" type="text" value={data.title} onChange={handleChange} className={inputClass} placeholder="Misal: Galeri Pelayanan" required />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi Singkat</label>
        <textarea name="description" value={data.description} onChange={handleChange} rows={3} className={inputClass} placeholder="Teks yang muncul di atas foto..." required />
      </div>

      <div className="border-2 border-dashed border-gray-300 p-4 rounded-lg">
        <label className="block text-sm font-medium text-gray-700 mb-2">Unggah Foto Galeri</label>
        
        <input 
          type="file" 
          accept="image/*" 
          multiple 
          onChange={handleImageUpload} 
          disabled={isUploading}
          className="mb-4 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        {isUploading && <p className="text-blue-600 text-sm">Mengunggah gambar...</p>}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {data.imageUrls.map((url, index) => (
            <div key={index} className="relative group">
              <img src={url} alt={`Gallery ${index}`} className="w-full h-32 object-cover rounded-md shadow-sm" />
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
                className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-80 hover:opacity-100"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      </div>

      <button type="submit" className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50" disabled={isSaving || isUploading}>
        {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
      </button>
    </form>
  );
}