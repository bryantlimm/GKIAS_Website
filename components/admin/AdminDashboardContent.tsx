// components/admin/AdminDashboardContent.tsx
'use client'; // This component needs to be client-side to use the logout function

import { useAuth } from '@/components/AuthContext';
import { useRouter } from 'next/navigation';

export default function AdminDashboardContent() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/'); // Redirect to home page after logout
  };

  return (
    <div className="min-h-screen pt-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        <h1 className="text-4xl font-extrabold text-blue-900 mb-4 border-b-4 border-blue-600 pb-2">
          Admin Dashboard 🔒
        </h1>
        <p className="text-xl text-gray-700 mb-8">
          Selamat datang, **{user?.email}**! Di sini Anda dapat mengelola konten website.
        </p>

        <div className="space-y-6">
            {/* Management Cards (Placeholder for next steps) */}
            <div className="bg-blue-50 p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-blue-800">1. Edit Home Page Settings</h2>
                <p className="text-gray-600 mt-2">Kelola Visi, Misi, Jadwal, dan Gambar Utama.</p>
            </div>
            <div className="bg-blue-50 p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold text-blue-800">2. Kelola Warta Jemaat</h2>
                <p className="text-gray-600 mt-2">Tambah, edit, atau hapus pengumuman dan berita.</p>
            </div>
        </div>

        <button
          onClick={handleLogout}
          className="mt-10 py-2 px-6 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 transition duration-300"
        >
          Logout
        </button>
        
      </div>
    </div>
  );
}