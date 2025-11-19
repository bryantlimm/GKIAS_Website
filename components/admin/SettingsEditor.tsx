// components/admin/SettingsEditor.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

interface SettingsData {
  heroTitle: string;
  heroImageUrl: string;
  visi: string;
  misi: string;
  gerejaIndukTitle: string;
  gerejaIndukDescription: string;
  gerejaIndukImageUrl: string;
}

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

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(settingsDocRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data() as SettingsData);
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage({ type: '', message: '' });

    try {
      await updateDoc(settingsDocRef, settings as unknown as Record<string, unknown>);
      setStatusMessage({ type: 'success', message: 'Pengaturan disimpan!' });
    } catch (error) {
      console.error("Error updating settings:", error);
      setStatusMessage({ type: 'error', message: 'Gagal menyimpan.' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setStatusMessage({ type: '', message: '' }), 5000);
    }
  };

  if (loading) return <div>Loading...</div>;

  // Helper class for inputs: Added 'text-gray-900' to ensure dark text
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">URL Gambar Utama</label>
          <input name="heroImageUrl" type="url" value={settings.heroImageUrl} onChange={handleChange} className={inputClass} required />
        </div>
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

      <button type="submit" className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50" disabled={isSaving}>
        {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
      </button>
    </form>
  );
}