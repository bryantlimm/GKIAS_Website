'use client';
import { useState, FormEvent, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/components/AuthContext';

// ─── Icons ────────────────────────────────────────────────────────────────────

const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0110 0v4"/>
  </svg>
);

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

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user, loading } = useAuth();
  const router = useRouter();

  // We use this ref to tell the useEffect to ignore state changes if the user 
  // is currently in the middle of clicking the manual "Masuk" button.
  const isManualLogin = useRef(false);

  // 1. Handle auto-redirect if an existing user visits this page
  useEffect(() => {
    let isMounted = true;

    const verifyExistingUser = async () => {
      // Skip if loading, no user, or if we are handling a manual form submission
      if (loading || !user || isManualLogin.current) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!isMounted) return; // Prevent updating state if component unmounted

        if (userDoc.exists() && userDoc.data()?.role === 'admin') {
          router.push('/admin');
        } else {
          await signOut(auth);
          if (isMounted) setError('Akun Anda tidak memiliki izin akses Admin.');
        }
      } catch (err) {
        console.error('Admin check failed:', err);
        if (!isMounted) return;
        await signOut(auth);
        setError('Gagal memverifikasi hak akses admin.');
      }
    };

    verifyExistingUser();

    // Cleanup function to flag the component as unmounted
    return () => {
      isMounted = false;
    };
  }, [user, loading, router]);

  // 2. Handle manual login form submission
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    isManualLogin.current = true; // Block the useEffect from running concurrently

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      const userDoc = await getDoc(doc(db, 'users', uid));

      if (userDoc.exists() && userDoc.data()?.role === 'admin') {
        router.push('/admin');
        // Note: We don't set isSubmitting(false) here so the button stays in a loading state during redirect
      } else {
        await signOut(auth);
        setError('Akun Anda tidak memiliki izin akses Admin.');
        setIsSubmitting(false);
        isManualLogin.current = false;
      }
    } catch (err) {
      if (typeof err === 'object' && err !== null && 'code' in err) {
        const firebaseError = err as { code: string; message: string };
        if (
          firebaseError.code === 'auth/user-not-found' || 
          firebaseError.code === 'auth/wrong-password' || 
          firebaseError.code === 'auth/invalid-credential'
        ) {
          setError('Email atau password salah. Silakan coba lagi.');
        } else {
          setError(`Login gagal: ${firebaseError.message}`);
        }
      } else {
        setError('Login gagal karena kesalahan tidak terduga.');
      }
      setIsSubmitting(false);
      isManualLogin.current = false;
    }
  };

  // ── Loading / redirect state ──
  // Show spinner if Firebase is loading, OR if there is an existing user and it isn't a manual login
  if (loading || (user && !isManualLogin.current)) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#f0f4f8',
        fontFamily: "'Nunito', sans-serif",
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            border: '3px solid #e2e8f0', borderTopColor: '#3b5bdb',
            margin: '0 auto 16px',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ color: '#64748b', fontSize: 14, fontWeight: 600, margin: 0 }}>
            Mengarahkan ke Dashboard...
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        .login-input { transition: border-color 0.2s, box-shadow 0.2s; }
        .login-input:focus { border-color: #3b5bdb !important; box-shadow: 0 0 0 3px rgba(59,91,219,0.1); outline: none; }
        .login-btn { transition: background 0.15s, transform 0.1s; }
        .login-btn:hover:not(:disabled) { background: #2f4ac7 !important; }
        .login-btn:active:not(:disabled) { transform: scale(0.98); }
        .eye-btn { transition: color 0.15s; }
        .eye-btn:hover { color: #3b5bdb !important; }
      `}</style>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#f0f4f8',
        fontFamily: "'Nunito', sans-serif", padding: '24px 16px',
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>

          {/* Logo / branding */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              width: 56, height: 56, background: '#3b5bdb', borderRadius: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 14px', color: '#fff',
            }}>
              <LockIcon />
            </div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1e293b' }}>Admin Login</h1>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>
              GKI Bungur Bakal Jemaat Alam Sutera
            </p>
          </div>

          {/* Card */}
          <div style={{
            background: '#fff', borderRadius: 16,
            border: '1.5px solid #e8ecf0',
            padding: '32px 28px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}>

            {/* Error message */}
            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '11px 14px', borderRadius: 9, marginBottom: 20,
                background: '#fff5f5', border: '1.5px solid #fecaca',
                color: '#dc2626', fontSize: 13, fontWeight: 600,
              }}>
                <AlertIcon />
                {error}
              </div>
            )}

            <form onSubmit={handleLogin}>

              {/* Email */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Email
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}>
                    <MailIcon />
                  </div>
                  <input
                    type="email" required value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="admin@gkialamsutera.com"
                    className="login-input"
                    style={{
                      width: '100%', padding: '10px 14px 10px 40px',
                      border: '1.5px solid #e2e8f0', borderRadius: 8,
                      fontSize: 14, color: '#1e293b', background: '#fff',
                      fontFamily: 'inherit',
                      opacity: isSubmitting ? 0.6 : 1,
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}>
                    <KeyIcon />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'} required value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="••••••••"
                    className="login-input"
                    style={{
                      width: '100%', padding: '10px 42px 10px 40px',
                      border: '1.5px solid #e2e8f0', borderRadius: 8,
                      fontSize: 14, color: '#1e293b', background: '#fff',
                      fontFamily: 'inherit',
                      opacity: isSubmitting ? 0.6 : 1,
                    }}
                  />
                  <button
                    type="button"
                    className="eye-btn"
                    onClick={() => setShowPassword(v => !v)}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#94a3b8', display: 'flex', alignItems: 'center', padding: 0,
                    }}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="login-btn"
                style={{
                  width: '100%', padding: '12px',
                  background: isSubmitting ? '#93a3c7' : '#3b5bdb',
                  color: '#fff', border: 'none', borderRadius: 8,
                  fontSize: 14, fontWeight: 700, cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {isSubmitting ? (
                  <>
                    <div style={{
                      width: 16, height: 16, borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                      animation: 'spin 0.8s linear infinite', flexShrink: 0,
                    }} />
                    Masuk...
                  </>
                ) : 'Masuk'}
              </button>

            </form>
          </div>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#cbd5e1' }}>
            Hanya untuk admin GKI Bungur Bakal Jemaat Alam Sutera
          </p>
        </div>
      </div>
    </>
  );
}