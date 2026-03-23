// components/admin/AdminHomePage.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import {
  collection, query, where, getDocs, onSnapshot,
  deleteDoc, doc, Timestamp,
} from 'firebase/firestore';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ServiceEvent {
  id: string;
  ministry: string;
  date: Date;
  offering_amount?: number;
  offering_notes?: string;
  attendance_count?: number;
  attendance_notes?: string;
  is_finished?: boolean;
  description?: string;
}

interface RegistrationEvent {
  id: string;
  title: string;
  date: Date;
  type: 'registration';
  capacity: number;
  currentRegistrants: number;
  description?: string;
  registrationDeadline?: Date;
  is_finished?: boolean;
}

interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: string;
  ministries?: string[];
  createdAt?: Date;
}

// ─── Colour palette (matches dashboard) ──────────────────────────────────────
const C = {
  primary:  '#3b5bdb',
  primaryDark: '#2f4ac7',
  primaryBg: '#eff3ff',
  primaryBorder: '#c7d2fe',
  bg:       '#f0f4f8',
  card:     '#ffffff',
  border:   '#e8ecf0',
  text:     '#1e293b',
  sub:      '#64748b',
  muted:    '#94a3b8',
  success:  '#16a34a',
  successBg:'#f0fdf4',
  successBorder:'#bbf7d0',
  warn:     '#d97706',
  warnBg:   '#fffbeb',
  warnBorder: '#fde68a',
  error:    '#dc2626',
  errorBg:  '#fff5f5',
  errorBorder:'#fecaca',
};

