'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart2,
  Banknote,
  CalendarDays,
  CheckCircle,
  Clock,
  FileText,
  Loader,
  Plus,
  Ticket,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface DashboardData {
  event_counts: { draft: number; pending: number; approved: number; rejected: number; cancelled: number };
  totals: { revenue: number; tickets: number; bookings: number; checked_in: number };
  top_events: { event_id: string; title: string; revenue: number; tickets: number; bookings: number }[];
  recent_bookings: {
    id: string;
    booking_reference: string;
    event_title: string;
    number_of_tickets: number;
    total_amount: number | string;
    attendee_name: string | null;
    created_at: string;
  }[];
}

interface Balance {
  pending: number;
  net: number;
  gross: number;
  paid_out: number;
  platform_fee_pct: number;
}

export default function OrganizerDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [data, setData] = useState<DashboardData | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Auth + role guard
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/auth/login?redirect=/organizer');
      return;
    }
    if (user.role !== 'organizer' && user.role !== 'superadmin') {
      // Non-organizers go through the application flow
      router.replace('/become-organizer');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user || (user.role !== 'organizer' && user.role !== 'superadmin')) return;
    Promise.all([
      fetch(`${API_URL}/api/organizer/events/dashboard`, { credentials: 'include' }).then(r => r.json()),
      fetch(`${API_URL}/api/organizer/payouts/balance`, { credentials: 'include' }).then(r => r.json()),
    ])
      .then(([dashRes, balRes]) => {
        if (!dashRes?.success) { setError(dashRes?.message || 'Failed to load dashboard.'); return; }
        setData(dashRes.data as DashboardData);
        if (balRes?.success) setBalance(balRes.data.balance);
      })
      .catch(() => setError('Network error.'))
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#07060A' }}>
        <Loader className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#07060A' }}>
        <div className="text-center">
          <p className="text-gray-400 mb-4">{error}</p>
          <Link href="/" className="text-purple-400 underline text-sm">Back to home</Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const counts = data.event_counts;

  return (
    <div className="min-h-screen pt-20 pb-24 px-4" style={{ backgroundColor: '#07060A' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Organizer dashboard</h1>
            <p className="text-gray-400 text-sm mt-1">Welcome back, {user?.name?.split(' ')[0] ?? 'there'}.</p>
          </div>
          <Link
            href="/organizer/events/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm"
            style={{ background: 'linear-gradient(135deg, #A78BFA 0%, #FF7AC6 100%)', color: '#0a0712' }}
          >
            <Plus className="w-4 h-4" /> New event
          </Link>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Total revenue"
            value={`LKR ${data.totals.revenue.toLocaleString()}`}
            sub={`${data.totals.bookings} confirmed bookings`}
            color="#A78BFA"
          />
          <KpiCard
            icon={<Ticket className="w-5 h-5" />}
            label="Tickets sold"
            value={String(data.totals.tickets)}
            color="#38BDF8"
          />
          <KpiCard
            icon={<Users className="w-5 h-5" />}
            label="Checked in"
            value={`${data.totals.checked_in} / ${data.totals.tickets}`}
            sub={data.totals.tickets > 0 ? `${Math.round((data.totals.checked_in / data.totals.tickets) * 100)}%` : '—'}
            color="#34D399"
          />
          <KpiCard
            icon={<Banknote className="w-5 h-5" />}
            label="Pending payout"
            value={balance ? `LKR ${balance.pending.toLocaleString()}` : '—'}
            sub={balance ? `After ${(balance.platform_fee_pct * 100).toFixed(0)}% platform fee` : undefined}
            color="#FB923C"
            highlight={!!balance && balance.pending > 0}
            href="/organizer/payouts"
          />
        </div>

        {/* Event status overview */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">Events at a glance</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatusPill href="/organizer/events?status=draft"    icon={<FileText className="w-4 h-4" />}    label="Drafts"    count={counts.draft}    color="#9CA3AF" />
            <StatusPill href="/organizer/events?status=pending"  icon={<Clock className="w-4 h-4" />}       label="Pending"   count={counts.pending}  color="#F59E0B" />
            <StatusPill href="/organizer/events?status=approved" icon={<CheckCircle className="w-4 h-4" />} label="Approved" count={counts.approved} color="#10B981" />
            <StatusPill href="/organizer/events?status=rejected" icon={<XCircle className="w-4 h-4" />}     label="Rejected"  count={counts.rejected} color="#EF4444" />
            <StatusPill href="/organizer/events"                 icon={<CalendarDays className="w-4 h-4" />} label="All"       count={Object.values(counts).reduce((s, n) => s + n, 0)} color="#A78BFA" />
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top events by revenue */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3 flex items-center gap-2">
              <BarChart2 className="w-4 h-4" /> Top events by revenue
            </h2>
            {data.top_events.length === 0 ? (
              <EmptyHint message="No revenue yet — your first booking will show up here." />
            ) : (
              <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'rgba(196,181,253,0.12)', backgroundColor: 'rgba(21,18,29,0.5)' }}>
                {data.top_events.map((e, i) => (
                  <Link
                    key={e.event_id}
                    href={`/organizer/events/${e.event_id}/analytics`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
                    style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(196,181,253,0.07)' }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-white font-medium truncate">{e.title}</div>
                      <div className="text-xs text-gray-500">{e.bookings} booking{e.bookings === 1 ? '' : 's'} · {e.tickets} ticket{e.tickets === 1 ? '' : 's'}</div>
                    </div>
                    <div className="text-purple-300 font-semibold ml-3">LKR {e.revenue.toLocaleString()}</div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Recent bookings */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3 flex items-center gap-2">
              <Ticket className="w-4 h-4" /> Recent bookings
            </h2>
            {data.recent_bookings.length === 0 ? (
              <EmptyHint message="Once attendees buy tickets they'll appear here." />
            ) : (
              <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'rgba(196,181,253,0.12)', backgroundColor: 'rgba(21,18,29,0.5)' }}>
                {data.recent_bookings.map((b, i) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between px-4 py-3"
                    style={{ borderTop: i === 0 ? 'none' : '1px solid rgba(196,181,253,0.07)' }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-white font-medium truncate">{b.attendee_name ?? '—'}</div>
                      <div className="text-xs text-gray-500 truncate">{b.event_title} · {new Date(b.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className="text-right ml-3 shrink-0">
                      <div className="text-sm text-white">{b.number_of_tickets} × ticket</div>
                      <div className="text-xs text-purple-300">LKR {Number(b.total_amount).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon, label, value, sub, color, highlight = false, href,
}: { icon: React.ReactNode; label: string; value: string; sub?: string; color: string; highlight?: boolean; href?: string }) {
  const body = (
    <>
      <div className="h-9 w-9 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${color}1a`, color }}>{icon}</div>
      <div className="text-xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs mt-0.5" style={{ color }}>{sub}</div>}
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </>
  );
  const cls = "p-5 rounded-2xl border block transition-colors";
  const style = {
    backgroundColor: highlight ? `${color}12` : 'rgba(21,18,29,0.5)',
    borderColor: highlight ? `${color}55` : 'rgba(196,181,253,0.12)',
  };
  return href ? (
    <Link href={href} className={`${cls} hover:opacity-90`} style={style}>{body}</Link>
  ) : (
    <div className={cls} style={style}>{body}</div>
  );
}

function StatusPill({
  href, icon, label, count, color,
}: { href: string; icon: React.ReactNode; label: string; count: number; color: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between px-4 py-3 rounded-xl border hover:bg-white/5 transition-colors"
      style={{ borderColor: 'rgba(196,181,253,0.12)', backgroundColor: 'rgba(21,18,29,0.5)' }}
    >
      <span className="flex items-center gap-2 text-sm" style={{ color }}>
        {icon}
        <span className="text-gray-300">{label}</span>
      </span>
      <span className="text-sm font-semibold" style={{ color }}>{count}</span>
    </Link>
  );
}

function EmptyHint({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-gray-500" style={{ borderColor: 'rgba(196,181,253,0.15)' }}>
      {message}
    </div>
  );
}
