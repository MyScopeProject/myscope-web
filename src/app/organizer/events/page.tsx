'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  BarChart2,
  Calendar,
  CheckCircle,
  Clock,
  Edit3,
  FileText,
  Loader,
  Plus,
  Send,
  XCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type ApprovalStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled';

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  venue_name: string | null;
  start_time: string | null;
  date: string | null; // legacy fallback
  approval_status: ApprovalStatus;
  rejection_reason: string | null;
  created_at: string;
}

const STATUS_META: Record<
  ApprovalStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  draft: { label: 'Draft', color: '#94a3b8', icon: <FileText className="w-3.5 h-3.5" /> },
  pending: { label: 'Under review', color: '#f59e0b', icon: <Clock className="w-3.5 h-3.5" /> },
  approved: { label: 'Live', color: '#10b981', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  rejected: { label: 'Rejected', color: '#FF6B6B', icon: <XCircle className="w-3.5 h-3.5" /> },
  cancelled: { label: 'Cancelled', color: '#94a3b8', icon: <XCircle className="w-3.5 h-3.5" /> },
};

export default function OrganizerEventsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Redirect non-organizers away
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth/login?redirect=/organizer/events');
      return;
    }
    // 'organizer' or 'superadmin' can see this page; anyone else gets sent to apply
    if (user && !['organizer', 'superadmin'].includes((user as { role?: string }).role || '')) {
      router.push('/become-organizer');
    }
  }, [authLoading, user, router]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/organizer/events`, { credentials: 'include' });
      const data = await res.json();
      if (data?.success) {
        setEvents(data.data?.events ?? []);
      } else {
        setError(data?.message || 'Failed to load events.');
      }
    } catch {
      setError('Network error loading events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && ['organizer', 'superadmin'].includes((user as { role?: string }).role || '')) {
      fetchEvents();
    }
  }, [user]);

  const handleSubmit = async (id: string) => {
    if (!confirm('Submit this event for admin review? You won’t be able to edit it while pending.')) {
      return;
    }
    setSubmittingId(id);
    try {
      const res = await fetch(`${API_URL}/api/organizer/events/${id}/submit`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data?.success) {
        await fetchEvents();
      } else {
        alert(data?.message || 'Failed to submit.');
      }
    } finally {
      setSubmittingId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#07060A' }}
      >
        <Loader className="w-8 h-8 animate-spin text-text-secondary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-12" style={{ backgroundColor: '#07060A' }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-outfit font-bold text-text-primary mb-1">My events</h1>
            <p className="text-text-secondary font-plex-sans">
              Drafts stay private. Approved events appear on MyScope.
            </p>
          </div>
          <Link
            href="/organizer/events/create"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-inter font-semibold text-sm"
            style={{
              background: 'linear-gradient(135deg, #A78BFA 0%, #FF7AC6 100%)',
              color: '#0a0712',
            }}
          >
            <Plus className="w-4 h-4" />
            New event
          </Link>
        </div>

        {error && (
          <div
            className="mb-6 p-4 rounded-lg border text-sm"
            style={{
              backgroundColor: 'rgba(255, 107, 107, 0.1)',
              borderColor: 'rgba(255, 107, 107, 0.3)',
              color: '#FF6B6B',
            }}
          >
            {error}
          </div>
        )}

        {events.length === 0 ? (
          <div
            className="rounded-2xl border p-12 text-center"
            style={{
              backgroundColor: 'rgba(21, 18, 29, 0.5)',
              borderColor: 'rgba(196, 181, 253, 0.15)',
            }}
          >
            <Calendar className="w-12 h-12 mx-auto mb-3 text-text-secondary" />
            <h2 className="text-xl font-outfit font-semibold text-text-primary mb-1">
              No events yet
            </h2>
            <p className="text-text-secondary font-plex-sans mb-5">
              Create your first event to start selling tickets.
            </p>
            <Link
              href="/organizer/events/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-inter font-semibold text-sm"
              style={{
                background: 'linear-gradient(135deg, #A78BFA 0%, #FF7AC6 100%)',
                color: '#0a0712',
              }}
            >
              <Plus className="w-4 h-4" />
              Create event
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {events.map((e) => (
              <EventRowCard
                key={e.id}
                event={e}
                onSubmit={() => handleSubmit(e.id)}
                submitting={submittingId === e.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EventRowCard({
  event,
  onSubmit,
  submitting,
}: {
  event: EventRow;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const status = STATUS_META[event.approval_status] ?? STATUS_META.draft;
  const when = event.start_time || event.date;
  const canEdit = event.approval_status === 'draft' || event.approval_status === 'rejected';
  const canSubmit = canEdit;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center gap-4"
      style={{
        backgroundColor: 'rgba(21, 18, 29, 0.5)',
        borderColor: 'rgba(196, 181, 253, 0.15)',
      }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <StatusBadge status={event.approval_status} />
          {event.category && (
            <span className="text-xs text-text-secondary font-plex-sans capitalize">
              · {event.category}
            </span>
          )}
        </div>
        <h3 className="font-outfit font-semibold text-text-primary text-lg truncate">
          {event.title}
        </h3>
        <div className="text-sm text-text-secondary font-plex-sans mt-1 flex items-center gap-3 flex-wrap">
          {when && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(when).toLocaleString()}
            </span>
          )}
          {event.venue_name && <span>· {event.venue_name}</span>}
        </div>
        {event.approval_status === 'rejected' && event.rejection_reason && (
          <div
            className="mt-3 p-3 rounded-md text-sm"
            style={{
              backgroundColor: 'rgba(255, 107, 107, 0.08)',
              border: '1px solid rgba(255, 107, 107, 0.25)',
              color: '#FF6B6B',
            }}
          >
            <span className="font-semibold">Rejection reason: </span>
            {event.rejection_reason}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {event.approval_status === 'approved' && (
          <Link
            href={`/organizer/events/${event.id}/analytics`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-inter font-semibold"
            style={{ backgroundColor: 'rgba(56, 189, 248, 0.12)', color: '#38BDF8' }}
          >
            <BarChart2 className="w-4 h-4" />
            Analytics
          </Link>
        )}
        {canEdit && (
          <Link
            href={`/organizer/events/${event.id}/edit`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-inter font-semibold"
            style={{
              backgroundColor: 'rgba(167, 139, 250, 0.12)',
              color: '#A78BFA',
            }}
          >
            <Edit3 className="w-4 h-4" />
            Edit
          </Link>
        )}
        {canSubmit && (
          <button
            onClick={onSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-inter font-semibold disabled:opacity-50"
            style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}
          >
            {submitting ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Submit for review
          </button>
        )}
      </div>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: ApprovalStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.draft;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-inter font-semibold"
      style={{
        backgroundColor: `${meta.color}1a`,
        color: meta.color,
      }}
    >
      {meta.icon}
      {meta.label}
    </span>
  );
}
