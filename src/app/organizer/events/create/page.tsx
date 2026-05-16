'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Loader,
  Plus,
  Send,
  Sparkles,
  Tag,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DetailsForm {
  title: string;
  category: string;
  description: string;
  start_time: string; // datetime-local value, converted to ISO on submit
  end_time: string;
  venue_name: string;
  venue_address: string;
  capacity: string; // string in the form, parsed to int on submit
}

interface TicketTypeForm {
  name: string;
  description: string;
  price: string;
  quantity_total: string;
  per_order_limit: string;
  sale_start: string; // datetime-local
  sale_end: string;
}

interface MediaForm {
  banner_url: string;
}

type Step = 0 | 1 | 2 | 3;

const STEPS = ['Details', 'Tickets', 'Media', 'Review'];

const emptyDetails: DetailsForm = {
  title: '',
  category: '',
  description: '',
  start_time: '',
  end_time: '',
  venue_name: '',
  venue_address: '',
  capacity: '',
};

const emptyTicket = (): TicketTypeForm => ({
  name: '',
  description: '',
  price: '',
  quantity_total: '',
  per_order_limit: '10',
  sale_start: '',
  sale_end: '',
});

const emptyMedia: MediaForm = { banner_url: '' };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// datetime-local field returns "YYYY-MM-DDTHH:mm" in local time. Convert to ISO.
const localToIso = (v: string): string | null => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

const inputClass =
  'w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-accent-primary focus:border-accent-primary outline-none transition-all text-text-primary placeholder-text-muted font-plex-sans';
const inputStyle: React.CSSProperties = { backgroundColor: 'rgba(30, 26, 43, 0.6)' };
const labelClass = 'block text-sm font-inter font-semibold mb-2 text-text-primary';

