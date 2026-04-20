'use client';

import { useState } from 'react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';

export default function RequestDeletionPage() {
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !reason.trim()) {
      setError('Email dan alasan harus diisi');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Format email tidak valid');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await addDoc(collection(db, 'deletion_requests'), {
        email: email.trim(),
        reason: reason.trim(),
        status: 'pending',
        createdAt: Timestamp.now(),
      });
      
      setEmail('');
      setReason('');
      setSubmitted(true);

      setTimeout(() => {
        setSubmitted(false);
      }, 5000);
    } catch (err) {
      console.error('Error submitting deletion request:', err);
      setError('Gagal mengirim permintaan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block mb-6">
            <h1 className="text-3xl font-bold text-slate-900">GKI Alam Sutera</h1>
          </Link>
          <h2 className="text-xl font-semibold text-slate-700">Permintaan Penghapusan Akun</h2>
          <p className="text-sm text-slate-600 mt-2">
            Kami akan memproses permintaan Anda dalam 7 hari kerja
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 border border-slate-200">
          {submitted ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Permintaan Terkirim</h3>
              <p className="text-sm text-slate-600 mb-4">
                Kami telah menerima permintaan penghapusan akun Anda. Tim kami akan menghubungi Anda melalui email dalam waktu singkat.
              </p>
              <Link href="/" className="inline-block text-sm text-blue-600 hover:text-blue-700 font-semibold">
                Kembali ke beranda
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@contoh.com"
                  className="w-full px-4 py-2.5 border-1.5 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-sm"
                  disabled={loading}
                />
              </div>

              {/* Reason Field */}
              <div>
                <label htmlFor="reason" className="block text-sm font-semibold text-slate-700 mb-2">
                  Alasan Penghapusan <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Jelaskan alasan Anda ingin menghapus akun ini..."
                  rows={4}
                  className="w-full px-4 py-2.5 border-1.5 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-sm resize-none"
                  disabled={loading}
                />
                <p className="text-xs text-slate-500 mt-1.5">
                  Informasi ini akan membantu kami meningkatkan layanan
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Info Box */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5">
                <p className="text-xs text-amber-900 leading-relaxed">
                  <strong>Perhatian:</strong> Penghapusan akun akan menghapus semua data pribadi Anda secara permanen. Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed text-sm"
              >
                {loading ? 'Mengirim...' : 'Kirim Permintaan Penghapusan'}
              </button>

              {/* Cancel Button */}
              <Link href="/">
                <button
                  type="button"
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors text-sm"
                >
                  Batal
                </button>
              </Link>
            </form>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-xs text-slate-600 space-y-2">
          <p>Jika Anda mengubah pikiran, Anda bisa membatalkan permintaan dalam 7 hari ke depan.</p>
          <p>Pertanyaan? Hubungi kami di admin@gkialamutera.or.id</p>
        </div>
      </div>
    </main>
  );
}
