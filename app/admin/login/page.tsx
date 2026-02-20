// app/admin/login/page.tsx
'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// tambah signOut IZINN
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
// import { signInWithEmailAndPassword } from 'firebase/auth';

// tambah docs getDoc sama db juga
import { doc, getDoc } from 'firebase/firestore'; 
import { auth, db } from '@/lib/firebase'; 
// import { auth } from '@/lib/firebase';
import { useAuth } from '@/components/AuthContext';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { user, loading } = useAuth();
  const router = useRouter();

  // cek admin bukan
  const checkAdminRole = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      
      // Check if document exists AND has role === 'admin'
      if (userDoc.exists() && userDoc.data()?.role === 'admin') {
        router.push('/admin');
      } else {
        // Fail: Regular user trying to login to admin
        setError('Akun Anda tidak memiliki izin akses Admin.');
        await signOut(auth); // Force logout immediately
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error("Admin check failed:", err);
      setError('Gagal memverifikasi hak akses admin.');
      await signOut(auth);
      setIsSubmitting(false);
    }
  };

  // If the user is already logged in, redirect them immediately
  // pake helper function
  useEffect(() => {
    if (!loading && user) {
      // Instead of blindly redirecting, we check the role first
      checkAdminRole(user.uid);
    }
  }, [user, loading, router]);
  // useEffect(() => {
  //   if (!loading && user) {
  //     router.push('/admin'); 
  //   }
  // }, [user, loading, router]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // 1. Authenticate with Email/Password
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // 2. Check Role immediately after login
      // (The useEffect will also catch this, but calling it here makes the UI snappier)
      await checkAdminRole(userCredential.user.uid);

    } catch (err) { // <-- Remove the ': any' annotation
      if (typeof err === 'object' && err !== null && 'code' in err) {
        const firebaseError = err as { code: string, message: string };

        if (firebaseError.code === 'auth/user-not-found' || firebaseError.code === 'auth/wrong-password') {
          setError('Email atau password salah. Silakan coba lagi.');
        } else {
          setError(`Login gagal: ${firebaseError.message}`);
        }
      } else {
        setError('Login gagal karena kesalahan tidak terduga.');
      }
      setIsSubmitting(false);
    }
  };

  // Show nothing or a loader while checking login status
  if (loading || user) {
    return (
      <div className="flex items-center justify-center min-h-screen pt-20">
        <p className="text-xl text-blue-600">Mengarahkan ke Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen pt-16 bg-gray-100">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-xl border-t-4 border-blue-600">
        <h2 className="text-3xl font-bold text-center text-blue-900 mb-6">Admin Login</h2>
        <p className="text-center text-gray-600 mb-6">GKI Alam Sutera Content Management</p>
        
        <form onSubmit={handleLogin} className="space-y-6">
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              disabled={isSubmitting}
            />
          </div>
          
          {error && (
            <p className="text-red-600 text-sm font-medium bg-red-50 p-3 rounded-lg border border-red-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-300 disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Loading...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}