// Build the API payload from the wizard's local state.
const buildPayload = (details: DetailsForm, tickets: TicketTypeForm[], media: MediaForm) => ({
  title: details.title.trim(),
  description: details.description.trim() || null,
  category: details.category.trim() || null,
  venue_name: details.venue_name.trim() || null,
  venue_address: details.venue_address.trim() || null,
  start_time: localToIso(details.start_time),
  end_time: localToIso(details.end_time),
  capacity: details.capacity ? parseInt(details.capacity, 10) : null,
  banner_url: media.banner_url.trim() || null,
  ticket_types: tickets.map((t) => ({
    name: t.name.trim(),
    description: t.description.trim() || null,
    price: t.price === '' ? 0 : Number(t.price),
    quantity_total: t.quantity_total === '' ? 0 : parseInt(t.quantity_total, 10),
    per_order_limit: t.per_order_limit === '' ? 10 : parseInt(t.per_order_limit, 10),
    sale_start: localToIso(t.sale_start),
    sale_end: localToIso(t.sale_end),
  })),
});

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CreateEventPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [step, setStep] = useState<Step>(0);
  const [details, setDetails] = useState<DetailsForm>(emptyDetails);
  const [tickets, setTickets] = useState<TicketTypeForm[]>([emptyTicket()]);
  const [media, setMedia] = useState<MediaForm>(emptyMedia);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<null | 'draft' | 'submit'>(null);

  // Guard: must be organizer or superadmin
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth/login?redirect=/organizer/events/create');
      return;
    }
    const role = (user as { role?: string }).role || '';
    if (!['organizer', 'superadmin'].includes(role)) {
      router.push('/become-organizer');
    }
  }, [authLoading, user, router]);

  // -------------------- per-step validation --------------------

  const validateStep = (s: Step): string => {
    if (s === 0) {
      if (!details.title.trim()) return 'Title is required.';
      if (!details.start_time) return 'Start time is required.';
      if (details.end_time && localToIso(details.end_time)! < localToIso(details.start_time)!) {
        return 'End time must be after start time.';
      }
    }
    if (s === 1) {
      if (tickets.length === 0) return 'Add at least one ticket type.';
      for (const [i, t] of tickets.entries()) {
        if (!t.name.trim()) return `Ticket #${i + 1}: name is required.`;
        const price = Number(t.price);
        if (!Number.isFinite(price) || price < 0) {
          return `Ticket #${i + 1}: price must be a non-negative number.`;
        }
        const qty = parseInt(t.quantity_total, 10);
        if (!Number.isInteger(qty) || qty <= 0) {
          return `Ticket #${i + 1}: quantity must be a positive integer.`;
        }
        const limit = parseInt(t.per_order_limit, 10);
        if (!Number.isInteger(limit) || limit <= 0) {
          return `Ticket #${i + 1}: per-order limit must be a positive integer.`;
        }
      }
    }
    return '';
  };

  const goNext = () => {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setStep(((step + 1) as Step));
  };

  const goBack = () => {
    setError('');
    setStep(((step - 1) as Step));
  };

  // -------------------- save / submit --------------------

  const persist = async (intent: 'draft' | 'submit') => {
    // Validate steps 0 and 1 regardless of which step we're on (review covers all).
    for (const s of [0, 1] as Step[]) {
      const err = validateStep(s);
      if (err) {
        setError(err);
        setStep(s);
        return;
      }
    }
    setError('');
    setBusy(intent);

    try {
      const payload = buildPayload(details, tickets, media);
      const createRes = await fetch(`${API_URL}/api/organizer/events`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const createData = await createRes.json();
      if (!createData?.success) {
        setError(createData?.message || 'Failed to create event.');
        return;
      }
      const eventId = createData.data.event.id as string;

      if (intent === 'submit') {
        const submitRes = await fetch(
          `${API_URL}/api/organizer/events/${eventId}/submit`,
          { method: 'POST', credentials: 'include' },
        );
        const submitData = await submitRes.json();
        if (!submitData?.success) {
          // Saved as draft but submit failed — still navigate to list so they can retry.
          setError(submitData?.message || 'Saved as draft but submit failed.');
          router.push('/organizer/events');
          return;
        }
      }
      router.push('/organizer/events');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  // -------------------- render --------------------

  if (authLoading) {
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
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/organizer/events"
            className="text-sm text-text-secondary hover:text-text-primary inline-flex items-center gap-1 mb-3"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to events
          </Link>
          <h1 className="text-3xl font-outfit font-bold text-text-primary">Create event</h1>
          <p className="text-text-secondary font-plex-sans mt-1">
            Save as draft anytime. Submit when you’re ready for admin review.
          </p>
        </div>

        <StepIndicator current={step} />

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
          {step === 0 && <DetailsStep value={details} onChange={setDetails} />}
          {step === 1 && <TicketsStep value={tickets} onChange={setTickets} />}
          {step === 2 && <MediaStep value={media} onChange={setMedia} />}
          {step === 3 && <ReviewStep details={details} tickets={tickets} media={media} />}
        </div>

        {/* Footer / nav */}
        <div className="flex items-center justify-between gap-3 mt-6">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-inter font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              color: 'var(--text-primary, #fff)',
            }}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-inter font-semibold"
              style={{
                background: 'linear-gradient(135deg, #A78BFA 0%, #FF7AC6 100%)',
                color: '#0a0712',
              }}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => persist('draft')}
                disabled={busy !== null}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-inter font-semibold disabled:opacity-50"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', color: '#e2e8f0' }}
              >
                {busy === 'draft' ? <Loader className="w-4 h-4 animate-spin" /> : null}
                Save as draft
              </button>
              <button
                type="button"
                onClick={() => persist('submit')}
                disabled={busy !== null}
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
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step components
// ---------------------------------------------------------------------------

function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div
              className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-inter font-semibold shrink-0"
              style={
                done
                  ? { backgroundColor: '#10b981', color: '#0a0712' }
                  : active
                    ? {
                        background: 'linear-gradient(135deg, #A78BFA 0%, #FF7AC6 100%)',
                        color: '#0a0712',
                      }
                    : { backgroundColor: 'rgba(255,255,255,0.08)', color: '#94a3b8' }
              }
            >
              {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <div className="flex-1">
              <div
                className={`text-xs font-inter font-semibold ${
                  active ? 'text-text-primary' : 'text-text-secondary'
                }`}
              >
                {label}
              </div>
              <div className="h-0.5 mt-1.5 rounded-full" style={{ backgroundColor: done ? '#10b981' : active ? '#A78BFA' : 'rgba(255,255,255,0.06)' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DetailsStep({
  value,
  onChange,
}: {
  value: DetailsForm;
  onChange: (v: DetailsForm) => void;
}) {
  const upd = (patch: Partial<DetailsForm>) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-outfit font-semibold text-text-primary flex items-center gap-2">
        <Sparkles className="w-5 h-5" style={{ color: '#A78BFA' }} />
        Event details
      </h2>

      <div>
        <label className={labelClass} htmlFor="title">
          Title *
        </label>
        <input
          id="title"
          type="text"
          value={value.title}
          onChange={(e) => upd({ title: e.target.value })}
          className={inputClass}
          style={inputStyle}
          placeholder="Indie Music Night"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={labelClass} htmlFor="category">
            Category
          </label>
          <input
            id="category"
            type="text"
            value={value.category}
            onChange={(e) => upd({ category: e.target.value })}
            className={inputClass}
            style={inputStyle}
            placeholder="music, theatre, sports…"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="capacity">
            Capacity
          </label>
          <input
            id="capacity"
            type="number"
            min={1}
            value={value.capacity}
            onChange={(e) => upd({ capacity: e.target.value })}
            className={inputClass}
            style={inputStyle}
            placeholder="e.g. 300"
          />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="description">
          Description
        </label>
        <textarea
          id="description"
          rows={5}
          value={value.description}
          onChange={(e) => upd({ description: e.target.value })}
          className={`${inputClass} resize-none`}
          style={inputStyle}
          placeholder="What should attendees know? Lineup, doors-open time, refund policy…"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={labelClass} htmlFor="start_time">
            Start time *
          </label>
          <input
            id="start_time"
            type="datetime-local"
            value={value.start_time}
            onChange={(e) => upd({ start_time: e.target.value })}
            className={inputClass}
            style={inputStyle}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="end_time">
            End time
          </label>
          <input
            id="end_time"
            type="datetime-local"
            value={value.end_time}
            onChange={(e) => upd({ end_time: e.target.value })}
            className={inputClass}
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="venue_name">
          Venue name
        </label>
        <input
          id="venue_name"
          type="text"
          value={value.venue_name}
          onChange={(e) => upd({ venue_name: e.target.value })}
          className={inputClass}
          style={inputStyle}
          placeholder="The Warehouse Project"
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="venue_address">
          Venue address
        </label>
        <input
          id="venue_address"
          type="text"
          value={value.venue_address}
          onChange={(e) => upd({ venue_address: e.target.value })}
          className={inputClass}
          style={inputStyle}
          placeholder="123 Galle Rd, Colombo 03"
        />
      </div>
    </div>
  );
}

function TicketsStep({
  value,
  onChange,
}: {
  value: TicketTypeForm[];
  onChange: (v: TicketTypeForm[]) => void;
}) {
  const updTicket = (idx: number, patch: Partial<TicketTypeForm>) => {
    const next = value.slice();
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-outfit font-semibold text-text-primary flex items-center gap-2">
          <Tag className="w-5 h-5" style={{ color: '#A78BFA' }} />
          Ticket types
        </h2>
        <button
          type="button"
          onClick={() => onChange([...value, emptyTicket()])}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-inter font-semibold"
          style={{ backgroundColor: 'rgba(167, 139, 250, 0.12)', color: '#A78BFA' }}
        >
          <Plus className="w-4 h-4" />
          Add ticket type
        </button>
      </div>

      <p className="text-sm text-text-secondary font-plex-sans">
        Each ticket type can have its own price, quantity, and sale window.
      </p>

      <div className="space-y-4">
        {value.map((t, idx) => (
          <div
            key={idx}
            className="rounded-xl border p-4"
            style={{
              backgroundColor: 'rgba(30, 26, 43, 0.4)',
              borderColor: 'rgba(196, 181, 253, 0.1)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-inter font-semibold text-text-secondary">
                Ticket #{idx + 1}
              </span>
              {value.length > 1 && (
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, i) => i !== idx))}
                  className="p-1.5 rounded-lg"
                  style={{ color: '#FF6B6B' }}
                  title="Remove this ticket type"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Name *</label>
                <input
                  type="text"
                  value={t.name}
                  onChange={(e) => updTicket(idx, { name: e.target.value })}
                  className={inputClass}
                  style={inputStyle}
                  placeholder="General, VIP, Early Bird…"
                />
              </div>
              <div>
                <label className={labelClass}>Price (LKR) *</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={t.price}
                  onChange={(e) => updTicket(idx, { price: e.target.value })}
                  className={inputClass}
                  style={inputStyle}
                  placeholder="2500"
                />
              </div>
              <div>
                <label className={labelClass}>Total quantity *</label>
                <input
                  type="number"
                  min={1}
                  value={t.quantity_total}
                  onChange={(e) => updTicket(idx, { quantity_total: e.target.value })}
                  className={inputClass}
                  style={inputStyle}
                  placeholder="250"
                />
              </div>
              <div>
                <label className={labelClass}>Per-order limit</label>
                <input
                  type="number"
                  min={1}
                  value={t.per_order_limit}
                  onChange={(e) => updTicket(idx, { per_order_limit: e.target.value })}
                  className={inputClass}
                  style={inputStyle}
                  placeholder="10"
                />
              </div>
              <div>
                <label className={labelClass}>Sale start (optional)</label>
                <input
                  type="datetime-local"
                  value={t.sale_start}
                  onChange={(e) => updTicket(idx, { sale_start: e.target.value })}
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className={labelClass}>Sale end (optional)</label>
                <input
                  type="datetime-local"
                  value={t.sale_end}
                  onChange={(e) => updTicket(idx, { sale_end: e.target.value })}
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Description (optional)</label>
                <input
                  type="text"
                  value={t.description}
                  onChange={(e) => updTicket(idx, { description: e.target.value })}
                  className={inputClass}
                  style={inputStyle}
                  placeholder="What's included with this ticket?"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MediaStep({
  value,
  onChange,
}: {
  value: MediaForm;
  onChange: (v: MediaForm) => void;
}) {
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-outfit font-semibold text-text-primary flex items-center gap-2">
        <ImageIcon className="w-5 h-5" style={{ color: '#A78BFA' }} />
        Media
      </h2>

      <p className="text-sm text-text-secondary font-plex-sans">
        Paste a public image URL for now. Direct upload to Supabase Storage is coming in a later step.
      </p>

      <div>
        <label className={labelClass} htmlFor="banner_url">
          Banner image URL
        </label>
        <input
          id="banner_url"
          type="url"
          value={value.banner_url}
          onChange={(e) => onChange({ banner_url: e.target.value })}
          className={inputClass}
          style={inputStyle}
          placeholder="https://…"
        />
      </div>

      {value.banner_url && (
        // Plain <img> avoids needing the host in next.config remotePatterns.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value.banner_url}
          alt="Banner preview"
          className="w-full rounded-xl border"
          style={{ borderColor: 'rgba(196, 181, 253, 0.15)' }}
          onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
        />
      )}
    </div>
  );
}

function ReviewStep({
  details,
  tickets,
  media,
}: {
  details: DetailsForm;
  tickets: TicketTypeForm[];
  media: MediaForm;
}) {
  const total = tickets.reduce((sum, t) => sum + (parseInt(t.quantity_total, 10) || 0), 0);
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-outfit font-semibold text-text-primary flex items-center gap-2">
        <Check className="w-5 h-5" style={{ color: '#10b981' }} />
        Review
      </h2>

      <ReviewBlock title="Event">
        <Row label="Title" value={details.title || '—'} />
        <Row label="Category" value={details.category || '—'} />
        <Row label="Starts" value={details.start_time || '—'} />
        <Row label="Ends" value={details.end_time || '—'} />
        <Row label="Venue" value={details.venue_name || '—'} />
        <Row label="Address" value={details.venue_address || '—'} />
        <Row label="Capacity" value={details.capacity || '—'} />
      </ReviewBlock>

      <ReviewBlock title={`Ticket types (${tickets.length}) · ${total} total seats`}>
        {tickets.map((t, i) => (
          <div key={i} className="text-sm font-plex-sans py-2">
            <span className="text-text-primary font-inter font-semibold">
              {t.name || `Ticket #${i + 1}`}
            </span>
            <span className="text-text-secondary">
              {' '}
              · LKR {t.price || '0'} · {t.quantity_total || '0'} seats · max {t.per_order_limit || '10'}/order
            </span>
          </div>
        ))}
      </ReviewBlock>

      <ReviewBlock title="Media">
        <Row label="Banner URL" value={media.banner_url || '—'} />
      </ReviewBlock>

      <div
        className="text-sm font-plex-sans p-3 rounded-lg"
        style={{ backgroundColor: 'rgba(167, 139, 250, 0.08)', color: '#A78BFA' }}
      >
        "Save as draft" keeps it private. "Submit for review" sends it to admins — you won't be able to edit until they respond.
      </div>
    </div>
  );
}

function ReviewBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        backgroundColor: 'rgba(30, 26, 43, 0.4)',
        border: '1px solid rgba(196, 181, 253, 0.08)',
      }}
    >
      <h3 className="text-sm font-inter font-semibold text-text-secondary uppercase tracking-wide mb-3">
        {title}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3 text-sm font-plex-sans">
      <span className="text-text-secondary w-28 shrink-0">{label}</span>
      <span className="text-text-primary truncate">{value}</span>
    </div>
  );
}
