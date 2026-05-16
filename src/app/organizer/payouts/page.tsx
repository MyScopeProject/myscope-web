'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Banknote, CheckCircle, Clock, Loader, TrendingUp, XCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface Balance {
  gross: number;
  fee: number;
  net: number;
  refunded: number;
  paid_out: number;
  pending: number;
  platform_fee_pct: number;
}

interface Payout {
  id: string;
  amount: number | string;
  status: 'requested' | 'approved' | 'paid' | 'rejected';
  notes: string | null;
  event_id: string | null;
  event?: { id: string; title: string } | null;
  requested_at: string;
  processed_at: string | null;
}

const STATUS_META: Record<Payout['status'], { color: string; bg: string; label: string; icon: React.ReactNode }> = {
  requested: { color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)', label: 'Requested', icon: <Clock className="w-3.5 h-3.5" /> },
  approved:  { color: '#A78BFA', bg: 'rgba(167,139,250,0.12)', label: 'Approved',  icon: <CheckCircle className="w-3.5 h-3.5" /> },
  paid:      { color: '#10b981', bg: 'rgba(16,185,129,0.12)',  label: 'Paid',      icon: <Banknote className="w-3.5 h-3.5" /> },
  rejected:  { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   label: 'Rejected',  icon: <XCircle className="w-3.5 h-3.5" /> },
};

export default function OrganizerPayoutsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [balance, setBalance] = useState<Balance | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.push('/auth/login?redirect=/organizer/payouts');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch(`${API_URL}/api/organizer/payouts/balance`, { credentials: 'include' }).then(r => r.json()),
      fetch(`${API_URL}/api/organizer/payouts`, { credentials: 'include' }).then(r => r.json()),
    ])
      .then(([balRes, payRes]) => {
        if (!balRes?.success) { setError(balRes?.message || 'Failed to load balance.'); return; }
        if (!payRes?.success) { setError(payRes?.message || 'Failed to load payouts.'); return; }
        setBalance(balRes.data.balance);
        setPayouts(payRes.data.payouts as Payout[]);
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
          <Link href="/organizer/events" className="text-purple-400 underline text-sm">Back to events</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-24 px-4" style={{ backgroundColor: '#07060A' }}>
      <div className="max-w-4xl mx-auto">
        <Link href="/organizer/events" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to events
        </Link>
        <h1 className="text-2xl font-bold text-white mb-1">Your payouts</h1>
        <p className="text-gray-400 text-sm mb-8">
          Track event revenue and payouts. MyScope retains a {balance ? (balance.platform_fee_pct * 100).toFixed(1) : '5.0'}% platform fee.
        </p>

        {/* Balance cards */}
        {balance && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <BalanceCard label="Gross revenue" value={balance.gross} color="#38BDF8" icon={<TrendingUp className="w-5 h-5" />} />
            <BalanceCard label="Net (after fee & refunds)" value={balance.net} color="#A78BFA" icon={<Banknote className="w-5 h-5" />} />
            <BalanceCard label="Already paid out" value={balance.paid_out} color="#10b981" icon={<CheckCircle className="w-5 h-5" />} />
            <BalanceCard label="Pending balance" value={balance.pending} color="#FB923C" icon={<Clock className="w-5 h-5" />} highlight />
          </div>
        )}

        {/* Payouts table */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">Payout history</h2>
          {payouts.length === 0 ? (
            <p className="text-gray-500 text-sm py-8 text-center border border-dashed border-gray-700 rounded-2xl">
              No payouts yet. They appear here once admin allocates one from your pending balance.
            </p>
          ) : (
            <div className="rounded-2xl border overflow-x-auto" style={{ borderColor: 'rgba(196,181,253,0.12)', backgroundColor: 'rgba(21,18,29,0.5)' }}>
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'rgba(196,181,253,0.1)' }}>
                    {['Date', 'Event', 'Amount', 'Status', 'Processed', 'Notes'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-gray-400 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p, i) => {
                    const meta = STATUS_META[p.status] ?? STATUS_META.requested;
                    return (
                      <tr key={p.id} className={i < payouts.length - 1 ? 'border-b' : ''} style={{ borderColor: 'rgba(196,181,253,0.07)' }}>
                        <td className="px-4 py-3 text-gray-300">{new Date(p.requested_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-white">{p.event?.title ?? '—'}</td>
                        <td className="px-4 py-3 text-purple-300 font-semibold">LKR {Number(p.amount).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: meta.bg, color: meta.color }}>
                            {meta.icon} {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {p.processed_at ? new Date(p.processed_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate" title={p.notes ?? ''}>{p.notes ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function BalanceCard({
  label, value, color, icon, highlight = false,
}: { label: string; value: number; color: string; icon: React.ReactNode; highlight?: boolean }) {
  return (
    <div
      className="p-5 rounded-2xl border flex flex-col gap-3"
      style={{
        backgroundColor: highlight ? `${color}14` : 'rgba(21,18,29,0.5)',
        borderColor: highlight ? `${color}66` : 'rgba(196,181,253,0.12)',
      }}
    >
      <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}1a`, color }}>
        {icon}
      </div>
      <div>
        <div className="text-xl font-bold text-white">LKR {value.toLocaleString()}</div>
        <div className="text-xs text-gray-400 mt-0.5">{label}</div>
      </div>
    </div>
  );
}
