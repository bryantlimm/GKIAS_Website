// components/admin/VolunteerRequestsManager.tsx
'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, runTransaction, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface VolunteerRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  ministry: string;
  status: string;
  createdAt: any;
}

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const MinistryIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87"/>
    <path d="M16 3.13a4 4 0 010 7.75"/>
  </svg>
);

export default function VolunteerRequestsManager() {
  const [requests, setRequests] = useState<VolunteerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'volunteer_requests'),
      where('status', '==', 'pending')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as VolunteerRequest[];
      data.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
      setRequests(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleApprove = async (request: VolunteerRequest) => {
    if (!confirm(`Terima ${request.userName} untuk pelayanan ${request.ministry}?`)) return;
    setProcessingId(request.id);
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', request.userId);
        const requestRef = doc(db, 'volunteer_requests', request.id);
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error('User document not found!');
        const userData = userDoc.data();
        const newRole = userData.role === 'regular' ? 'volunteer' : userData.role;
        const currentMinistries = userData.ministries || [];
        if (!currentMinistries.includes(request.ministry)) currentMinistries.push(request.ministry);
        transaction.update(userRef, { role: newRole, ministries: currentMinistries });
        transaction.update(requestRef, { status: 'approved' });
      });
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Gagal menerima permintaan. Silakan coba lagi.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (request: VolunteerRequest) => {
    if (!confirm(`Tolak permintaan ${request.userName}?`)) return;
    setProcessingId(request.id);
    try {
      await updateDoc(doc(db, 'volunteer_requests', request.id), { status: 'rejected' });
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Gagal menolak permintaan.');
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (ts: any) => {
    if (!ts) return '—';
    return ts.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#94a3b8', padding: '24px 0' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M21 12a9 9 0 11-6.219-8.56"/>
        </svg>
        Memuat permintaan...
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '48px 24px', gap: 12, color: '#94a3b8',
      }}>
        <div style={{ width: 48, height: 48, background: '#f1f5f9', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MinistryIcon />
        </div>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#64748b' }}>Tidak ada permintaan tertunda</p>
        <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>Semua permintaan pelayanan sudah ditangani</p>
      </div>
    );
  }

  return (
    <div>
      {/* Count badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <span style={{
          background: '#eff3ff', color: '#3b5bdb',
          fontSize: 12, fontWeight: 700,
          padding: '3px 10px', borderRadius: 20,
        }}>
          {requests.length} permintaan menunggu
        </span>
      </div>

      {/* Cards list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {requests.map((req) => {
          const isProcessing = processingId === req.id;
          // Generate initials avatar color from name
          const colors = ['#3b5bdb', '#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
          const colorIndex = req.userName.charCodeAt(0) % colors.length;
          const avatarColor = colors[colorIndex];
          const initials = req.userName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();

          return (
            <div
              key={req.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '16px 18px',
                border: '1.5px solid #e8ecf0',
                borderRadius: 10,
                background: '#fff',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#c7d2fe')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#e8ecf0')}
            >
              {/* Avatar */}
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: avatarColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 13, fontWeight: 800,
              }}>
                {initials}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {req.userName}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {req.userEmail}
                </p>
              </div>

              {/* Ministry badge */}
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, background: '#f1f5f9', borderRadius: 6, padding: '5px 10px' }}>
                <span style={{ color: '#64748b' }}><MinistryIcon /></span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>{req.ministry}</span>
              </div>

              {/* Date */}
              <p style={{ flexShrink: 0, margin: 0, fontSize: 12, color: '#94a3b8', minWidth: 80, textAlign: 'right', display: 'none' }} className="volunteer-date">
                {formatDate(req.createdAt)}
              </p>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                  onClick={() => handleApprove(req)}
                  disabled={isProcessing}
                  title="Terima"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '7px 14px',
                    background: isProcessing ? '#f1f5f9' : '#f0fdf4',
                    color: isProcessing ? '#94a3b8' : '#16a34a',
                    border: '1.5px solid',
                    borderColor: isProcessing ? '#e2e8f0' : '#bbf7d0',
                    borderRadius: 7,
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    fontSize: 12, fontWeight: 700,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!isProcessing) { e.currentTarget.style.background = '#16a34a'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#16a34a'; }}}
                  onMouseLeave={e => { if (!isProcessing) { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.color = '#16a34a'; e.currentTarget.style.borderColor = '#bbf7d0'; }}}
                >
                  <CheckIcon />
                  Terima
                </button>
                <button
                  onClick={() => handleReject(req)}
                  disabled={isProcessing}
                  title="Tolak"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '7px 14px',
                    background: isProcessing ? '#f1f5f9' : '#fff5f5',
                    color: isProcessing ? '#94a3b8' : '#dc2626',
                    border: '1.5px solid',
                    borderColor: isProcessing ? '#e2e8f0' : '#fecaca',
                    borderRadius: 7,
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    fontSize: 12, fontWeight: 700,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!isProcessing) { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#dc2626'; }}}
                  onMouseLeave={e => { if (!isProcessing) { e.currentTarget.style.background = '#fff5f5'; e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#fecaca'; }}}
                >
                  <XIcon />
                  Tolak
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @media (min-width: 640px) {
          .volunteer-date { display: block !important; }
        }
      `}</style>
    </div>
  );
}
