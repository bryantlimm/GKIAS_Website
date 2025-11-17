// components/admin/SettingsEditor.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

// Define the structure of the settings data
interface SettingsData {
  heroTitle: string;
  heroImageUrl: string;
  visi: string;
  misi: string;
  gerejaIndukTitle: string;
  gerejaIndukDescription: string;
  gerejaIndukImageUrl: string;
}

// Initial state for the form
const initialSettings: SettingsData = {
  heroTitle: '',
  heroImageUrl: '',
  visi: '',
  misi: '',
  gerejaIndukTitle: '',
  gerejaIndukDescription: '',
  gerejaIndukImageUrl: '',
};

export default function SettingsEditor() {
  const [settings, setSettings] = useState<SettingsData>(initialSettings);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | '', message: string }>({ type: '', message: '' });
  const [isSaving, setIsSaving] = useState(false);

  const settingsDocRef = doc(db, "settings", "homePage");

  // 1. Fetch data on load
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(settingsDocRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data() as SettingsData);
        } else {
          setStatusMessage({ type: 'error', message: "Document 'homePage' not found. Using default values." });
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
        setStatusMessage({ type: 'error', message: "Gagal memuat data dari Firestore." });
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // Handler for all input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  // 2. Handle saving the data
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage({ type: '', message: '' });

    try {
    //   await updateDoc(settingsDocRef, settings); <------ THIS IS AN ERROR
      setStatusMessage({ type: 'success', message: 'Pengaturan halaman utama berhasil disimpan!' });
    } catch (error) {
      console.error("Error updating settings:", error);
      setStatusMessage({ type: 'error', message: 'Gagal menyimpan data ke Firestore.' });
    } finally {
      setIsSaving(false);
      // Clear message after a short delay
      setTimeout(() => setStatusMessage({ type: '', message: '' }), 5000);
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-xl text-gray-600">Memuat Pengaturan...</div>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 bg-white p-8 rounded-xl shadow-lg">
      <h2 className="text-3xl font-bold text-blue-800 border-b pb-3 mb-6">Kelola Pengaturan Halaman Utama</h2>

      {/* Status Message Display */}
      {statusMessage.message && (
        <div className={`p-4 rounded-lg text-white font-medium ${statusMessage.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {statusMessage.message}
        </div>
      )}

      {/* --- HERO SECTION FIELDS --- */}
      <h3 className="text-2xl font-semibold text-gray-700 pt-4">Header Utama</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="heroTitle" className="block text-sm font-medium text-gray-700 mb-1">Judul Utama (Hero Title)</label>
          <input
            id="heroTitle"
            name="heroTitle"
            type="text"
            value={settings.heroTitle}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
        <div>
          <label htmlFor="heroImageUrl" className="block text-sm font-medium text-gray-700 mb-1">URL Gambar Utama (Hero Image URL)</label>
          <input
            id="heroImageUrl"
            name="heroImageUrl"
            type="url"
            value={settings.heroImageUrl}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
      </div>

      {/* --- VISI & MISI FIELDS --- */}
      <h3 className="text-2xl font-semibold text-gray-700 pt-4">Visi & Misi</h3>
      <div>
        <label htmlFor="visi" className="block text-sm font-medium text-gray-700 mb-1">Visi</label>
        <textarea
          id="visi"
          name="visi"
          value={settings.visi}
          onChange={handleChange}
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>
      <div>
        <label htmlFor="misi" className="block text-sm font-medium text-gray-700 mb-1">Misi</label>
        <textarea
          id="misi"
          name="misi"
          value={settings.misi}
          onChange={handleChange}
          rows={6}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>

      {/* --- GEREJA INDUK FIELDS --- */}
      <h3 className="text-2xl font-semibold text-gray-700 pt-4">Bagian Gereja Induk</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="gerejaIndukTitle" className="block text-sm font-medium text-gray-700 mb-1">Judul Gereja Induk</label>
          <input
            id="gerejaIndukTitle"
            name="gerejaIndukTitle"
            type="text"
            value={settings.gerejaIndukTitle}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
        <div>
          <label htmlFor="gerejaIndukImageUrl" className="block text-sm font-medium text-gray-700 mb-1">URL Gambar Gereja Induk</label>
          <input
            id="gerejaIndukImageUrl"
            name="gerejaIndukImageUrl"
            type="url"
            value={settings.gerejaIndukImageUrl}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
      </div>
      <div>
        <label htmlFor="gerejaIndukDescription" className="block text-sm font-medium text-gray-700 mb-1">Deskripsi Gereja Induk</label>
        <textarea
          id="gerejaIndukDescription"
          name="gerejaIndukDescription"
          value={settings.gerejaIndukDescription}
          onChange={handleChange}
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-300 disabled:opacity-50 mt-8"
        disabled={isSaving}
      >
        {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
      </button>
    </form>
  );
}