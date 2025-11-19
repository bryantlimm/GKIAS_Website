// components/admin/AdminDashboardContent.tsx
'use client'; 

import { useState } from 'react'; // Import useState
import { useAuth } from '@/components/AuthContext';
import { useRouter } from 'next/navigation';
import SettingsEditor from './SettingsEditor';
import SchedulesEditor from './SchedulesEditor';
import NewsManager from './NewsManager';

export default function AdminDashboardContent() {
  const { user, logout } = useAuth();
  const router = useRouter();

  // State to track which section is open. Default is 'news'.
  const [activeSection, setActiveSection] = useState<string | null>('news');

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  // Helper to toggle sections
  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  return (
    <div className="min-h-screen pt-20 bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        <div className="flex justify-between items-center mb-8 border-b-4 border-blue-600 pb-4">
            <div>
                <h1 className="text-4xl font-extrabold text-blue-900">
                Admin Dashboard 🔒
                </h1>
                <p className="text-lg text-gray-700 mt-1">
                Login sebagai: <span className="font-semibold">{user?.email}</span>
                </p>
            </div>
            <button
            onClick={handleLogout}
            className="py-2 px-6 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 transition duration-300"
            >
            Logout
            </button>
        </div>

        <div className="space-y-6">
            
            {/* --- 1. SETTINGS ACCORDION --- */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <button 
                    onClick={() => toggleSection('settings')}
                    className="w-full flex justify-between items-center p-6 bg-blue-50 hover:bg-blue-100 transition text-left"
                >
                    <span className="text-xl font-bold text-blue-900">1. Pengaturan Halaman Utama (Hero, Visi, Misi)</span>
                    <span className="text-2xl text-blue-600">{activeSection === 'settings' ? '▼' : '▶'}</span>
                </button>
                {activeSection === 'settings' && (
                    <div className="p-6 border-t border-blue-100">
                        <SettingsEditor />
                    </div>
                )}
            </div>

            {/* --- 2. SCHEDULES ACCORDION --- */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <button 
                    onClick={() => toggleSection('schedules')}
                    className="w-full flex justify-between items-center p-6 bg-blue-50 hover:bg-blue-100 transition text-left"
                >
                    <span className="text-xl font-bold text-blue-900">2. Kelola Jadwal Kebaktian</span>
                    <span className="text-2xl text-blue-600">{activeSection === 'schedules' ? '▼' : '▶'}</span>
                </button>
                {activeSection === 'schedules' && (
                    <div className="p-6 border-t border-blue-100">
                        <SchedulesEditor />
                    </div>
                )}
            </div>

            {/* --- 3. NEWS ACCORDION --- */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <button 
                    onClick={() => toggleSection('news')}
                    className="w-full flex justify-between items-center p-6 bg-blue-50 hover:bg-blue-100 transition text-left"
                >
                    <span className="text-xl font-bold text-blue-900">3. Kelola Warta Jemaat & Berita</span>
                    <span className="text-2xl text-blue-600">{activeSection === 'news' ? '▼' : '▶'}</span>
                </button>
                {activeSection === 'news' && (
                    <div className="p-6 border-t border-blue-100">
                        <NewsManager />
                    </div>
                )}
            </div>

        </div>
        
      </div>
    </div>
  );
}