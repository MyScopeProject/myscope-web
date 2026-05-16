'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertCircle, ChevronLeft, Loader, Send, Save, Tag, Plus, Edit3, Trash2, X, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type ApprovalStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled';

interface EventRow {
  id: string;
  title: string | null;
  description: string | null;
  category: string | null;
  venue_name: string | null;
  venue_address: string | null;
  start_time: string | null;
  end_time: string | null;
  capacity: number | null;
  banner_url: string | null;
  approval_status: ApprovalStatus;
  rejection_reason: string | null;
}

interface TicketType {
  id: string;
  name: string;
  description: string | null;
  price: number;
  quantity_total: number;
  quantity_sold: number;
  per_order_limit: number;
  sale_start: string | null;
  sale_end: string | null;
  is_active: boolean;
}

// Convert ISO to the value format `<input type="datetime-local">` wants.
const isoToLocal = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const localToIso = (v: string) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

const inputClass =
  'w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-accent-primary focus:border-accent-primary outline-none transition-all text-text-primary placeholder-text-muted font-plex-sans';
const inputStyle: React.CSSProperties = { backgroundColor: 'rgba(30, 26, 43, 0.6)' };
const labelClass = 'block text-sm font-inter font-semibold mb-2 text-text-primary';

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { user, loading: authLoading } = useAuth();

  const [event, setEvent] = useState<EventRow | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<null | 'save' | 'submit'>(null);

  // form state mirrors EventRow but with strings for input fields
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    venue_name: '',
    venue_address: '',
    start_time: '',
    end_time: '',
    capacity: '',
    banner_url: '',
  });

  // Auth guard
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/auth/login?redirect=/organizer/events/${id}/edit`);
      return;
    }
    const role = (user as { role?: string }).role || '';
    if (!['organizer', 'superadmin'].includes(role)) {
      router.push('/become-organizer');
    }
  }, [authLoading, user, id, router]);

  // Load existing event
  useEffect(() => {
    if (!user || !id) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/organizer/events/${id}`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (cancelled) return;
        if (!data?.success) {
          setError(data?.message || 'Event not found.');
          return;
        }
        const e = data.data.event as EventRow;
        setEvent(e);
        setTicketTypes(data.data.ticket_types ?? []);
        setForm({
          title: e.title ?? '',
          description: e.description ?? '',
          category: e.category ?? '',
          venue_name: e.venue_name ?? '',
          venue_address: e.venue_address ?? '',
          start_time: isoToLocal(e.start_time),
          end_time: isoToLocal(e.end_time),
          capacity: e.capacity != null ? String(e.capacity) : '',
          banner_url: e.banner_url ?? '',
        });
      } catch {
        if (!cancelled) setError('Network error loading event.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, id]);

  const canEdit =
    event?.approval_status === 'draft' || event?.approval_status === 'rejected';

  const handleSave = async () => {
    if (!event) return;
    setError('');

    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!form.start_time) {
      setError('Start time is required.');
      return;
    }

    setBusy('save');
    try {
      const res = await fetch(`${API_URL}/api/organizer/events/${event.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          category: form.category.trim() || null,
          venue_name: form.venue_name.trim() || null,
          venue_address: form.venue_address.trim() || null,
          start_time: localToIso(form.start_time),
          end_time: localToIso(form.end_time),
          capacity: form.capacity ? parseInt(form.capacity, 10) : null,
          banner_url: form.banner_url.trim() || null,
        }),
      });
      const data = await res.json();
      if (!data?.success) {
        setError(data?.message || 'Failed to save.');
        return;
      }
      setEvent(data.data.event);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const handleSubmit = async () => {
    if (!event) return;
    if (!confirm('Submit for admin review? You won’t be able to edit until they respond.')) return;
    setBusy('submit');
    try {
      // Save any unsaved edits first so the admin sees the latest version.
      await handleSave();
      const res = await fetch(`${API_URL}/api/organizer/events/${event.id}/submit`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!data?.success) {
        setError(data?.message || 'Failed to submit.');
        return;
      }
      router.push('/organizer/events');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(null);
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

  if (!event) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: '#07060A' }}
      >
        <div className="text-center">
          <p className="text-text-secondary mb-4">{error || 'Event not found.'}</p>
          <Link href="/organizer/events" className="text-accent-primary underline">
            Back to events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-12" style={{ backgroundColor: '#07060A' }}>
      <div className="max-w-3xl mx-auto">
        <Link
          href="/organizer/events"
          className="text-sm text-text-secondary hover:text-text-primary inline-flex items-center gap-1 mb-3"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to events
        </Link>
        <h1 className="text-3xl font-outfit font-bold text-text-primary">Edit event</h1>
        <p className="text-text-secondary font-plex-sans mt-1">
          Status: <span className="text-text-primary capitalize">{event.approval_status}</span>
        </p>

        {event.rejection_reason && (
          <div
            className="mt-4 p-3 rounded-lg text-sm"
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

        {!canEdit && (
          <div
            className="mt-4 p-3 rounded-lg text-sm"
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              color: '#f59e0b',
            }}
          >
            This event is <strong>{event.approval_status}</strong> and cannot be edited.
          </div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-start gap-3 p-3 rounded-lg border text-sm"
            style={{
              backgroundColor: 'rgba(255, 107, 107, 0.08)',
              borderColor: 'rgba(255, 107, 107, 0.3)',
              color: '#FF6B6B',
            }}
          >
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        <div
          className="mt-6 rounded-2xl border p-6"
          style={{
            backgroundColor: 'rgba(21, 18, 29, 0.5)',
            borderColor: 'rgba(196, 181, 253, 0.15)',
          }}
        >
          <fieldset disabled={!canEdit || busy !== null} className="space-y-5">
            <div>
              <label className={labelClass}>Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={inputClass}
                style={inputStyle}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Category</label>
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className={labelClass}>Capacity</label>
                <input
                  type="number"
                  min={1}
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Description</label>
              <textarea
                rows={5}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className={`${inputClass} resize-none`}
                style={inputStyle}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Start time *</label>
                <input
                  type="datetime-local"
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className={labelClass}>End time</label>
                <input
                  type="datetime-local"
                  value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Venue name</label>
              <input
                type="text"
                value={form.venue_name}
                onChange={(e) => setForm({ ...form, venue_name: e.target.value })}
                className={inputClass}
                style={inputStyle}
              />
            </div>

            <div>
              <label className={labelClass}>Venue address</label>
              <input
                type="text"
                value={form.venue_address}
                onChange={(e) => setForm({ ...form, venue_address: e.target.value })}
                className={inputClass}
                style={inputStyle}
              />
            </div>

            <div>
              <label className={labelClass}>Banner image URL</label>
              <input
                type="url"
                value={form.banner_url}
                onChange={(e) => setForm({ ...form, banner_url: e.target.value })}
                className={inputClass}
                style={inputStyle}
                placeholder="https://…"
              />
            </div>
          </fieldset>
        </div>

        {/* Ticket types — editor */}
        <TicketTypesEditor
          eventId={event.id}
          canEdit={!!canEdit}
          tickets={ticketTypes}
          onChange={setTicketTypes}
        />

        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={handleSave}
            disabled={!canEdit || busy !== null}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-inter font-semibold disabled:opacity-50"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', color: '#e2e8f0' }}
          >
            {busy === 'save' ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save changes
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canEdit || busy !== null}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-inter font-semibold disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #A78BFA 0%, #FF7AC6 100%)',
              color: '#0a0712',
            }}
          >
            {busy === 'submit' ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Submit for review
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ticket types editor (inline, used only by EditEventPage)
// ---------------------------------------------------------------------------

interface TicketDraft {
  name: string;
  description: string;
  price: string;
  quantity_total: string;
  per_order_limit: string;
  sale_start: string;
  sale_end: string;
  is_active: boolean;
}

const emptyDraft = (): TicketDraft => ({
  name: '',
  description: '',
  price: '',
  quantity_total: '',
  per_order_limit: '10',
  sale_start: '',
  sale_end: '',
  is_active: true,
});

const fromTicket = (t: TicketType): TicketDraft => ({
  name: t.name,
  description: t.description ?? '',
  price: String(t.price),
  quantity_total: String(t.quantity_total),
  per_order_limit: String(t.per_order_limit),
  sale_start: isoToLocal(t.sale_start),
  sale_end: isoToLocal(t.sale_end),
  is_active: t.is_active,
});

// Returns either { error } or { ok: true, body }. body is the JSON to POST/PATCH.
const validateDraft = (d: TicketDraft): { error: string } | { ok: true; body: Record<string, unknown> } => {
  const name = d.name.trim();
  if (!name) return { error: 'Name is required.' };
  const price = Number(d.price);
  if (!Number.isFinite(price) || price < 0) return { error: 'Price must be a non-negative number.' };
  const qty = parseInt(d.quantity_total, 10);
  if (!Number.isInteger(qty) || qty <= 0) return { error: 'Quantity must be a positive integer.' };
  const limit = parseInt(d.per_order_limit, 10);
  if (!Number.isInteger(limit) || limit <= 0) return { error: 'Per-order limit must be a positive integer.' };
  return {
    ok: true,
    body: {
      name,
      description: d.description.trim() || null,
      price,
      quantity_total: qty,
      per_order_limit: limit,
      sale_start: localToIso(d.sale_start),
      sale_end: localToIso(d.sale_end),
      is_active: d.is_active,
    },
  };
};

function TicketTypesEditor({
  eventId,
  canEdit,
  tickets,
  onChange,
}: {
  eventId: string;
  canEdit: boolean;
  tickets: TicketType[];
  onChange: (next: TicketType[]) => void;
}) {
  // The id of the row being edited, 'new' for the add form, or null for none.
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<TicketDraft>(emptyDraft());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const startEdit = (t: TicketType) => {
    setError('');
    setDraft(fromTicket(t));
    setEditing(t.id);
  };

  const startCreate = () => {
    setError('');
    setDraft(emptyDraft());
    setEditing('new');
  };

  const cancel = () => {
    setError('');
    setEditing(null);
  };

  const save = async () => {
    const v = validateDraft(draft);
    if ('error' in v) {
      setError(v.error);
      return;
    }
    setBusyId(editing);
    setError('');
    try {
      if (editing === 'new') {
        const res = await fetch(`${API_URL}/api/organizer/events/${eventId}/ticket-types`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(v.body),
        });
        const data = await res.json();
        if (!data?.success) {
          setError(data?.message || 'Failed to create.');
          return;
        }
        onChange([...tickets, data.data.ticket_type as TicketType]);
      } else if (editing) {
        const res = await fetch(
          `${API_URL}/api/organizer/events/${eventId}/ticket-types/${editing}`,
          {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(v.body),
          },
        );
        const data = await res.json();
        if (!data?.success) {
          setError(data?.message || 'Failed to save.');
          return;
        }
        const updated = data.data.ticket_type as TicketType;
        onChange(tickets.map((t) => (t.id === updated.id ? updated : t)));
      }
      setEditing(null);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (t: TicketType) => {
    if (t.quantity_sold > 0) {
      alert('This ticket type has bookings and cannot be deleted.');
      return;
    }
    if (!confirm(`Delete ticket type "${t.name}"?`)) return;
    setBusyId(t.id);
    setError('');
    try {
      const res = await fetch(
        `${API_URL}/api/organizer/events/${eventId}/ticket-types/${t.id}`,
        { method: 'DELETE', credentials: 'include' },
      );
      const data = await res.json();
      if (!data?.success) {
        setError(data?.message || 'Failed to delete.');
        return;
      }
      onChange(tickets.filter((x) => x.id !== t.id));
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      className="mt-6 rounded-2xl border p-6"
      style={{
        backgroundColor: 'rgba(21, 18, 29, 0.5)',
        borderColor: 'rgba(196, 181, 253, 0.15)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-outfit font-semibold text-text-primary flex items-center gap-2">
          <Tag className="w-5 h-5" style={{ color: '#A78BFA' }} />
          Ticket types
        </h2>
        {canEdit && editing !== 'new' && (
          <button
            type="button"
            onClick={startCreate}
            disabled={busyId !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-inter font-semibold disabled:opacity-50"
            style={{ backgroundColor: 'rgba(167, 139, 250, 0.12)', color: '#A78BFA' }}
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        )}
      </div>

      {error && (
        <div
          className="mb-3 p-2.5 rounded-md text-sm"
          style={{
            backgroundColor: 'rgba(255, 107, 107, 0.08)',
            border: '1px solid rgba(255, 107, 107, 0.25)',
            color: '#FF6B6B',
          }}
        >
          {error}
        </div>
      )}

      {tickets.length === 0 && editing !== 'new' && (
        <p className="text-text-secondary font-plex-sans text-sm">
          No ticket types yet.{canEdit ? ' Click "Add" to create one.' : ''}
        </p>
      )}

      <div className="space-y-2">
        {tickets.map((t) =>
          editing === t.id ? (
            <DraftRow
              key={t.id}
              draft={draft}
              setDraft={setDraft}
              busy={busyId === t.id}
              onSave={save}
              onCancel={cancel}
            />
          ) : (
            <DisplayRow
              key={t.id}
              ticket={t}
              canEdit={canEdit && editing === null}
              busy={busyId === t.id}
              onEdit={() => startEdit(t)}
              onDelete={() => remove(t)}
            />
          ),
        )}
        {editing === 'new' && (
          <DraftRow
            draft={draft}
            setDraft={setDraft}
            busy={busyId === 'new'}
            onSave={save}
            onCancel={cancel}
          />
        )}
      </div>

      {!canEdit && (
        <p className="text-xs text-text-secondary mt-3 font-plex-sans">
          Ticket types are read-only while the event is {/* status comes from parent */}
          not in draft/rejected state.
        </p>
      )}
    </div>
  );
}

function DisplayRow({
  ticket,
  canEdit,
  busy,
  onEdit,
  onDelete,
}: {
  ticket: TicketType;
  canEdit: boolean;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="rounded-xl p-3 flex items-center justify-between gap-3"
      style={{
        backgroundColor: 'rgba(30, 26, 43, 0.4)',
        border: '1px solid rgba(196, 181, 253, 0.08)',
      }}
    >
      <div className="min-w-0">
        <div className="text-text-primary font-inter font-semibold truncate">{ticket.name}</div>
        <div className="text-xs text-text-secondary">
          LKR {ticket.price} · {ticket.quantity_sold}/{ticket.quantity_total} sold · max {ticket.per_order_limit}/order
          {!ticket.is_active && ' · inactive'}
        </div>
      </div>
      {canEdit && (
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onEdit}
            disabled={busy}
            className="p-2 rounded-lg disabled:opacity-50"
            style={{ color: '#A78BFA' }}
            title="Edit"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={busy || ticket.quantity_sold > 0}
            className="p-2 rounded-lg disabled:opacity-30"
            style={{ color: '#FF6B6B' }}
            title={ticket.quantity_sold > 0 ? 'Cannot delete — has bookings' : 'Delete'}
          >
            {busy ? <Loader className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
        </div>
      )}
    </div>
  );
}

function DraftRow({
  draft,
  setDraft,
  busy,
  onSave,
  onCancel,
}: {
  draft: TicketDraft;
  setDraft: (d: TicketDraft) => void;
  busy: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  const upd = (patch: Partial<TicketDraft>) => setDraft({ ...draft, ...patch });
  const cell =
    'w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent-primary outline-none text-sm text-text-primary placeholder-text-muted font-plex-sans';
  const cellStyle: React.CSSProperties = { backgroundColor: 'rgba(30, 26, 43, 0.6)' };

  return (
    <div
      className="rounded-xl p-3 space-y-2"
      style={{
        backgroundColor: 'rgba(30, 26, 43, 0.6)',
        border: '1px solid rgba(167, 139, 250, 0.3)',
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          type="text"
          placeholder="Name (e.g. VIP)"
          value={draft.name}
          onChange={(e) => upd({ name: e.target.value })}
          className={cell}
          style={cellStyle}
        />
        <input
          type="number"
          min={0}
          step="0.01"
          placeholder="Price (LKR)"
          value={draft.price}
          onChange={(e) => upd({ price: e.target.value })}
          className={cell}
          style={cellStyle}
        />
        <input
          type="number"
          min={1}
          placeholder="Total quantity"
          value={draft.quantity_total}
          onChange={(e) => upd({ quantity_total: e.target.value })}
          className={cell}
          style={cellStyle}
        />
        <input
          type="number"
          min={1}
          placeholder="Per-order limit"
          value={draft.per_order_limit}
          onChange={(e) => upd({ per_order_limit: e.target.value })}
          className={cell}
          style={cellStyle}
        />
        <div>
          <label className="text-xs text-text-secondary block mb-0.5">Sale start (optional)</label>
          <input
            type="datetime-local"
            value={draft.sale_start}
            onChange={(e) => upd({ sale_start: e.target.value })}
            className={cell}
            style={cellStyle}
          />
        </div>
        <div>
          <label className="text-xs text-text-secondary block mb-0.5">Sale end (optional)</label>
          <input
            type="datetime-local"
            value={draft.sale_end}
            onChange={(e) => upd({ sale_end: e.target.value })}
            className={cell}
            style={cellStyle}
          />
        </div>
      </div>
      <input
        type="text"
        placeholder="Description (optional)"
        value={draft.description}
        onChange={(e) => upd({ description: e.target.value })}
        className={cell}
        style={cellStyle}
      />
      <div className="flex items-center justify-between">
        <label className="inline-flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={draft.is_active}
            onChange={(e) => upd({ is_active: e.target.checked })}
            className="accent-accent-primary"
          />
          Active
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-inter font-semibold disabled:opacity-50"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#e2e8f0' }}
          >
            <X className="w-3.5 h-3.5" />
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={busy}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-inter font-semibold disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #A78BFA 0%, #FF7AC6 100%)',
              color: '#0a0712',
            }}
          >
            {busy ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
