'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  CheckCircle,
  ChevronLeft,
  Clock,
  Loader,
  MapPin,
  Ticket,
  XCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface Booking {
  id: string;
  booking_reference: string;
  number_of_tickets: number;
  ticket_price: number | string;
  total_amount: number | string;
  payment_status: string;
  status: string;
  created_at: string;
  attendee_info: { name?: string; email?: string; phone?: string | null } | null;
}

interface EventSummary {
  id: string;
  title: string;
  start_time: string | null;
  venue_name: string | null;
}

interface TicketTypeSummary {
  id: string;
  name: string;
  price: number;
}

interface BookingResponse {
  booking: Booking;
  event: EventSummary | null;
  ticket_type: TicketTypeSummary | null;
  // seating_mode is fetched separately from /api/events/:id since the booking
  // payload doesn't include it. May be undefined until the second fetch lands.
  seating_mode?: string | null;
}

interface SeatTicket {
  id: string;
  check_in_status: string | null;
  checked_in_at: string | null;
  qr_image_url: string | null;
  seat: {
    id: string;
    seat_label: string | null;
    section: string | null;
    row_label: string | null;
    seat_number: string | null;
  } | null;
}

export default function EventBookingDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const bookingId = params?.id;
  const { user, loading: authLoading } = useAuth();

  const [paymentResult, setPaymentResult] = useState<string | null>(null);
  const [data, setData] = useState<BookingResponse | null>(null);
  const [seatingMode, setSeatingMode] = useState<string | null>(null);
  const [seatTickets, setSeatTickets] = useState<SeatTicket[] | null>(null);
  const [seatTicketsError, setSeatTicketsError] = useState('');
  const [downloadingSeatId, setDownloadingSeatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [paying, setPaying] = useState(false);
  const [downloadingTicket, setDownloadingTicket] = useState(false);
  const [devMarkingPaid, setDevMarkingPaid] = useState(false);
  // Tiny convenience for local dev so we don't have to run ngrok to test the
  // payment-confirmed flow. Backend gates the endpoint on NODE_ENV !== production.
  const isDev = process.env.NODE_ENV !== 'production';

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/auth/login?redirect=/bookings/event/${bookingId}`);
    }
  }, [authLoading, user, bookingId, router]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('payment');
    if (p) setPaymentResult(p);
  }, []);

  const fetchBooking = async () => {
    if (!bookingId) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/checkout/${bookingId}`, {
        credentials: 'include',
      });
      const body = await res.json();
      if (!body?.success) {
        setError(body?.message || 'Booking not found.');
        return;
      }
      const payload = body.data as BookingResponse;
      setData(payload);

      // Booking payload doesn't include seating_mode — pull it from the public
      // event endpoint so we can branch the ticket UI for reserved bookings.
      const eventId = payload.event?.id;
      if (eventId) {
        try {
          const evtRes = await fetch(`${API_URL}/api/events/${eventId}`);
          const evtBody = await evtRes.json();
          if (evtBody?.success) {
            setSeatingMode(evtBody.data?.event?.seating_mode ?? null);
          }
        } catch {
          /* non-fatal — UI just falls back to the legacy single-ticket flow */
        }
      }
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  };

  // Reserved + confirmed bookings get one ticket row per seat. Fetch them once
  // we know both conditions are true.
  const fetchSeatTickets = async () => {
    if (!bookingId) return;
    setSeatTicketsError('');
    try {
      const res = await fetch(`${API_URL}/api/checkout/${bookingId}/tickets`, {
        credentials: 'include',
      });
      const body = await res.json();
      if (!body?.success) {
        setSeatTicketsError(body?.message || 'Failed to load tickets.');
        return;
      }
      setSeatTickets(body.data.tickets as SeatTicket[]);
    } catch {
      setSeatTicketsError('Network error loading tickets.');
    }
  };

  useEffect(() => {
    const isReservedConfirmed =
      seatingMode === 'reserved' && data?.booking?.status === 'Confirmed';
    if (isReservedConfirmed && !seatTickets && !seatTicketsError) {
      fetchSeatTickets();
    }
  }, [seatingMode, data?.booking?.status, seatTickets, seatTicketsError]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDownloadSeatTicket = async (ticket: SeatTicket) => {
    if (!data?.booking) return;
    setDownloadingSeatId(ticket.id);
    try {
      const res = await fetch(
        `${API_URL}/api/checkout/${data.booking.id}/tickets/${ticket.id}/png`,
        { credentials: 'include' },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.message || 'Failed to download ticket.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const label = ticket.seat?.seat_label || ticket.id.slice(0, 8);
      a.download = `ticket-${data.booking.booking_reference}-${label}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('Network error downloading ticket.');
    } finally {
      setDownloadingSeatId(null);
    }
  };

  useEffect(() => {
    if (user) fetchBooking();
  }, [user, bookingId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancel = async () => {
    if (!data?.booking) return;
    if (!confirm('Cancel this booking? The tickets will be released back to inventory.')) return;
    setCancelling(true);
    try {
      const res = await fetch(`${API_URL}/api/checkout/${data.booking.id}/cancel`, {
        method: 'POST',
        credentials: 'include',
      });
      const body = await res.json();
      if (!body?.success) {
        setError(body?.message || 'Failed to cancel.');
        return;
      }
      await fetchBooking();
    } catch {
      setError('Network error.');
    } finally {
      setCancelling(false);
    }
  };

  const handleDownloadTicket = async () => {
    if (!data?.booking) return;
    setDownloadingTicket(true);
    try {
      const res = await fetch(`${API_URL}/api/checkout/${data.booking.id}/ticket`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.message || 'Failed to download ticket.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ticket-${data.booking.booking_reference}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('Network error downloading ticket.');
    } finally {
      setDownloadingTicket(false);
    }
  };

  const handleDevMarkPaid = async () => {
    if (!data?.booking) return;
    if (!confirm('Simulate a successful PayHere payment for this booking? (Dev only)')) return;
    setDevMarkingPaid(true);
    try {
      const res = await fetch(
        `${API_URL}/api/payments/dev/mark-event-paid/${data.booking.id}`,
        { method: 'POST', credentials: 'include' },
      );
      const body = await res.json();
      if (!body?.success) {
        setError(body?.message || 'Failed to mark as paid.');
        return;
      }
      await fetchBooking();
    } catch {
      setError('Network error.');
    } finally {
      setDevMarkingPaid(false);
    }
  };

  const handlePay = async () => {
    if (!data?.booking) return;
    setPaying(true);
    try {
      const res = await fetch(`${API_URL}/api/payments/initialize-event`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: data.booking.id }),
      });
      const body = await res.json();
      if (!body?.success) {
        setError(body?.message || 'Failed to initialize payment.');
        return;
      }

      // Build and auto-submit a hidden form to PayHere's hosted checkout
      const { checkoutUrl, paymentData } = body.data;
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = checkoutUrl;

      Object.entries(paymentData as Record<string, string | boolean | number>).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = String(value);
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
    } catch {
      setError('Network error. Please try again.');
      setPaying(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="text-center max-w-md">
          <p className="text-muted-foreground mb-4">{error || 'Booking not found.'}</p>
          <Link href="/events" className="text-primary underline">
            Browse events
          </Link>
        </div>
      </div>
    );
  }

  const { booking, event, ticket_type } = data;
  const isPending = booking.status === 'Pending';
  const isCancelled = booking.status === 'Cancelled';
  const isConfirmed = booking.status === 'Confirmed';

  return (
    <div className="min-h-screen px-4 py-12 bg-background">
      <div className="max-w-2xl mx-auto">
        {/* Payment result banners (shown after PayHere redirect-back) */}
        {paymentResult === 'success' && !isConfirmed && (
          <div className="mb-4 p-3 rounded-xl text-sm font-inter border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
            Payment received — your booking is being confirmed. This page will update shortly.
          </div>
        )}
        {paymentResult === 'cancelled' && (
          <div className="mb-4 p-3 rounded-xl text-sm font-inter border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400">
            Payment was cancelled. Your tickets are still reserved — you can try again below.
          </div>
        )}

        <Link
          href="/events"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-3"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to events
        </Link>

        {/* Status hero */}
        <div className="p-6 rounded-2xl border border-border bg-card mb-6">
          {isConfirmed && (
            <StatusHero
              tone="success"
              icon={<CheckCircle className="w-6 h-6" />}
              title="Booking confirmed"
              body="Your e-tickets will be emailed to you shortly."
            />
          )}
          {isPending && (
            <StatusHero
              tone="warning"
              icon={<Clock className="w-6 h-6" />}
              title="Payment pending"
              body="Your tickets are reserved. Complete payment to confirm."
            />
          )}
          {isCancelled && (
            <StatusHero
              tone="danger"
              icon={<XCircle className="w-6 h-6" />}
              title="Booking cancelled"
              body="Inventory has been released. You can book again any time."
            />
          )}

          <div className="mt-4 text-xs text-muted-foreground font-mono">
            Reference: {booking.booking_reference}
          </div>
        </div>

        {/* Order summary */}
        <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
          {event && (
            <div>
              <h2 className="text-xl font-outfit font-bold text-foreground">{event.title}</h2>
              <div className="text-sm text-muted-foreground mt-1 space-y-1">
                {event.start_time && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(event.start_time).toLocaleString()}
                  </div>
                )}
                {event.venue_name && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {event.venue_name}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-border space-y-2">
            <Row label="Ticket type" value={ticket_type?.name ?? '—'} />
            <Row label="Quantity" value={String(booking.number_of_tickets)} />
            <Row label="Unit price" value={`LKR ${Number(booking.ticket_price).toLocaleString()}`} />
            <div className="flex items-baseline justify-between pt-2 border-t border-border">
              <span className="text-muted-foreground font-plex-sans">Total</span>
              <span className="text-xl font-outfit font-bold text-foreground">
                LKR {Number(booking.total_amount).toLocaleString()}
              </span>
            </div>
          </div>

          {booking.attendee_info && (
            <div className="pt-4 border-t border-border">
              <h3 className="text-sm font-inter font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Attendee
              </h3>
              <div className="text-sm text-foreground">{booking.attendee_info.name || '—'}</div>
              <div className="text-sm text-muted-foreground">{booking.attendee_info.email || '—'}</div>
              {booking.attendee_info.phone && (
                <div className="text-sm text-muted-foreground">{booking.attendee_info.phone}</div>
              )}
            </div>
          )}
        </div>

        {isPending && (
          <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
            {isDev && (
              <button
                type="button"
                onClick={handleDevMarkPaid}
                disabled={devMarkingPaid}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-inter font-semibold disabled:opacity-50 bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-dashed border-sky-500/40 hover:bg-sky-500/15"
                title="Local-dev only: simulate a PayHere success without going through the gateway"
              >
                {devMarkingPaid ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                {devMarkingPaid ? 'Confirming…' : 'Mark paid (dev)'}
              </button>
            )}
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelling}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-inter font-semibold disabled:opacity-50 bg-destructive/10 text-destructive hover:bg-destructive/15"
            >
              {cancelling ? <Loader className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              Cancel booking
            </button>
            <button
              type="button"
              onClick={handlePay}
              disabled={paying}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-inter font-semibold disabled:opacity-60 disabled:cursor-not-allowed bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {paying ? <Loader className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
              {paying ? 'Redirecting…' : 'Pay now'}
            </button>
          </div>
        )}

        {isConfirmed && seatingMode === 'reserved' && (
          <div className="mt-6">
            <h3 className="text-sm font-inter font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Your seat tickets ({seatTickets?.length ?? booking.number_of_tickets})
            </h3>
            {seatTicketsError ? (
              <div className="p-3 rounded-xl text-sm border border-destructive/30 bg-destructive/10 text-destructive">
                {seatTicketsError}
              </div>
            ) : !seatTickets ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader className="w-4 h-4 animate-spin" /> Loading tickets…
              </div>
            ) : seatTickets.length === 0 ? (
              <div className="p-3 rounded-xl text-sm text-muted-foreground border border-border bg-card">
                Tickets are being generated. Refresh in a moment.
              </div>
            ) : (
              <ul className="space-y-2">
                {seatTickets.map((t) => {
                  const seatLabel = t.seat?.seat_label || '—';
                  const sectionLabel = t.seat?.section || '';
                  const checkedIn = t.check_in_status === 'checked-in';
                  return (
                    <li
                      key={t.id}
                      className="flex items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card"
                    >
                      <div className="min-w-0">
                        <div className="font-outfit font-semibold text-foreground">Seat {seatLabel}</div>
                        {sectionLabel && (
                          <div className="text-xs text-muted-foreground mt-0.5">{sectionLabel}</div>
                        )}
                        {checkedIn && (
                          <div className="text-xs mt-1 text-emerald-600 dark:text-emerald-400">
                            ✓ Checked in
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadSeatTicket(t)}
                        disabled={downloadingSeatId === t.id}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-inter font-semibold disabled:opacity-60 disabled:cursor-not-allowed shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        {downloadingSeatId === t.id ? (
                          <Loader className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Ticket className="w-3.5 h-3.5" />
                        )}
                        {downloadingSeatId === t.id ? 'Preparing…' : 'Download'}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="mt-4 text-center">
              <Link href="/events" className="text-primary underline text-sm">
                Browse more events →
              </Link>
            </div>
          </div>
        )}

        {isConfirmed && seatingMode !== 'reserved' && (
          <div className="mt-6 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadTicket}
              disabled={downloadingTicket}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-inter font-semibold disabled:opacity-60 disabled:cursor-not-allowed bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {downloadingTicket ? <Loader className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
              {downloadingTicket ? 'Preparing…' : 'Download ticket (QR)'}
            </button>
            <Link href="/events" className="text-primary underline text-sm">
              Browse more events →
            </Link>
          </div>
        )}

        {isCancelled && (
          <div className="mt-6 text-center">
            <Link href="/events" className="text-primary underline text-sm">
              Browse more events →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// Semantic tone palette → uses theme-aware Tailwind utilities so the page
// looks right in both light and dark mode without a hex code in sight.
const STATUS_TONE_CLASSES: Record<'success' | 'warning' | 'danger', string> = {
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  danger:  'bg-destructive/10 text-destructive',
};

function StatusHero({
  tone,
  icon,
  title,
  body,
}: {
  tone: 'success' | 'warning' | 'danger';
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${STATUS_TONE_CLASSES[tone]}`}>
        {icon}
      </div>
      <div>
        <h1 className="text-2xl font-outfit font-bold text-foreground">{title}</h1>
        <p className="text-muted-foreground font-plex-sans mt-0.5">{body}</p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-inter font-semibold">{value}</span>
    </div>
  );
}
