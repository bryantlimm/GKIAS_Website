// app/laporan/login/page.tsx
'use client';
import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/components/AuthContext';

// ─── Icons ────────────────────────────────────────────────────────────────────

const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);

const KeyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
  </svg>
);

const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const AlertIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

const ClockIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

// ─── Input Field Helper ───────────────────────────────────────────────────────

function InputField({
  icon, type, placeholder, value, onChange, disabled, rightSlot,
}: {
  icon: React.ReactNode;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}>
        {icon}
      </div>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        required
        style={{
          width: '100%',
          padding: rightSlot ? '10px 42px 10px 40px' : '10px 14px 10px 40px',
          border: '1.5px solid #e2e8f0',
          borderRadius: 8,
          fontSize: 14,
          color: '#1e293b',
          background: '#fff',
          fontFamily: 'inherit',
          boxSizing: 'border-box',
          opacity: disabled ? 0.6 : 1,
          outline: 'none',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
        onFocus={e => {
          e.currentTarget.style.borderColor = '#3b5bdb';
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,91,219,0.1)';
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = '#e2e8f0';
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
      {rightSlot && (
        <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
          {rightSlot}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type Mode = 'login' | 'signup';
type SignupStep = 'form' | 'pending' | 'rejected';

export default function LaporanLoginPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [signupStep, setSignupStep] = useState<SignupStep>('form');

  // Shared fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Sign-up only fields
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user, loading } = useAuth();
  const router = useRouter();

  // Auto-redirect if already logged in and has laporan access
  useEffect(() => {
    if (loading || !user) return;
    const check = async () => {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        const data = snap.data();
        if (data.laporanAccess === true) {
          router.push('/laporan/dashboard');
        } else if (data.laporanAccessStatus === 'rejected') {
          setSignupStep('rejected');
          setMode('signup');
        } else if (data.laporanAccessStatus === 'pending') {
          setSignupStep('pending');
          setMode('signup');
        }
      }
    };
    check();
  }, [user, loading, router]);

  const resetFields = () => {
    setEmail('');
    setPassword('');
    setName('');
    setConfirmPassword('');
    setError('');
  };

  // ── SIGN IN ──
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const snap = await getDoc(doc(db, 'users', cred.user.uid));

      if (!snap.exists()) {
        await signOut(auth);
        setError('Akun tidak ditemukan.');
        setIsSubmitting(false);
        return;
      }

      const data = snap.data();

      if (data.laporanAccess === true) {
        router.push('/laporan/dashboard');
        // keep isSubmitting true during redirect
      } else if (data.laporanAccessStatus === 'rejected') {
        await signOut(auth);
        setError('Permintaan akses Anda telah ditolak oleh admin. Hubungi admin gereja untuk informasi lebih lanjut.');
        setIsSubmitting(false);
      } else if (data.laporanAccessStatus === 'pending') {
        await signOut(auth);
        setError('Akun Anda sedang menunggu persetujuan admin. Mohon tunggu sebentar.');
        setIsSubmitting(false);
      } else {
        // Has firebase account but never applied for laporan access
        await signOut(auth);
        setError('Akun ini tidak memiliki akses ke portal laporan ibadah.');
        setIsSubmitting(false);
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Email atau password salah.');
      } else {
        setError('Login gagal. Silakan coba lagi.');
      }
      setIsSubmitting(false);
    }
  };

  // ── SIGN UP ──
  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) { setError('Harap isi nama lengkap.'); return; }
    if (password.length < 6) { setError('Password minimal 6 karakter.'); return; }
    if (password !== confirmPassword) { setError('Password dan konfirmasi password tidak cocok.'); return; }

    setIsSubmitting(true);

    try {
      // Check if email already has a laporan access request
      const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase().trim()));
      const existing = await getDocs(q);
      if (!existing.empty) {
        const existingData = existing.docs[0].data();
        if (existingData.laporanAccessStatus === 'pending') {
          setError('Email ini sudah mendaftar dan sedang menunggu persetujuan admin.');
          setIsSubmitting(false);
          return;
        }
      }

      // Create Firebase Auth account
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;

      // Create user document with pending laporan access
      await setDoc(doc(db, 'users', uid), {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        role: 'regular',
        ministries: [],
        laporanAccess: false,
        laporanAccessStatus: 'pending',
        laporanRequestedAt: Timestamp.now(),
      });

      // Also create a laporan_access_requests document for admin to review
      await setDoc(doc(db, 'laporan_access_requests', uid), {
        userId: uid,
        userName: name.trim(),
        userEmail: email.toLowerCase().trim(),
        status: 'pending',
        createdAt: Timestamp.now(),
      });

      // Sign out — they need admin approval first
      await signOut(auth);
      setSignupStep('pending');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/email-already-in-use') {
        setError('Email ini sudah terdaftar. Silakan masuk atau gunakan email lain.');
      } else if (code === 'auth/invalid-email') {
        setError('Format email tidak valid.');
      } else {
        setError('Pendaftaran gagal. Silakan coba lagi.');
      }
      setIsSubmitting(false);
    }
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f0f4f8' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#3b5bdb', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const isLogin = mode === 'login';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .laporan-card { animation: fadeIn 0.25s ease; }
      `}</style>

      <div style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #eff3ff 0%, #f0f4f8 50%, #e8f4f8 100%)',
        fontFamily: "'Nunito', sans-serif",
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}>
        <div style={{ width: '100%', maxWidth: 440 }}>

          {/* Branding */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              width: 52, height: 52,
              background: '#3b5bdb',
              borderRadius: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 12px',
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1e293b' }}>Portal Laporan Ibadah</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>GKI Bungur Bakal Jemaat Alam Sutera</p>
          </div>

          {/* ── PENDING STATE ── */}
          {mode === 'signup' && signupStep === 'pending' && (
            <div className="laporan-card" style={{
              background: '#fff',
              borderRadius: 16,
              border: '1.5px solid #e8ecf0',
              padding: '36px 28px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
              textAlign: 'center',
            }}>
              <div style={{ color: '#f59e0b', marginBottom: 16 }}><ClockIcon /></div>
              <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#1e293b' }}>Permintaan Terkirim!</h2>
              <p style={{ margin: '0 0 20px', fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
                Pendaftaran akun Anda sudah diterima. Admin gereja akan meninjau permintaan Anda dan memberikan akses dalam waktu dekat.
              </p>
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 16px', marginBottom: 20, textAlign: 'left' }}>
                <p style={{ margin: 0, fontSize: 13, color: '#92400e', fontWeight: 600 }}>Yang perlu Anda lakukan:</p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#b45309', lineHeight: 1.5 }}>
                  Setelah admin menyetujui akun Anda, Anda bisa langsung masuk menggunakan email dan password yang sudah didaftarkan.
                </p>
              </div>
              <button
                onClick={() => { setMode('login'); setSignupStep('form'); resetFields(); }}
                style={{
                  width: '100%', padding: '11px', background: '#3b5bdb', color: '#fff',
                  border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14, fontFamily: 'inherit',
                }}
              >
                Kembali ke Halaman Masuk
              </button>
            </div>
          )}

          {/* ── REJECTED STATE ── */}
          {mode === 'signup' && signupStep === 'rejected' && (
            <div className="laporan-card" style={{
              background: '#fff',
              borderRadius: 16,
              border: '1.5px solid #fecaca',
              padding: '36px 28px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
              textAlign: 'center',
            }}>
              <div style={{ color: '#ef4444', marginBottom: 16 }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/>
                  <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
              </div>
              <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#1e293b' }}>Akses Ditolak</h2>
              <p style={{ margin: '0 0 20px', fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
                Permintaan akses Anda tidak disetujui oleh admin. Silakan hubungi admin gereja secara langsung untuk informasi lebih lanjut.
              </p>
              <button
                onClick={() => { setMode('login'); setSignupStep('form'); resetFields(); }}
                style={{
                  width: '100%', padding: '11px', background: '#f1f5f9', color: '#334155',
                  border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14, fontFamily: 'inherit',
                }}
              >
                Kembali
              </button>
            </div>
          )}

          {/* ── LOGIN / SIGNUP FORM ── */}
          {(mode === 'login' || (mode === 'signup' && signupStep === 'form')) && (
            <div className="laporan-card" style={{
              background: '#fff',
              borderRadius: 16,
              border: '1.5px solid #e8ecf0',
              padding: '32px 28px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            }}>
              {/* Tab switcher */}
              <div style={{
                display: 'flex',
                background: '#f8fafc',
                borderRadius: 10,
                border: '1.5px solid #e8ecf0',
                padding: 4,
                marginBottom: 24,
              }}>
                {(['login', 'signup'] as Mode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setError(''); }}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: 7,
                      border: 'none',
                      cursor: 'pointer',
                      background: mode === m ? '#3b5bdb' : 'transparent',
                      color: mode === m ? '#fff' : '#64748b',
                      fontSize: 13,
                      fontWeight: mode === m ? 700 : 600,
                      fontFamily: 'inherit',
                      transition: 'all 0.15s',
                    }}
                  >
                    {m === 'login' ? 'Masuk' : 'Daftar Akun Baru'}
                  </button>
                ))}
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 9,
                  padding: '11px 14px', borderRadius: 9, marginBottom: 18,
                  background: '#fff5f5', border: '1.5px solid #fecaca',
                  color: '#dc2626', fontSize: 13, fontWeight: 600,
                }}>
                  <span style={{ flexShrink: 0, marginTop: 1 }}><AlertIcon /></span>
                  {error}
                </div>
              )}

              <form onSubmit={isLogin ? handleLogin : handleSignup}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                  {/* Name — sign up only */}
                  {!isLogin && (
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Nama Lengkap
                      </label>
                      <InputField
                        icon={<UserIcon />}
                        type="text"
                        placeholder="Nama Anda"
                        value={name}
                        onChange={setName}
                        disabled={isSubmitting}
                      />
                    </div>
                  )}

                  {/* Email */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Email
                    </label>
                    <InputField
                      icon={<MailIcon />}
                      type="email"
                      placeholder="email@anda.com"
                      value={email}
                      onChange={setEmail}
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Password
                    </label>
                    <InputField
                      icon={<KeyIcon />}
                      type={showPassword ? 'text' : 'password'}
                      placeholder={isLogin ? '••••••••' : 'Minimal 6 karakter'}
                      value={password}
                      onChange={setPassword}
                      disabled={isSubmitting}
                      rightSlot={
                        <button
                          type="button"
                          onClick={() => setShowPassword(v => !v)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', padding: 0 }}
                        >
                          {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                      }
                    />
                  </div>

                  {/* Confirm password — sign up only */}
                  {!isLogin && (
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Konfirmasi Password
                      </label>
                      <InputField
                        icon={<KeyIcon />}
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Ulangi password"
                        value={confirmPassword}
                        onChange={setConfirmPassword}
                        disabled={isSubmitting}
                        rightSlot={
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(v => !v)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', padding: 0 }}
                          >
                            {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                          </button>
                        }
                      />
                    </div>
                  )}

                  {/* Info box for sign up */}
                  {!isLogin && (
                    <div style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      background: '#eff3ff', border: '1px solid #c7d2fe',
                      borderRadius: 8, padding: '10px 12px',
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b5bdb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      <p style={{ margin: 0, fontSize: 12, color: '#3b5bdb', lineHeight: 1.5 }}>
                        Setelah mendaftar, akun Anda perlu disetujui oleh admin gereja sebelum dapat digunakan.
                      </p>
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: isSubmitting ? '#93a3c7' : '#3b5bdb',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      marginTop: 4,
                      transition: 'background 0.15s',
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <div style={{
                          width: 16, height: 16,
                          borderRadius: '50%',
                          border: '2px solid rgba(255,255,255,0.3)',
                          borderTopColor: '#fff',
                          animation: 'spin 0.8s linear infinite',
                          flexShrink: 0,
                        }} />
                        {isLogin ? 'Masuk...' : 'Mendaftar...'}
                      </>
                    ) : isLogin ? 'Masuk →' : 'Daftar & Minta Akses →'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#cbd5e1' }}>
            Hanya untuk petugas ibadah GKI Bungur Bakal Jemaat Alam Sutera
          </p>
        </div>
      </div>
    </>
  );
}