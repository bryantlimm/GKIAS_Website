// components/admin/AdminDashboardContent.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/components/AuthContext';
import { useRouter } from 'next/navigation';
import SettingsEditor from './SettingsEditor';
import SchedulesEditor from './SchedulesEditor';
import NewsManager from './NewsManager';
import PhotoSectionEditor from './PhotoSectionEditor';
import LfjEditor from './LfjEditor';
import VideoSectionEditor from './VideoSectionEditor';
import VolunteerRequestsManager from './VolunteerRequestsManager';
import AdminHomePage from './AdminHomePage';
import AdminEventsPage from './AdminEventsPage';

// ─── Icons ────────────────────────────────────────────────────────────────────

const HomeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
    <path d="M9 21V12h6v9"/>
  </svg>
);

const GridIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/>
    <rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
);

const NewsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <path d="M7 8h10M7 12h10M7 16h6"/>
  </svg>
);

const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 01-3.46 0"/>
  </svg>
);

const LogoutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
  </svg>
);

const YoutubeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 001.46 6.42 29 29 0 001 12a29 29 0 00.46 5.58 2.78 2.78 0 001.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.96A29 29 0 0023 12a29 29 0 00-.46-5.58z"/>
    <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/>
  </svg>
);

const CalendarIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const PhotoIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
);

const BookIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/>
    <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
  </svg>
);

const CalendarEvIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const PeopleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87"/>
    <path d="M16 3.13a4 4 0 010 7.75"/>
  </svg>
);

// ─── Types ────────────────────────────────────────────────────────────────────

type MainMenu = 'home' | 'halaman-utama' | 'warta' | 'volunteer' | 'events';
type HalamanTab = 'settings' | 'video' | 'schedules' | 'gallery' | 'lfj';

