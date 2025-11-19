// components/admin/SchedulesEditor.tsx
'use client';

import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, updateDoc, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';

// Define the structure of a Schedule Item
interface Schedule {
  id: string;
  name: string;
  time: string;
  order: number;
}

export default function SchedulesEditor() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | '', message: string }>({ type: '', message: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [newItem, setNewItem] = useState<Omit<Schedule, 'id'>>({ name: '', time: '', order: 0 });

  const schedulesCollectionRef = collection(db, "schedules");

  // Helper function to fetch data
  const fetchSchedules = async () => {
    try {
      const q = query(schedulesCollectionRef, orderBy("order", "asc"));
      const querySnapshot = await getDocs(q);
      
      const fetchedSchedules: Schedule[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name as string,
          time: data.time as string,
          order: data.order as number,
        };
      });
      setSchedules(fetchedSchedules);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      setStatusMessage({ type: 'error', message: "Gagal memuat jadwal dari Firestore." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  // Handle changes to existing schedule items
  const handleChange = (id: string, field: keyof Schedule, value: string | number) => {
    setSchedules(prev => 
      prev.map(schedule => 
        schedule.id === id ? { ...schedule, [field]: value } : schedule
      )
    );
  };

  // Handle adding a new item
  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || !newItem.time) {
        setStatusMessage({ type: 'error', message: 'Nama dan waktu tidak boleh kosong.' });
        return;
    }
    
    setIsSaving(true);
    setStatusMessage({ type: '', message: '' });

    try {
      // Create a new document with an auto-generated ID
      const newDocRef = doc(schedulesCollectionRef);
      // Use consistent double-casting like we did in handleSaveAll
      await setDoc(newDocRef, newItem as unknown as Record<string, unknown>);
      
      router.refresh();

      // Update local state with the new item and its generated ID
      setSchedules(prev => [...prev, { ...newItem, id: newDocRef.id }].sort((a, b) => a.order - b.order));
      setNewItem({ name: '', time: '', order: 0 }); // Reset form
      setStatusMessage({ type: 'success', message: 'Jadwal baru berhasil ditambahkan!' });

    } catch (error) {
      console.error("Error adding schedule:", error);
      setStatusMessage({ type: 'error', message: 'Gagal menambahkan jadwal baru.' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setStatusMessage({ type: '', message: '' }), 5000);
    }
  };

  // Handle saving all current schedules
  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage({ type: '', message: '' });

    try {
      // Use Promise.all to update all documents concurrently
      const updatePromises = schedules.map(schedule => {
        const { id, ...dataToUpdate } = schedule; 
        const docRef = doc(db, "schedules", id);
        return updateDoc(docRef, dataToUpdate as unknown as Record<string, unknown>);
      });

      await Promise.all(updatePromises);
      router.refresh();

      setStatusMessage({ type: 'success', message: 'Semua jadwal berhasil diperbarui!' });

    } catch (error) {
      console.error("Error updating schedules:", error);
      setStatusMessage({ type: 'error', message: 'Gagal menyimpan semua perubahan jadwal.' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setStatusMessage({ type: '', message: '' }), 5000);
    }
  };
  
  // Handle deleting a schedule item
  const handleDelete = async (id: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus jadwal ini?")) return;

    try {
        await deleteDoc(doc(db, "schedules", id));
        router.refresh();
        setSchedules(prev => prev.filter(schedule => schedule.id !== id));
        setStatusMessage({ type: 'success', message: 'Jadwal berhasil dihapus!' });
    } catch (error) {
        console.error("Error deleting schedule:", error);
        setStatusMessage({ type: 'error', message: 'Gagal menghapus jadwal.' });
    } finally {
        setTimeout(() => setStatusMessage({ type: '', message: '' }), 5000);
    }
  };


  if (loading) {
    return <div className="text-center py-10 text-xl text-gray-600">Memuat Jadwal Kebaktian...</div>;
  }

  return (
    <div className="space-y-8 bg-white p-8 rounded-xl shadow-lg">
      <h2 className="text-3xl font-bold text-blue-800 border-b pb-3">Kelola Jadwal Kebaktian</h2>

      {/* Status Message Display */}
      {statusMessage.message && (
        <div className={`p-4 rounded-lg text-white font-medium ${statusMessage.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {statusMessage.message}
        </div>
      )}

      {/* Existing Schedules Table */}
      <form onSubmit={handleSaveAll} className="space-y-4">
        <h3 className="text-2xl font-semibold text-gray-700">Jadwal yang Ada</h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Kebaktian</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Waktu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Urutan (Order)</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {schedules.map((schedule) => (
                <tr key={schedule.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="text"
                      value={schedule.name}
                      onChange={(e) => handleChange(schedule.id, 'name', e.target.value)}
                      className="w-full border-gray-300 rounded-lg p-2 text-sm text-gray-900"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="text"
                      value={schedule.time}
                      onChange={(e) => handleChange(schedule.id, 'time', e.target.value)}
                      className="w-full border-gray-300 rounded-lg p-2 text-sm text-gray-900"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      value={schedule.order}
                      onChange={(e) => handleChange(schedule.id, 'order', parseInt(e.target.value) || 0)}
                      className="w-full border-gray-300 rounded-lg p-2 text-sm text-gray-900"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      type="button"
                      onClick={() => handleDelete(schedule.id)}
                      className="text-red-600 hover:text-red-900"
                      disabled={isSaving}
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          type="submit"
          className="py-2 px-6 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition duration-300 disabled:opacity-50"
          disabled={isSaving}
        >
          {isSaving ? 'Menyimpan...' : 'Simpan Semua Jadwal'}
        </button>
      </form>
      
      {/* Add New Schedule Form */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-2xl font-semibold text-gray-700 mb-4">Tambah Jadwal Baru</h3>
        
        {/* FIXED HERE: 
          Changed className to use Flexbox layout (flex flex-col md:flex-row) 
          instead of Input styling (border, padding, etc.).
        */}
        <form onSubmit={handleAddSchedule} className="flex flex-col md:flex-row gap-4 items-end">
            <input
                type="text"
                placeholder="Nama Kebaktian (e.g., Kebaktian Umum 3)"
                value={newItem.name}
                onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                className="flex-grow px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                required
            />
            <input
                type="text"
                placeholder="Waktu (e.g., 17:00 WIB)"
                value={newItem.time}
                onChange={(e) => setNewItem(prev => ({ ...prev, time: e.target.value }))}
                className="flex-grow px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                required
            />
            <input
                type="number"
                placeholder="Urutan"
                value={newItem.order === 0 ? '' : newItem.order}
                onChange={(e) => setNewItem(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                className="w-full md:w-32 px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                min="0"
            />
            <button
                type="submit"
                className="w-full md:w-auto py-2 px-6 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-300 disabled:opacity-50"
                disabled={isSaving}
            >
                Tambah
            </button>
        </form>
      </div>

    </div>
  );
}