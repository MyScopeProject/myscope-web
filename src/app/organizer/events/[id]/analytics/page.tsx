'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  BarChart2,
  CheckCircle,
  Clock,
  Download,
  Loader,
  Ticket,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface TicketTypeStat {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sold: number;
  revenue: number;
  checked_in: number;
}

interface Attendee {
  id: string;
  booking_reference: string;
  ticket_type_id: string | null;
  number_of_tickets: number;
  total_amount: number | string;
  attendee_info: { name?: string; email?: string; phone?: string | null } | null;
  checked_in_at: string | null;
  created_at: string;
}

interface AnalyticsData {
  event: { id: string; title: string; start_time: string | null; venue_name: string | null; approval_status: string };
  summary: { total_revenue: number; total_sold: number; total_capacity: number; total_checked_in: number; occupancy_pct: number };
  ticket_types: TicketTypeStat[];
  attendees: Attendee[];
}

export default function OrganizerAnalyticsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const eventId = params?.id;
  const { user, loading: authLoading } = useAuth();

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.push('/auth/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user || !eventId) return;
    fetchAnalytics();
  }, [user, eventId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/organizer/events/${eventId}/analytics`, {
        credentials: 'include',
      });
      const body = await res.json();
      if (!body?.success) {
        setError(body?.message || 'Failed to load analytics.');
        return;
      }
      setData(body.data as AnalyticsData);
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  };

  // CSV export — attendee list
  const exportCsv = () => {
    if (!data) return;
    const ttMap = Object.fromEntries(data.ticket_types.map(tt => [tt.id, tt.name]));
    const rows = [
      ['Booking Ref', 'Name', 'Email', 'Phone', 'Ticket Type', 'Qty', 'Amount (LKR)', 'Checked In', 'Booked At'],
      ...data.attendees.map(a => [
        a.booking_reference,
        a.attendee_info?.name ?? '',
        a.attendee_info?.email ?? '',
        a.attendee_info?.phone ?? '',
        a.ticket_type_id ? (ttMap[a.ticket_type_id] ?? '') : '',
        String(a.number_of_tickets),
        String(Number(a.total_amount).toFixed(2)),
        a.checked_in_at ? new Date(a.checked_in_at).toLocaleString() : 'No',
        new Date(a.created_at).toLocaleString(),
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendees-${data.event.title.replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#07060A' }}>
        <Loader className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#07060A' }}>
        <div className="text-center">
          <p className="text-gray-400 mb-4">{error || 'No data found.'}</p>
          <Link href="/organizer/events" className="text-purple-400 underline text-sm">Back to events</Link>
        </div>
      </div>
    );
  }

  const { event, summary, ticket_types, attendees } = data;
  const ttMap = Object.fromEntries(ticket_types.map(tt => [tt.id, tt.name]));

  return (
    <div className="min-h-screen pt-20 pb-24 px-4" style={{ backgroundColor: '#07060A' }}>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <Link
              href="/organizer/events"
              className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-3"
            >
              <ArrowLeft className="w-4 h-4" /> Back to events
            </Link>
            <h1 className="text-2xl font-bold text-white">{event.title}</h1>
            {event.start_time && (
              <p className="text-gray-400 text-sm mt-1">{new Date(event.start_time).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            )}
            {event.venue_name && <p className="text-gray-500 text-sm">{event.venue_name}</p>}
          </div>

          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-purple-500/40 text-purple-300 hover:bg-purple-500/10 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Revenue"
            value={`LKR ${summary.total_revenue.toLocaleString()}`}
            color="#A78BFA"
          />
          <StatCard
            icon={<Ticket className="w-5 h-5" />}
            label="Tickets sold"
            value={`${summary.total_sold} / ${summary.total_capacity}`}
            sub={`${summary.occupancy_pct}% full`}
            color="#38BDF8"
          />
          <StatCard
            icon={<Users className="w-5 h-5" />}
            label="Bookings"
            value={String(attendees.length)}
            color="#FB923C"
          />
          <StatCard
            icon={<CheckCircle className="w-5 h-5" />}
            label="Checked in"
            value={`${summary.total_checked_in} / ${summary.total_sold}`}
            sub={summary.total_sold > 0 ? `${Math.round((summary.total_checked_in / summary.total_sold) * 100)}%` : '—'}
            color="#34D399"
          />
        </div>

        {/* Ticket type breakdown */}
        {ticket_types.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3 flex items-center gap-2">
              <BarChart2 className="w-4 h-4" /> Ticket types
            </h2>
            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'rgba(196,181,253,0.12)', backgroundColor: 'rgba(21,18,29,0.5)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'rgba(196,181,253,0.1)' }}>
                    {['Type', 'Price', 'Capacity', 'Sold', 'Revenue', 'Checked in'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-gray-400 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ticket_types.map((tt, i) => (
                    <tr
                      key={tt.id}
                      className={i < ticket_types.length - 1 ? 'border-b' : ''}
                      style={{ borderColor: 'rgba(196,181,253,0.07)' }}
                    >
                      <td className="px-4 py-3 text-white font-medium">{tt.name}</td>
                      <td className="px-4 py-3 text-gray-300">LKR {tt.price.toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-300">{tt.quantity}</td>
                      <td className="px-4 py-3">
                        <span className="text-white">{tt.sold}</span>
                        <span className="text-gray-500 text-xs ml-1">({tt.quantity > 0 ? Math.round((tt.sold / tt.quantity) * 100) : 0}%)</span>
                      </td>
                      <td className="px-4 py-3 text-purple-300 font-medium">LKR {tt.revenue.toLocaleString()}</td>
                      <td className="px-4 py-3 text-green-400">{tt.checked_in}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Attendee list */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" /> Attendees ({attendees.length})
          </h2>

          {attendees.length === 0 ? (
            <p className="text-gray-500 text-sm py-6 text-center border border-dashed border-gray-700 rounded-2xl">
              No confirmed bookings yet.
            </p>
          ) : (
            <div className="rounded-2xl border overflow-x-auto" style={{ borderColor: 'rgba(196,181,253,0.12)', backgroundColor: 'rgba(21,18,29,0.5)' }}>
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'rgba(196,181,253,0.1)' }}>
                    {['Reference', 'Attendee', 'Ticket type', 'Qty', 'Total', 'Status', 'Booked'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-gray-400 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {attendees.map((a, i) => (
                    <tr
                      key={a.id}
                      className={i < attendees.length - 1 ? 'border-b' : ''}
                      style={{ borderColor: 'rgba(196,181,253,0.07)' }}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-gray-300">{a.booking_reference}</td>
                      <td className="px-4 py-3">
                        <div className="text-white">{a.attendee_info?.name ?? '—'}</div>
                        <div className="text-gray-500 text-xs">{a.attendee_info?.email ?? ''}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-300">{a.ticket_type_id ? (ttMap[a.ticket_type_id] ?? '—') : '—'}</td>
                      <td className="px-4 py-3 text-gray-300">{a.number_of_tickets}</td>
                      <td className="px-4 py-3 text-purple-300">LKR {Number(a.total_amount).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        {a.checked_in_at ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-400">
                            <CheckCircle className="w-3.5 h-3.5" />
                            {new Date(a.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="w-3.5 h-3.5" /> Not yet
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(a.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div
      className="p-5 rounded-2xl border flex flex-col gap-3"
      style={{ backgroundColor: 'rgba(21,18,29,0.5)', borderColor: 'rgba(196,181,253,0.12)' }}
    >
      <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}1a`, color }}>
        {icon}
      </div>
      <div>
        <div className="text-xl font-bold text-white">{value}</div>
        {sub && <div className="text-xs mt-0.5" style={{ color }}>{sub}</div>}
        <div className="text-xs text-gray-400 mt-0.5">{label}</div>
      </div>
    </div>
  );
}