// ─── Small reusable primitives ────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
      {children}
    </p>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: C.text, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {children}
      </p>
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C.card, borderRadius: 12, border: `1.5px solid ${C.border}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: 20,
      ...style,
    }}>
      {children}
    </div>
  );
}

function SelectPill({
  value, options, onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        fontSize: 12, fontWeight: 600, color: C.primary,
        background: C.primaryBg, border: `1.5px solid ${C.primaryBorder}`,
        borderRadius: 20, padding: '3px 10px', cursor: 'pointer', outline: 'none',
        fontFamily: 'inherit',
      }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function DateRangePicker({
  from, to, onFromChange, onToChange,
}: {
  from: string; to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
}) {
  const inputStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: C.primary,
    background: C.primaryBg, border: `1.5px solid ${C.primaryBorder}`,
    borderRadius: 8, padding: '3px 8px', cursor: 'pointer', outline: 'none',
    fontFamily: 'inherit',
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <input type="date" value={from} onChange={e => onFromChange(e.target.value)} style={inputStyle} />
      <span style={{ fontSize: 11, color: C.muted }}>–</span>
      <input type="date" value={to} onChange={e => onToChange(e.target.value)} style={inputStyle} />
    </div>
  );
}

function RoleTag({ role }: { role: string }) {
  const map: Record<string, { label: string; color: string; bg: string; border: string }> = {
    admin:    { label: 'Admin',   color: C.error,   bg: C.errorBg,   border: C.errorBorder },
    volunteer:{ label: 'Pelayan', color: C.success,  bg: C.successBg, border: C.successBorder },
    regular:  { label: 'Jemaat',  color: C.sub,      bg: '#f1f5f9',   border: C.border },
  };
  const s = map[role] ?? map.regular;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, color: s.color,
      background: s.bg, border: `1.5px solid ${s.border}`,
      borderRadius: 20, padding: '3px 10px',
    }}>
      {s.label}
    </span>
  );
}

// ─── Mini Line Chart (pure SVG, no deps) ─────────────────────────────────────

function LineChart({
  data, width = 600, height = 220,
}: {
  data: { date: string; value: number }[];
  width?: number;
  height?: number;
}) {
  if (data.length === 0) return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 13 }}>
      Belum ada data
    </div>
  );

  const PAD = { top: 20, right: 20, bottom: 48, left: 52 };
  const W = width - PAD.left - PAD.right;
  const H = height - PAD.top - PAD.bottom;

  const maxVal = Math.max(...data.map(d => d.value), 1);
  const minVal = 0;

  const xScale = (i: number) => (i / (data.length - 1 || 1)) * W;
  const yScale = (v: number) => H - ((v - minVal) / (maxVal - minVal || 1)) * H;

  const points = data.map((d, i) => `${xScale(i)},${yScale(d.value)}`).join(' ');
  const areaPoints = `0,${H} ` + data.map((d, i) => `${xScale(i)},${yScale(d.value)}`).join(' ') + ` ${xScale(data.length - 1)},${H}`;

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => Math.round(minVal + t * (maxVal - minVal)));

  // X-axis: show up to 12 labels evenly spaced
  const xTickEvery = Math.ceil(data.length / 12);
  const xTicks = data.filter((_, i) => i % xTickEvery === 0 || i === data.length - 1);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.primary} stopOpacity="0.18" />
          <stop offset="100%" stopColor={C.primary} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <g transform={`translate(${PAD.left},${PAD.top})`}>
        {/* Grid lines */}
        {yTicks.map(t => (
          <g key={t}>
            <line x1={0} y1={yScale(t)} x2={W} y2={yScale(t)}
              stroke={C.border} strokeWidth={1} strokeDasharray="4 4" />
            <text x={-8} y={yScale(t) + 4} textAnchor="end"
              fontSize={10} fill={C.muted} fontFamily="Nunito, sans-serif">
              {t.toLocaleString('id-ID')}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <polygon points={areaPoints} fill="url(#chartGrad)" />

        {/* Line */}
        <polyline points={points} fill="none" stroke={C.primary} strokeWidth={2.5}
          strokeLinejoin="round" strokeLinecap="round" />

        {/* Data dots */}
        {data.map((d, i) => (
          <circle key={i} cx={xScale(i)} cy={yScale(d.value)} r={3}
            fill={C.card} stroke={C.primary} strokeWidth={2} />
        ))}

        {/* X-axis labels */}
        {xTicks.map((d, i) => {
          const origI = data.indexOf(d);
          return (
            <text key={i} x={xScale(origI)} y={H + 18} textAnchor="middle"
              fontSize={10} fill={C.muted} fontFamily="Nunito, sans-serif">
              {d.date}
            </text>
          );
        })}
      </g>
    </svg>
  );
}

// ─── Main AdminHomePage ───────────────────────────────────────────────────────

export default function AdminHomePage() {
  const [serviceEvents, setServiceEvents] = useState<ServiceEvent[]>([]);
  const [regEvents, setRegEvents] = useState<RegistrationEvent[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Stat card filters ──
  const [offeringService, setOfferingService]   = useState('all');
  const [attendanceService, setAttendanceService] = useState('all');

  const thisMonthStart = () => {
    const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d;
  };
  const toDateStr = (d: Date) => d.toISOString().slice(0, 10);

  const [offeringFrom, setOfferingFrom]     = useState(toDateStr(thisMonthStart()));
  const [offeringTo, setOfferingTo]         = useState(toDateStr(new Date()));
  const [attendanceFrom, setAttendanceFrom] = useState(toDateStr(thisMonthStart()));
  const [attendanceTo, setAttendanceTo]     = useState(toDateStr(new Date()));

  // ── Chart filter ──
  const [chartService, setChartService] = useState('all');
  const [createMenuOpen, setCreateMenuOpen] = useState(false);

  // ── Load data ──
  useEffect(() => {
    const load = async () => {
      try {
        // service_events — fetch all, sort client-side (no index needed)
        const seSnap = await getDocs(collection(db, 'service_events'));
        const se: ServiceEvent[] = seSnap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            ministry: data.ministry ?? 'Kebaktian',
            date: (data.date as Timestamp).toDate(),
            offering_amount: data.offering_amount,
            offering_notes: data.offering_notes,
            attendance_count: data.attendance_count,
            attendance_notes: data.attendance_notes,
            is_finished: data.is_finished ?? false,
            description: data.description,
          };
        }).sort((a, b) => b.date.getTime() - a.date.getTime());
        setServiceEvents(se);

        // registration events — fetch with only a single where(), no orderBy
        // (combining where() on one field + orderBy() on another = composite index required)
        const evSnap = await getDocs(
          query(collection(db, 'events'), where('type', '==', 'registration'))
        );
        const re: RegistrationEvent[] = evSnap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            title: data.title ?? 'Event',
            date: (data.date as Timestamp).toDate(),
            type: 'registration',
            capacity: data.capacity ?? 0,
            currentRegistrants: data.currentRegistrants ?? 0,
            description: data.description,
            registrationDeadline: data.registrationDeadline
              ? (data.registrationDeadline as Timestamp).toDate()
              : undefined,
            is_finished: data.is_finished ?? false,
          };
        }).sort((a, b) => a.date.getTime() - b.date.getTime());
        setRegEvents(re);

        // users — no orderBy (fails if any doc is missing the 'name' field)
        // use onSnapshot so the list stays live (new registrations appear instantly)
        const usSnap = await getDocs(collection(db, 'users'));
        const us: UserAccount[] = usSnap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name ?? 'Tanpa Nama',
            email: data.email ?? '',
            role: data.role ?? 'regular',
            ministries: data.ministries ?? [],
            createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : undefined,
          };
        }).sort((a, b) => a.name.localeCompare(b.name, 'id'));
        setUsers(us);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Derived: unique ministry names ──
  const ministries = useMemo(() => {
    const set = new Set(serviceEvents.map(e => e.ministry));
    return Array.from(set).sort();
  }, [serviceEvents]);

  const serviceOptions = [{ value: 'all', label: 'Semua' }, ...ministries.map(m => ({ value: m, label: m }))];

  // ── Helpers ──
  const finishedEvents = useMemo(() => serviceEvents.filter(e => e.is_finished), [serviceEvents]);

  function lastFinishedByService(ministry: string): ServiceEvent | undefined {
    const pool = ministry === 'all' ? finishedEvents : finishedEvents.filter(e => e.ministry === ministry);
    return pool[0]; // already sorted desc
  }

  function sumInRange(
    field: 'offering_amount' | 'attendance_count',
    from: string, to: string,
  ): number {
    const f = new Date(from); f.setHours(0,0,0,0);
    const t = new Date(to);   t.setHours(23,59,59,999);
    return finishedEvents
      .filter(e => e.date >= f && e.date <= t)
      .reduce((acc, e) => acc + (e[field] ?? 0), 0);
  }

  // ── Stat card values ──
  const lastOffering = useMemo(() => {
    if (offeringService === 'all') {
      // sum of the most recent offering from each ministry
      const byMinistry: Record<string, number> = {};
      for (const e of finishedEvents) {
        if (!(e.ministry in byMinistry) && e.offering_amount !== undefined) {
          byMinistry[e.ministry] = e.offering_amount;
        }
      }
      const vals = Object.values(byMinistry);
      return vals.length ? vals.reduce((a, b) => a + b, 0) : undefined;
    }
    return lastFinishedByService(offeringService)?.offering_amount;
  }, [offeringService, finishedEvents]);

  const totalOffering   = useMemo(() => sumInRange('offering_amount',   offeringFrom,   offeringTo),   [offeringFrom, offeringTo, finishedEvents]);
  const totalAttendance = useMemo(() => sumInRange('attendance_count',  attendanceFrom, attendanceTo), [attendanceFrom, attendanceTo, finishedEvents]);

  const lastAttendance = useMemo(() => {
    if (attendanceService === 'all') {
      const byMinistry: Record<string, number> = {};
      for (const e of finishedEvents) {
        if (!(e.ministry in byMinistry) && e.attendance_count !== undefined) {
          byMinistry[e.ministry] = e.attendance_count;
        }
      }
      const vals = Object.values(byMinistry);
      return vals.length ? vals.reduce((a, b) => a + b, 0) : undefined;
    }
    return lastFinishedByService(attendanceService)?.attendance_count;
  }, [attendanceService, finishedEvents]);

  // ── Chart data ──
  const chartData = useMemo(() => {
    const pool = chartService === 'all'
      ? finishedEvents
      : finishedEvents.filter(e => e.ministry === chartService);
    // group by date string, sum attendance
    const map: Record<string, number> = {};
    for (const e of pool) {
      if (e.attendance_count === undefined) continue;
      const key = e.date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      map[key] = (map[key] ?? 0) + e.attendance_count;
    }
    // sort by actual date
    const sorted = [...pool]
      .filter(e => e.attendance_count !== undefined)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    const seen = new Set<string>();
    const result: { date: string; value: number }[] = [];
    for (const e of sorted) {
      const key = e.date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ date: key, value: map[key] });
      }
    }
    return result;
  }, [chartService, finishedEvents]);

  // ── Upcoming events ──
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const upcoming = [
      // Kebaktian: show if not finished (even if date passed, matching mobile logic)
      ...serviceEvents
        .filter(e => !e.is_finished)
        .map(e => ({
          id: e.id,
          title: e.ministry,
          date: e.date,
          type: 'kebaktian' as const,
          subtitle: e.description ?? '',
          badge: null as string | null,
          isFull: false,
        })),
      // Registration: show if date hasn't passed
      ...regEvents
        .filter(e => !e.is_finished && e.date > now)
        .map(e => ({
          id: e.id,
          title: e.title,
          date: e.date,
          type: 'registrasi' as const,
          subtitle: e.description ?? '',
          badge: `${e.currentRegistrants}/${e.capacity}`,
          isFull: e.currentRegistrants >= e.capacity,
        })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime());
    return upcoming;
  }, [serviceEvents, regEvents]);

  // ── User management ──
  const filteredUsers = useMemo(() => {
    if (!userSearch) return users;
    const q = userSearch.toLowerCase();
    return users.filter(u =>
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Hapus akun "${userName}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setDeletingId(userId);
    try {
      await deleteDoc(doc(db, 'users', userId));
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (e) {
      alert('Gagal menghapus akun.');
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  // ── Format helpers ──
  const fmtCurrency = (v?: number) =>
    v === undefined ? '—' : `Rp ${v.toLocaleString('id-ID')}`;
  const fmtNumber = (v?: number) =>
    v === undefined ? '—' : v.toLocaleString('id-ID');
  const fmtDate = (d: Date) =>
    d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh', color: C.muted, fontFamily: 'Nunito, sans-serif' }}>
      Memuat data...
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: 'Nunito, sans-serif' }}>

      {/* ── Page title ── */}
      {/* <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.text }}>Dashboard</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: C.muted }}>Ringkasan data ibadah dan jemaat</p>
      </div> */}

      {/* ══ SECTION 1: STAT CARDS ══════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 32 }}>

        {/* Card 1 — Last offering */}
        <StatCard
          label="Persembahan Terakhir"
          value={fmtCurrency(lastOffering)}
          valueColor={C.success}
          filter={
            <SelectPill value={offeringService} options={serviceOptions} onChange={setOfferingService} />
          }
          sub={offeringService === 'all' ? 'Gabungan semua kebaktian' : `Kebaktian: ${offeringService}`}
        />

        {/* Card 2 — Total offering this period */}
        <StatCard
          label="Total Persembahan"
          value={fmtCurrency(totalOffering)}
          valueColor={C.primary}
          filter={
            <DateRangePicker
              from={offeringFrom} to={offeringTo}
              onFromChange={setOfferingFrom} onToChange={setOfferingTo}
            />
          }
          sub="Dalam rentang tanggal terpilih"
        />

        {/* Card 3 — Last attendance */}
        <StatCard
          label="Kehadiran Terakhir"
          value={fmtNumber(lastAttendance) + (lastAttendance !== undefined ? ' jiwa' : '')}
          valueColor={C.warn}
          filter={
            <SelectPill value={attendanceService} options={serviceOptions} onChange={setAttendanceService} />
          }
          sub={attendanceService === 'all' ? 'Gabungan semua kebaktian' : `Kebaktian: ${attendanceService}`}
        />

        {/* Card 4 — Total attendance this period */}
        <StatCard
          label="Total Kehadiran"
          value={fmtNumber(totalAttendance) + (totalAttendance > 0 ? ' jiwa' : '')}
          valueColor={C.primary}
          filter={
            <DateRangePicker
              from={attendanceFrom} to={attendanceTo}
              onFromChange={setAttendanceFrom} onToChange={setAttendanceTo}
            />
          }
          sub="Dalam rentang tanggal terpilih"
        />
      </div>

      {/* ══ SECTION 2: CHART + UPCOMING EVENTS ════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 16, marginBottom: 32 }}>

        {/* Line chart */}
        <Card style={{ padding: '20px 20px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: C.text }}>Kehadiran per Ibadah</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: C.muted }}>Berdasarkan ibadah yang telah selesai</p>
            </div>
            <SelectPill value={chartService} options={serviceOptions} onChange={setChartService} />
          </div>
          <div style={{ width: '100%', height: 220 }}>
            <LineChart data={chartData} />
          </div>
        </Card>

        {/* Upcoming events */}
        <Card style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Panel header with create button */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 16px 12px', borderBottom: `1px solid ${C.border}`,
          }}>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: C.text }}>Event Mendatang</p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: C.muted }}>{upcomingEvents.length} event</p>
            </div>
            {/* Create dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setCreateMenuOpen(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px',
                  background: C.primary, color: '#fff',
                  border: 'none', borderRadius: 7,
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <PlusIconSmall /> Buat
              </button>
              {createMenuOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 10 }}
                    onClick={() => setCreateMenuOpen(false)}
                  />
                  {/* Dropdown */}
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                    background: C.card, border: `1.5px solid ${C.border}`,
                    borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                    zIndex: 20, minWidth: 200, overflow: 'hidden',
                  }}>
                    <p style={{ margin: 0, padding: '10px 14px 6px', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                      Pilih jenis event
                    </p>
                    <CreateMenuOption
                      label="Kebaktian"
                      sub="Jadwal ibadah dengan petugas"
                      href="/admin/create-service"
                      onClick={() => setCreateMenuOpen(false)}
                    />
                    <CreateMenuOption
                      label="Registrasi"
                      sub="Form pendaftaran untuk acara"
                      href="/admin/create-registration"
                      onClick={() => setCreateMenuOpen(false)}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Event list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px 12px' }}>
            {upcomingEvents.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: C.muted, fontSize: 13 }}>
                Tidak ada event mendatang.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {upcomingEvents.map(ev => {
                  const isReg = ev.type === 'registrasi';
                  const typeColor  = isReg ? C.success  : C.primary;
                  const typeBg     = isReg ? C.successBg : C.primaryBg;
                  const typeBorder = isReg ? C.successBorder : C.primaryBorder;
                  const isPast = ev.date < new Date();
                  return (
                    <div key={ev.id} style={{
                      padding: '10px 12px',
                      borderRadius: 9,
                      border: `1.5px solid ${isPast ? C.warnBorder : typeBorder}`,
                      background: isPast ? C.warnBg : '#fafbfc',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        {/* Date badge */}
                        <div style={{
                          flexShrink: 0, width: 36, textAlign: 'center',
                          background: isPast ? '#fff' : typeBg,
                          borderRadius: 7, padding: '3px 4px',
                          border: `1px solid ${isPast ? C.warnBorder : typeBorder}`,
                        }}>
                          <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: isPast ? C.warn : typeColor, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                            {ev.date.toLocaleDateString('id-ID', { month: 'short' })}
                          </p>
                          <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: isPast ? C.warn : typeColor, lineHeight: 1 }}>
                            {ev.date.getDate()}
                          </p>
                        </div>

                        {/* Title + sub */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                            <span style={{
                              fontSize: 9, fontWeight: 800, letterSpacing: '0.4px',
                              color: typeColor, background: typeBg,
                              border: `1px solid ${typeBorder}`,
                              borderRadius: 4, padding: '1px 5px', textTransform: 'uppercase', flexShrink: 0,
                            }}>
                              {isReg ? 'REG' : 'IBADAH'}
                            </span>
                            {isPast && (
                              <span style={{ fontSize: 9, fontWeight: 700, color: C.warn, background: C.warnBg, border: `1px solid ${C.warnBorder}`, borderRadius: 4, padding: '1px 5px' }}>
                                BELUM SELESAI
                              </span>
                            )}
                          </div>
                          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.text,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {ev.title}
                          </p>
                          {ev.subtitle && (
                            <p style={{ margin: '1px 0 0', fontSize: 10, color: C.muted,
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {ev.subtitle}
                            </p>
                          )}
                        </div>

                        {/* Badge: registrant count or nothing */}
                        {ev.badge && (
                          <span style={{
                            flexShrink: 0, fontSize: 10, fontWeight: 700,
                            color: ev.isFull ? C.error : C.success,
                            background: ev.isFull ? C.errorBg : C.successBg,
                            border: `1px solid ${ev.isFull ? C.errorBorder : C.successBorder}`,
                            borderRadius: 5, padding: '2px 6px',
                          }}>
                            {ev.badge}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ══ SECTION 3: USER ACCOUNTS ═══════════════════════════════════════ */}
      <SectionHeading>Daftar Akun</SectionHeading>

      {/* Search bar */}
      <div style={{ position: 'relative', marginBottom: 16, maxWidth: 400 }}>
        <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }}>
          <SearchIcon />
        </div>
        <input
          type="text"
          placeholder="Cari nama atau email..."
          value={userSearch}
          onChange={e => setUserSearch(e.target.value)}
          style={{
            width: '100%', padding: '10px 14px 10px 38px',
            border: `1.5px solid ${C.border}`, borderRadius: 8,
            fontSize: 14, color: C.text, background: C.card,
            outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
            transition: 'border-color 0.2s',
          }}
          onFocus={e => (e.target.style.borderColor = C.primary)}
          onBlur={e => (e.target.style.borderColor = C.border)}
        />
        {userSearch && (
          <button onClick={() => setUserSearch('')} style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: C.muted,
            display: 'flex', alignItems: 'center', padding: 2,
          }}>
            <XSmallIcon />
          </button>
        )}
      </div>

      <p style={{ margin: '0 0 12px', fontSize: 13, color: C.muted }}>
        {filteredUsers.length} dari {users.length} akun
      </p>

      {/* Users table */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {/* Header row */}
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 2.5fr 1fr 1fr auto',
          gap: 0, padding: '10px 20px', background: '#f8fafc',
          borderBottom: `1px solid ${C.border}`,
        }}>
          {['Nama', 'Email', 'Role', 'Bergabung', ''].map(h => (
            <span key={h} style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              {h}
            </span>
          ))}
        </div>

        {filteredUsers.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: C.muted, fontSize: 14 }}>
            Tidak ada akun yang cocok.
          </div>
        ) : (
          filteredUsers.map((user, i) => (
            <div
              key={user.id}
              style={{
                display: 'grid', gridTemplateColumns: '2fr 2.5fr 1fr 1fr auto',
                gap: 0, padding: '14px 20px', alignItems: 'center',
                borderBottom: i < filteredUsers.length - 1 ? `1px solid ${C.border}` : 'none',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#fafbfc')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {/* Avatar + name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                  background: C.primaryBg, color: C.primary,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 800,
                }}>
                  {user.name[0]?.toUpperCase() ?? 'U'}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user.name}
                  </p>
                  {user.ministries && user.ministries.length > 0 && (
                    <p style={{ margin: 0, fontSize: 11, color: C.muted }}>
                      {user.ministries.join(', ')}
                    </p>
                  )}
                </div>
              </div>

              {/* Email */}
              <p style={{ margin: 0, fontSize: 13, color: C.sub,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.email}
              </p>

              {/* Role */}
              <div><RoleTag role={user.role} /></div>

              {/* Joined */}
              <p style={{ margin: 0, fontSize: 12, color: C.muted }}>
                {user.createdAt ? fmtDate(user.createdAt) : '—'}
              </p>

              {/* Delete */}
              <button
                onClick={() => handleDeleteUser(user.id, user.name)}
                disabled={deletingId === user.id || user.role === 'admin'}
                title={user.role === 'admin' ? 'Admin tidak bisa dihapus dari sini' : 'Hapus akun'}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 30, height: 30, borderRadius: 7,
                  background: user.role === 'admin' ? '#f1f5f9' : '#fff5f5',
                  border: `1.5px solid ${user.role === 'admin' ? C.border : '#fecaca'}`,
                  color: user.role === 'admin' ? C.muted : C.error,
                  cursor: user.role === 'admin' || deletingId === user.id ? 'not-allowed' : 'pointer',
                  opacity: deletingId === user.id ? 0.5 : 1,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  if (user.role !== 'admin' && deletingId !== user.id) {
                    e.currentTarget.style.background = C.error;
                    e.currentTarget.style.color = '#fff';
                    e.currentTarget.style.borderColor = C.error;
                  }
                }}
                onMouseLeave={e => {
                  if (user.role !== 'admin') {
                    e.currentTarget.style.background = '#fff5f5';
                    e.currentTarget.style.color = C.error;
                    e.currentTarget.style.borderColor = '#fecaca';
                  }
                }}
              >
                <TrashSmallIcon />
              </button>
            </div>
          ))
        )}
      </Card>
      <div style={{ height: 40 }} />
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, valueColor, filter, sub,
}: {
  label: string;
  value: string;
  valueColor: string;
  filter: React.ReactNode;
  sub: string;
}) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: `1.5px solid ${C.border}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '18px 20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.sub }}>{label}</p>
        {filter}
      </div>
      <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: valueColor, lineHeight: 1.1 }}>
        {value}
      </p>
      <p style={{ margin: '6px 0 0', fontSize: 11, color: C.muted }}>{sub}</p>
    </div>
  );
}

// ─── Tiny inline icons ────────────────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}

function XSmallIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

function PlusIconSmall() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}

function CreateMenuOption({
  label, sub, href, onClick,
}: {
  label: string; sub: string; href: string; onClick: () => void;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', textDecoration: 'none',
        borderTop: `1px solid ${C.border}`, cursor: 'pointer',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.text }}>{label}</p>
        <p style={{ margin: 0, fontSize: 11, color: C.muted }}>{sub}</p>
      </div>
    </a>
  );
}

function TrashSmallIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
      <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
    </svg>
  );
}
