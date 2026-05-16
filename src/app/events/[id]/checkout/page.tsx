'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  ChevronLeft,
  Loader,
  MapPin,
  Minus,
  Plus,
  Ticket,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface TicketType {
  id: string;
  name: string;
  description: string | null;
  price: number;
  quantity_total: number;
  quantity_sold: number;
  per_order_limit: number;
}

interface EventDetail {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  venue_name: string | null;
  venue_address: string | null;
  start_time: string | null;
  date: string | null;
  banner_url: string | null;
  approval_status: string;
  ticket_types: TicketType[];
}

const inputClass =
  'w-full px-4 py-3 border border-border rounded-xl focus:ring-2 focus:ring-accent-primary outline-none transition-all text-text-primary placeholder-text-muted font-plex-sans';
const inputStyle: React.CSSProperties = { backgroundColor: 'rgba(30, 26, 43, 0.6)' };
const labelClass = 'block text-sm font-inter font-semibold mb-2 text-text-primary';

export default function CheckoutPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const eventId = params?.id;
  const { user, loading: authLoading } = useAuth();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [selectedTtId, setSelectedTtId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [attendee, setAttendee] = useState({ name: '', email: '', phone: '' });

  // Auth guard — redirect to login carrying the return path
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/auth/login?redirect=/events/${eventId}/checkout`);
    }
  }, [authLoading, user, eventId, router]);

  // Pre-fill attendee from logged-in user profile (Dashboard → Profile updates these).
  useEffect(() => {
    if (user) {
      setAttendee({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  // Load event + ticket types
  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/events/${eventId}`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (cancelled) return;
        if (!data?.success) {
          setLoadError(data?.message || 'Event not found.');
          return;
        }
        const e = data.data.event as EventDetail;
        setEvent(e);
        // Auto-select the first ticket type with availability
        const firstAvail = e.ticket_types?.find(
          (t) => t.quantity_total - t.quantity_sold > 0,
        );
        if (firstAvail) setSelectedTtId(firstAvail.id);
      } catch {
        if (!cancelled) setLoadError('Network error loading event.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const selectedTt = event?.ticket_types?.find((t) => t.id === selectedTtId) ?? null;
  const available = selectedTt ? selectedTt.quantity_total - selectedTt.quantity_sold : 0;
  const maxQty = selectedTt ? Math.min(selectedTt.per_order_limit, available) : 1;
  const total = selectedTt ? selectedTt.price * quantity : 0;

  // Clamp quantity if it exceeds the new max after switching ticket type
  useEffect(() => {
    if (selectedTt && quantity > maxQty) setQuantity(Math.max(1, maxQty));
  }, [selectedTtId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    if (!selectedTt) {
      setSubmitError('Pick a ticket type first.');
      return;
    }
    if (quantity < 1 || quantity > maxQty) {
      setSubmitError(`Quantity must be between 1 and ${maxQty}.`);
      return;
    }
    if (!attendee.email) {
      setSubmitError('Email is required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/checkout`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: event!.id,
          ticket_type_id: selectedTt.id,
          quantity,
          attendee_info: {
            name: attendee.name.trim() || undefined,
            email: attendee.email.trim() || undefined,
            phone: attendee.phone.trim() || undefined,
          },
        }),
      });
      const data = await res.json();
      if (!data?.success) {
        setSubmitError(data?.message || 'Checkout failed.');
        return;
      }
      router.push(`/bookings/event/${data.data.booking.id}`);
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
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

  if (loadError || !event) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: '#07060A' }}
      >
        <div className="text-center">
          <p className="text-text-secondary mb-4">{loadError || 'Event not found.'}</p>
          <Link href="/events" className="text-accent-primary underline">
            Browse events
          </Link>
        </div>
      </div>
    );
  }

  if (event.approval_status !== 'approved') {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: '#07060A' }}
      >
        <div className="text-center max-w-md">
          <p className="text-text-primary mb-2">{event.title}</p>
          <p className="text-text-secondary mb-4">This event isn't open for booking.</p>
          <Link href="/events" className="text-accent-primary underline">
            Browse other events
          </Link>
        </div>
      </div>
    );
  }

  const noTickets = !event.ticket_types || event.ticket_types.length === 0;
  const when = event.start_time || event.date;

  return (
    <div className="min-h-screen px-4 py-12" style={{ backgroundColor: '#07060A' }}>
      <div className="max-w-3xl mx-auto">
        <Link
          href={`/events/${event.id}`}
          className="text-sm text-text-secondary hover:text-text-primary inline-flex items-center gap-1 mb-3"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to event
        </Link>
        <h1 className="text-3xl font-outfit font-bold text-text-primary mb-1">Checkout</h1>
        <p className="text-text-secondary font-plex-sans">{event.title}</p>

        {/* Event summary */}
        <div
          className="mt-6 p-5 rounded-2xl border flex items-start gap-4"
          style={{
            backgroundColor: 'rgba(21, 18, 29, 0.5)',
            borderColor: 'rgba(196, 181, 253, 0.15)',
          }}
        >
          {event.banner_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.banner_url}
              alt=""
              className="w-24 h-24 object-cover rounded-lg shrink-0"
              onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
            />
          )}
          <div className="min-w-0">
            <div className="text-text-secondary text-sm space-y-1">
              {when && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(when).toLocaleString()}
                </div>
              )}
              {(event.venue_name || event.venue_address) && (
                <div className="flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 mt-0.5" />
                  <span>{[event.venue_name, event.venue_address].filter(Boolean).join(' · ')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {noTickets ? (
          <div
            className="mt-6 p-12 rounded-2xl border text-center"
            style={{
              backgroundColor: 'rgba(21, 18, 29, 0.5)',
              borderColor: 'rgba(196, 181, 253, 0.15)',
            }}
          >
            <Ticket className="w-12 h-12 mx-auto mb-3 text-text-secondary" />
            <h2 className="text-xl font-outfit font-semibold text-text-primary mb-1">
              No tickets on sale
            </h2>
            <p className="text-text-secondary font-plex-sans">
              The organizer hasn't opened any ticket types for sale yet.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleCheckout}
            className="mt-6 space-y-6"
          >
            {/* Ticket type picker */}
            <section
              className="p-6 rounded-2xl border"
              style={{
                backgroundColor: 'rgba(21, 18, 29, 0.5)',
                borderColor: 'rgba(196, 181, 253, 0.15)',
              }}
            >
              <h2 className="text-lg font-outfit font-semibold text-text-primary flex items-center gap-2 mb-3">
                <Ticket className="w-5 h-5" style={{ color: '#A78BFA' }} />
                Pick a ticket type
              </h2>
              <div className="space-y-2">
                {event.ticket_types.map((t) => {
                  const left = t.quantity_total - t.quantity_sold;
                  const soldOut = left <= 0;
                  const selected = selectedTtId === t.id;
                  return (
                    <button
                      type="button"
                      key={t.id}
                      disabled={soldOut}
                      onClick={() => setSelectedTtId(t.id)}
                      className={`w-full text-left rounded-xl p-4 border transition disabled:opacity-50 disabled:cursor-not-allowed ${
                        selected ? 'ring-2 ring-accent-primary' : ''
                      }`}
                      style={{
                        backgroundColor: selected
                          ? 'rgba(167, 139, 250, 0.12)'
                          : 'rgba(30, 26, 43, 0.4)',
                        borderColor: selected
                          ? 'rgba(167, 139, 250, 0.4)'
                          : 'rgba(196, 181, 253, 0.08)',
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-text-primary font-inter font-semibold">
                            {t.name}
                          </div>
                          {t.description && (
                            <div className="text-xs text-text-secondary mt-0.5">
                              {t.description}
                            </div>
                          )}
                          <div className="text-xs text-text-secondary mt-1">
                            {soldOut ? 'Sold out' : `${left} left · max ${t.per_order_limit}/order`}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-text-primary font-inter font-semibold">
                            LKR {t.price.toLocaleString()}
                          </div>
                          {selected && (
                            <div className="text-xs mt-0.5 inline-flex items-center gap-1" style={{ color: '#A78BFA' }}>
                              <CheckCircle className="w-3.5 h-3.5" />
                              Selected
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Quantity + attendee */}
            {selectedTt && (
              <section
                className="p-6 rounded-2xl border space-y-5"
                style={{
                  backgroundColor: 'rgba(21, 18, 29, 0.5)',
                  borderColor: 'rgba(196, 181, 253, 0.15)',
                }}
              >
                <div>
                  <label className={labelClass}>Quantity</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      aria-label="Decrease quantity"
                      className="h-10 w-10 rounded-lg flex items-center justify-center disabled:opacity-40"
                      style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#e2e8f0' }}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <div className="w-12 text-center text-text-primary font-inter font-semibold">
                      {quantity}
                    </div>
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.min(maxQty, quantity + 1))}
                      disabled={quantity >= maxQty}
                      aria-label="Increase quantity"
                      className="h-10 w-10 rounded-lg flex items-center justify-center disabled:opacity-40"
                      style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#e2e8f0' }}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <div className="text-xs text-text-secondary ml-2">
                      max {maxQty}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className={`${labelClass} text-base`}>Attendee details</h3>
                  <p className="text-xs text-text-secondary -mt-1 mb-3">
                    We'll send the e-tickets to this email.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Name"
                      value={attendee.name}
                      onChange={(e) => setAttendee({ ...attendee, name: e.target.value })}
                      className={inputClass}
                      style={inputStyle}
                    />
                    <input
                      type="email"
                      placeholder="Email *"
                      required
                      value={attendee.email}
                      onChange={(e) => setAttendee({ ...attendee, email: e.target.value })}
                      className={inputClass}
                      style={inputStyle}
                    />
                    <input
                      type="tel"
                      placeholder="Phone (optional)"
                      value={attendee.phone}
                      onChange={(e) => setAttendee({ ...attendee, phone: e.target.value })}
                      className={`${inputClass} sm:col-span-2`}
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* Total */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="text-text-secondary font-plex-sans">Total</div>
                  <div className="text-2xl font-outfit font-bold text-text-primary">
                    LKR {total.toLocaleString()}
                  </div>
                </div>
              </section>
            )}

            {submitError && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 p-3 rounded-lg border text-sm"
                style={{
                  backgroundColor: 'rgba(255, 107, 107, 0.08)',
                  borderColor: 'rgba(255, 107, 107, 0.3)',
                  color: '#FF6B6B',
                }}
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{submitError}</span>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={!selectedTt || submitting}
              className="w-full py-3 rounded-xl font-inter font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #A78BFA 0%, #FF7AC6 100%)',
                color: '#0a0712',
              }}
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2 justify-center">
                  <Loader className="w-4 h-4 animate-spin" />
                  Reserving tickets…
                </span>
              ) : (
                'Continue to confirmation'
              )}
            </button>
            <p className="text-xs text-text-secondary text-center">
              Payment integration ships in the next step. For now this creates a pending booking.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