interface HalamanTabConfig {
  id: HalamanTab;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const halamanTabs: HalamanTabConfig[] = [
  { id: 'settings',  label: 'Pengaturan Halaman',   icon: <SettingsIcon />, description: 'Hero, visi misi, & gereja induk' },
  { id: 'video',     label: 'Kelola Video YouTube', icon: <YoutubeIcon />,  description: 'Video ibadah & konten YouTube' },
  { id: 'schedules', label: 'Jadwal Kebaktian',     icon: <CalendarIcon />, description: 'Atur jadwal & waktu kebaktian' },
  { id: 'gallery',   label: 'Galeri Foto',          icon: <PhotoIcon />,    description: 'Upload & kelola foto galeri' },
  { id: 'lfj',       label: 'Kelola LFJ',           icon: <BookIcon />,     description: 'Lembar jemaat & konten LFJ' },
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminDashboardContent() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [activeMenu, setActiveMenu] = useState<MainMenu>('home');
  const [activeTab, setActiveTab] = useState<HalamanTab>('settings');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleMenuSelect = (id: MainMenu) => {
    setActiveMenu(id);
    setMobileMenuOpen(false);
  };

  const mainNavItems: { id: MainMenu; label: string; icon: React.ReactNode }[] = [
    { id: 'home',          label: 'Home',               icon: <HomeIcon /> },
    { id: 'halaman-utama', label: 'Halaman Utama',      icon: <GridIcon /> },
    { id: 'warta',         label: 'Warta',              icon: <NewsIcon /> },
    { id: 'volunteer',     label: 'Users Manager', icon: <PeopleIcon /> },
    { id: 'events',        label: 'Events',              icon: <CalendarEvIcon /> },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap');
        .admin-root * { box-sizing: border-box; font-family: 'Nunito', sans-serif; }
        .admin-root ::-webkit-scrollbar { width: 5px; height: 5px; }
        .admin-root ::-webkit-scrollbar-track { background: #f1f5f9; }
        .admin-root ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        .nav-btn { transition: background 0.15s, color 0.15s; }
        .nav-btn:hover { background: #f1f5f9 !important; }
        .nav-btn.active:hover { background: #3b5bdb !important; }
        .tab-btn { transition: background 0.15s, color 0.15s; }
        .tab-btn:hover { background: #f1f5f9 !important; }
        .tab-btn.active:hover { background: #2f4ac7 !important; }
        .icon-btn { transition: background 0.15s; border-radius: 8px; padding: 8px; }
        .icon-btn:hover { background: #f1f5f9; }

        /* ── Desktop sidebar ── */
        .admin-sidebar {
          width: 230px;
          min-width: 230px;
          background: #ffffff;
          border-right: 1px solid #e8ecf0;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
        }

        /* ── Hamburger button: hidden on desktop ── */
        .admin-hamburger { display: none; }

        /* ── Mobile drawer overlay ── */
        .admin-drawer-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.4);
          z-index: 200;
        }
        .admin-drawer-overlay.open { display: block; }

        /* ── Mobile drawer panel ── */
        .admin-drawer {
          position: fixed;
          top: 0; left: 0; bottom: 0;
          width: 240px;
          background: #ffffff;
          z-index: 201;
          display: flex;
          flex-direction: column;
          transform: translateX(-100%);
          transition: transform 0.25s ease;
          box-shadow: 4px 0 24px rgba(0,0,0,0.12);
        }
        .admin-drawer.open { transform: translateX(0); }

        /* ── Content padding ── */
        .admin-page-content {
          flex: 1;
          overflow: auto;
          padding: 28px 28px 40px;
        }

        /* ── Card ── */
        .admin-card {
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #e8ecf0;
          padding: 28px;
        }

        .admin-header-email { display: block; }

        @media (max-width: 768px) {
          .admin-sidebar { display: none !important; }
          .admin-hamburger { display: flex !important; }
          .admin-page-content { padding: 16px 16px 32px; }
          .admin-card { padding: 18px 16px; }
          .admin-header-email { display: none; }
          .admin-header {
            padding: 0 16px !important;
            height: 56px !important;
          }
        }
      `}</style>

      <div className="admin-root" style={{
        display: 'flex',
        height: '100vh',
        background: '#f0f4f8',
        overflow: 'hidden',
      }}>

        {/* ── Desktop Sidebar ── */}
        <aside className="admin-sidebar">
          {/* Logo */}
          <div style={{ padding: '22px 20px', borderBottom: '1px solid #f1f5f9' }}>
            <img src="/gkias_blue.png" alt="GKI Alam Sutera" style={{ maxHeight: '25px', width: 'auto' }} />
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: '14px 10px', overflowY: 'auto' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 8px 8px', margin: 0 }}>Menu</p>
            {mainNavItems.map(item => {
              const isActive = activeMenu === item.id;
              return (
                <button
                  key={item.id}
                  className={`nav-btn${isActive ? ' active' : ''}`}
                  onClick={() => setActiveMenu(item.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: 'none',
                    background: isActive ? '#3b5bdb' : 'transparent',
                    color: isActive ? '#ffffff' : '#64748b',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: isActive ? 700 : 600,
                    textAlign: 'left',
                    marginBottom: 3,
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ── Main area ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Top header */}
          <header className="admin-header" style={{
            background: '#ffffff',
            borderBottom: '1px solid #e8ecf0',
            padding: '0 28px',
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Hamburger — mobile only */}
              <button
                className="admin-hamburger icon-btn"
                onClick={() => setMobileMenuOpen(true)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#334155', display: 'none', alignItems: 'center', padding: 6 }}
              >
                ☰
              </button>
              <div>
                <p className="admin-header-email" style={{ margin: 0, fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>Login sebagai</p>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{user?.email}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button className="icon-btn" onClick={handleLogout} title="Logout" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}>
                <LogoutIcon />
              </button>
              <button className="icon-btn" title="Notifikasi" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}>
                <BellIcon />
              </button>
              <div style={{
                width: 34, height: 34,
                background: '#eff3ff',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#3b5bdb', cursor: 'pointer', marginLeft: 4,
              }}>
                <UserIcon />
              </div>
            </div>
          </header>

          {/* Page content */}
          <div className="admin-page-content">

            {/* ── HOME ── */}
            {activeMenu === 'home' && (
              <AdminHomePage />
            )}

            {/* ── WARTA ── */}
            {activeMenu === 'warta' && (
              <>
                {/* <div style={{ marginBottom: 20 }}>
                  <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1e293b' }}>Warta Jemaat & Berita</h1>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>Kelola warta jemaat dan berita gereja</p>
                </div> */}
                <div className="admin-card">
                  <NewsManager />
                </div>
              </>
            )}

            {/* ── EVENTS ── */}
            {activeMenu === 'events' && (
              <AdminEventsPage />
            )}

            {/* ── VOLUNTEER ── */}
            {activeMenu === 'volunteer' && (
              <>
                {/* <div style={{ marginBottom: 20 }}>
                  <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1e293b' }}>Permintaan Pelayanan</h1>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>Kelola permintaan pelayanan jemaat</p>
                </div> */}
                <div className="admin-card">
                  <VolunteerRequestsManager />
                </div>
              </>
            )}

            {/* ── HALAMAN UTAMA ── */}
            {activeMenu === 'halaman-utama' && (
              <div>
                {/* <div style={{ marginBottom: 16 }}>
                  <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1e293b' }}>Halaman Utama</h1>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>Kelola konten halaman utama website</p>
                </div> */}

                {/* Horizontal scrollable tab bar */}
                <div style={{
                  display: 'flex',
                  gap: 2,
                  background: '#ffffff',
                  borderRadius: 12,
                  border: '1px solid #e8ecf0',
                  padding: '6px',
                  marginBottom: 20,
                  overflowX: 'auto',
                  flexWrap: 'nowrap',
                  WebkitOverflowScrolling: 'touch',
                  scrollbarWidth: 'none',
                }}>
                  {halamanTabs.map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        className={`tab-btn${isActive ? ' active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 7,
                          padding: '8px 14px',
                          borderRadius: 8,
                          border: 'none',
                          background: isActive ? '#3b5bdb' : 'transparent',
                          color: isActive ? '#ffffff' : '#64748b',
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: isActive ? 700 : 600,
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          transition: 'background 0.15s, color 0.15s',
                        }}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Content panel */}
                <div className="admin-card">
                  {activeTab === 'settings'  && <SettingsEditor />}
                  {activeTab === 'video'     && <VideoSectionEditor />}
                  {activeTab === 'schedules' && <SchedulesEditor />}
                  {activeTab === 'gallery'   && <PhotoSectionEditor />}
                  {activeTab === 'lfj'       && <LfjEditor />}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* ── Mobile drawer overlay (tap to close) ── */}
        <div
          className={`admin-drawer-overlay${mobileMenuOpen ? ' open' : ''}`}
          onClick={() => setMobileMenuOpen(false)}
        />

        {/* ── Mobile drawer panel ── */}
        <div className={`admin-drawer${mobileMenuOpen ? ' open' : ''}`}>
          {/* Drawer header */}
          <div style={{ padding: '18px 16px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 38, height: 38,
                background: '#eff3ff', borderRadius: 9,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#3b5bdb', fontWeight: 800, fontSize: 11, flexShrink: 0,
              }}>GKI</div>
              <div style={{ lineHeight: 1.3 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: '#1e293b', textTransform: 'uppercase' }}>GKI Bungur</p>
                <p style={{ margin: 0, fontSize: 10, color: '#94a3b8' }}>Alam Sutera</p>
              </div>
            </div>
            {/* Close button */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4, display: 'flex', alignItems: 'center' }}
            >
              ✕
            </button>
          </div>

          {/* Drawer nav items */}
          <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 8px 8px', margin: 0 }}>Menu</p>
            {mainNavItems.map(item => {
              const isActive = activeMenu === item.id;
              return (
                <button
                  key={item.id}
                  className={`nav-btn${isActive ? ' active' : ''}`}
                  onClick={() => handleMenuSelect(item.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '11px 12px',
                    borderRadius: 8,
                    border: 'none',
                    background: isActive ? '#3b5bdb' : 'transparent',
                    color: isActive ? '#ffffff' : '#64748b',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: isActive ? 700 : 600,
                    textAlign: 'left',
                    marginBottom: 3,
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

      </div>
    </>
  );
}
