// components/admin/VolunteerRequestsManager.tsx
// this page is now called "Users Manager" in the front end
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, doc, runTransaction, updateDoc, getDocs } from 'firebase/firestore';
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

interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: 'regular' | 'volunteer' | 'admin';
  ministries: string[];
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

const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const getRoleLabel = (role: string) => {
  switch(role) {
    case 'admin': return 'Admin';
    case 'volunteer': return 'Volunteer';
    case 'regular': return 'Regular';
    default: return role;
  }
};

const getRoleColor = (role: string) => {
  switch(role) {
    case 'admin': return { bg: '#fef3c7', color: '#d97706' };
    case 'volunteer': return { bg: '#dbeafe', color: '#0284c7' };
    case 'regular': return { bg: '#f3f4f6', color: '#6b7280' };
    default: return { bg: '#f3f4f6', color: '#6b7280' };
  }
};

export default function VolunteerRequestsManager() {
  const [tab, setTab] = useState<'requests' | 'users'>('requests');
  const [requests, setRequests] = useState<VolunteerRequest[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  // Fetch volunteer requests
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

  // Fetch all users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usSnap = await getDocs(collection(db, 'users'));
        const us: UserAccount[] = usSnap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name ?? 'Tanpa Nama',
            email: data.email ?? '',
            role: data.role ?? 'regular',
            ministries: data.ministries ?? [],
          };
        }).sort((a, b) => a.name.localeCompare(b.name, 'id'));
        setUsers(us);
      } catch (e) {
        console.error('Error fetching users:', e);
      }
    };
    fetchUsers();
  }, []);

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    const term = searchTerm.toLowerCase();
    return users.filter(u => u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term));
  }, [users, searchTerm]);

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

  if (loading && tab === 'requests') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#94a3b8', padding: '24px 0' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M21 12a9 9 0 11-6.219-8.56"/>
        </svg>
        Memuat permintaan...
      </div>
    );
  }

  return (
    <div>
      {/* Tab Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 4, background: '#ffffff', borderRadius: 10, border: '1.5px solid #e8ecf0', padding: 5, width: 'fit-content' }}>
          {(['requests', 'users'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '7px 20px', borderRadius: 7, border: 'none', cursor: 'pointer',
              background: tab === t ? '#3b5bdb' : 'transparent',
              color: tab === t ? '#fff' : '#64748b',
              fontSize: 13, fontWeight: tab === t ? 700 : 600, fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}>
              {t === 'requests' ? 'Volunteer Requests' : 'List Users'}
              <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700,
                background: tab === t ? 'rgba(255,255,255,0.2)' : '#f8fafc',
                color: tab === t ? '#fff' : '#94a3b8', borderRadius: 10, padding: '1px 7px' }}>
                {t === 'requests' ? requests.length : users.length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Volunteer Requests Tab */}
      {tab === 'requests' && (
        <div>
          {requests.length === 0 ? (
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
          ) : (
            <>
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
            </>
          )}
        </div>
      )}

      {/* List Users Tab */}
      {tab === 'users' && (
        <div>
          {/* Search bar */}
          <div style={{ marginBottom: 20 }}>
            <input
              type="text"
              placeholder="Cari pengguna berdasarkan nama atau email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: 13,
                border: '1.5px solid #e8ecf0',
                borderRadius: 8,
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = '#c7d2fe')}
              onBlur={e => (e.currentTarget.style.borderColor = '#e8ecf0')}
            />
          </div>

          {filteredUsers.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '48px 24px', gap: 12, color: '#94a3b8',
            }}>
              <div style={{ fontSize: 32 }}>👤</div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#64748b' }}>Tidak ada pengguna ditemukan</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredUsers.map(user => {
                const isExpanded = expandedUserId === user.id;
                const roleColors = getRoleColor(user.role);
                const colors = ['#3b5bdb', '#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
                const colorIndex = user.name.charCodeAt(0) % colors.length;
                const avatarColor = colors[colorIndex];
                const initials = user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();

                return (
                  <div key={user.id}>
                    {/* User Row */}
                    <div
                      onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 14px',
                        border: '1.5px solid #e8ecf0',
                        borderRadius: 8,
                        background: '#fff',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = '#c7d2fe';
                        e.currentTarget.style.background = '#f8fafc';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = '#e8ecf0';
                        e.currentTarget.style.background = '#fff';
                      }}
                    >
                      {/* Avatar */}
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                        background: avatarColor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 12, fontWeight: 800,
                      }}>
                        {initials}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                          {user.name}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>
                          {user.email}
                        </p>
                      </div>

                      {/* Role badge */}
                      <div style={{
                        flexShrink: 0,
                        background: roleColors.bg,
                        color: roleColors.color,
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '4px 10px',
                        borderRadius: 6,
                        textTransform: 'uppercase',
                        letterSpacing: '0.4px',
                      }}>
                        {getRoleLabel(user.role)}
                      </div>

                      {/* Chevron */}
                      <div style={{
                        flexShrink: 0,
                        color: '#94a3b8',
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.15s',
                      }}>
                        <ChevronDownIcon />
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div style={{
                        padding: '12px 14px',
                        background: '#f8fafc',
                        borderLeft: '1.5px solid #e8ecf0',
                        borderRight: '1.5px solid #e8ecf0',
                        borderBottom: '1.5px solid #e8ecf0',
                        borderBottomLeftRadius: 8,
                        borderBottomRightRadius: 8,
                        marginTop: -8,
                        paddingTop: 12,
                      }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          {/* Name */}
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>
                              Nama
                            </label>
                            <p style={{ margin: 0, fontSize: 12, color: '#1e293b', fontWeight: 500 }}>
                              {user.name}
                            </p>
                          </div>

                          {/* Email */}
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>
                              Email
                            </label>
                            <p style={{ margin: 0, fontSize: 12, color: '#1e293b', fontWeight: 500 }}>
                              {user.email}
                            </p>
                          </div>

                          {/* Account Type */}
                          <div>
                            <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>
                              Tipe Akun
                            </label>
                            <div style={{
                              display: 'inline-block',
                              background: roleColors.bg,
                              color: roleColors.color,
                              fontSize: 12,
                              fontWeight: 600,
                              padding: '4px 10px',
                              borderRadius: 6,
                            }}>
                              {getRoleLabel(user.role)}
                            </div>
                          </div>
                        </div>

                        {/* Ministries (for volunteers) */}
                        {user.role === 'volunteer' && user.ministries.length > 0 && (
                          <div style={{ marginTop: 12 }}>
                            <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                              Pelayanan
                            </label>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {user.ministries.map(ministry => (
                                <div
                                  key={ministry}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: 5,
                                    background: '#f1f5f9', color: '#475569',
                                    fontSize: 11, fontWeight: 600,
                                    padding: '4px 8px', borderRadius: 5,
                                  }}
                                >
                                  <MinistryIcon />
                                  {ministry}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {user.role === 'volunteer' && user.ministries.length === 0 && (
                          <div style={{ marginTop: 12 }}>
                            <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 4 }}>
                              Pelayanan
                            </label>
                            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                              Tidak ada pelayanan yang ditugaskan
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <style>{`
        @media (min-width: 640px) {
          .volunteer-date { display: block !important; }
        }
      `}</style>
    </div>
  );
}
