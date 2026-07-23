// app/laporan/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/components/AuthContext';
import ServiceEventsManager from '@/components/admin/ServiceEventsManager';

const LogoutIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

export default function LaporanDashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/laporan/login');
      return;
    }

    const verify = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (!snap.exists() || snap.data().laporanAccess !== true) {
          await signOut(auth);
          router.replace('/laporan/login');
          return;
        }
        setUserName(snap.data().name || user.email || '');
        setChecking(false);
      } catch {
        router.replace('/laporan/login');
      }
    };

    verify();
  }, [user, loading, router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/laporan/login');
  };

  if (loading || checking) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#f0f4f8', fontFamily: "'Nunito', sans-serif",
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            border: '3px solid #e2e8f0', borderTopColor: '#3b5bdb',
            margin: '0 auto 12px', animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ color: '#64748b', fontSize: 14, fontWeight: 600, margin: 0 }}>Memuat...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; font-family: 'Nunito', sans-serif; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: "'Nunito', sans-serif" }}>

        {/* Top header */}
        <header style={{
          background: '#fff',
          borderBottom: '1px solid #e8ecf0',
          padding: '0 20px',
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, background: '#3b5bdb', borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#1e293b' }}>Laporan Ibadah</p>
              <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>GKI Alam Sutera</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{userName}</p>
              <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Keluar"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 12px',
                background: '#fff5f5',
                color: '#ef4444',
                border: '1px solid #fecaca',
                borderRadius: 7,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 700,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#ef4444'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff5f5'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#fecaca'; }}
            >
              <LogoutIcon />
              <span style={{ display: 'none' }} className="logout-label">Keluar</span>
            </button>
          </div>
        </header>

        {/* Main content */}
        <main style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px 48px' }}>
          <div style={{
            background: '#fff',
            borderRadius: 12,
            border: '1px solid #e8ecf0',
            padding: '24px',
          }}>
            <ServiceEventsManager />
          </div>
        </main>
      </div>
    </>
  );
}