// components/admin/VolunteerRequestsManager.tsx
'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, runTransaction, updateDoc, orderBy } from 'firebase/firestore';
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

export default function VolunteerRequestsManager() {
  const [requests, setRequests] = useState<VolunteerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Fetch pending requests
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
      
      // Sort manually on the client to avoid needing a composite index immediately
      data.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
      
      setRequests(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Handle Approve Request
  const handleApprove = async (request: VolunteerRequest) => {
    if (!confirm(`Terima ${request.userName} untuk pelayanan ${request.ministry}?`)) return;
    setProcessingId(request.id);

    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', request.userId);
        const requestRef = doc(db, 'volunteer_requests', request.id);

        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
          throw new Error("User document not found!");
        }

        const userData = userDoc.data();
        
        // 1. Determine new role (Upgrade from regular to volunteer)
        const newRole = userData.role === 'regular' ? 'volunteer' : userData.role;

        // 2. Safely add to ministries array
        const currentMinistries = userData.ministries || [];
        if (!currentMinistries.includes(request.ministry)) {
          currentMinistries.push(request.ministry);
        }

        // 3. Update both documents
        transaction.update(userRef, {
          role: newRole,
          ministries: currentMinistries,
        });
        transaction.update(requestRef, { status: 'approved' });
      });

      alert('Permintaan berhasil diterima!');
    } catch (error) {
      console.error("Error approving request:", error);
      alert('Gagal menerima permintaan. Silakan coba lagi.');
    } finally {
      setProcessingId(null);
    }
  };

  // Handle Reject Request
  const handleReject = async (request: VolunteerRequest) => {
    if (!confirm(`Tolak permintaan ${request.userName}?`)) return;
    setProcessingId(request.id);

    try {
      const requestRef = doc(db, 'volunteer_requests', request.id);
      await updateDoc(requestRef, { status: 'rejected' });
      alert('Permintaan berhasil ditolak.');
    } catch (error) {
      console.error("Error rejecting request:", error);
      alert('Gagal menolak permintaan.');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return <p className="text-gray-500">Memuat permintaan...</p>;

  return (
    <div>
      {requests.length === 0 ? (
        <p className="text-gray-500 italic">Tidak ada permintaan pelayanan yang tertunda.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 border-b">Nama</th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 border-b">Email</th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700 border-b">Pelayanan</th>
                <th className="py-3 px-4 text-center text-sm font-semibold text-gray-700 border-b">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 border-b text-sm font-medium text-gray-900">{req.userName}</td>
                  <td className="py-3 px-4 border-b text-sm text-gray-600">{req.userEmail}</td>
                  <td className="py-3 px-4 border-b text-sm text-blue-600 font-medium">{req.ministry}</td>
                  <td className="py-3 px-4 border-b text-center space-x-2">
                    <button
                      onClick={() => handleApprove(req)}
                      disabled={processingId === req.id}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm disabled:opacity-50 transition"
                    >
                      {processingId === req.id ? 'Loading...' : 'Terima'}
                    </button>
                    <button
                      onClick={() => handleReject(req)}
                      disabled={processingId === req.id}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm disabled:opacity-50 transition"
                    >
                      {processingId === req.id ? 'Loading...' : 'Tolak'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}