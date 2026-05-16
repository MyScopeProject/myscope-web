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
}

export default function EventBookingDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const bookingId = params?.id;
  const { user, loading: authLoading } = useAuth();

  const [paymentResult, setPaymentResult] = useState<string | null>(null);
  const [data, setData] = useState<BookingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [paying, setPaying] = useState(false);
  const [downloadingTicket, setDownloadingTicket] = useState(false);

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
      setData(body.data as BookingResponse);
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
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
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#07060A' }}
      >
        <Loader className="w-8 h-8 animate-spin text-text-secondary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: '#07060A' }}
      >
        <div className="text-center max-w-md">
          <p className="text-text-secondary mb-4">{error || 'Booking not found.'}</p>
          <Link href="/events" className="text-accent-primary underline">
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
    <div className="min-h-screen px-4 py-12" style={{ backgroundColor: '#07060A' }}>
      <div className="max-w-2xl mx-auto">
        {/* Payment result banners (shown after PayHere redirect-back) */}
        {paymentResult === 'success' && !isConfirmed && (
          <div className="mb-4 p-3 rounded-xl text-sm font-inter" style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}>
            Payment received — your booking is being confirmed. This page will update shortly.
          </div>
        )}
        {paymentResult === 'cancelled' && (
          <div className="mb-4 p-3 rounded-xl text-sm font-inter" style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>
            Payment was cancelled. Your tickets are still reserved — you can try again below.
          </div>
        )}

        <Link
          href="/events"
          className="text-sm text-text-secondary hover:text-text-primary inline-flex items-center gap-1 mb-3"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to events
        </Link>

        {/* Status hero */}
        <div
          className="p-6 rounded-2xl border mb-6"
          style={{
            backgroundColor: 'rgba(21, 18, 29, 0.5)',
            borderColor: 'rgba(196, 181, 253, 0.15)',
          }}
        >
          {isConfirmed && (
            <StatusHero
              color="#10b981"
              icon={<CheckCircle className="w-6 h-6" />}
              title="Booking confirmed"
              body="Your e-tickets will be emailed to you shortly."
            />
          )}
          {isPending && (
            <StatusHero
              color="#f59e0b"
              icon={<Clock className="w-6 h-6" />}
              title="Payment pending"
              body="Your tickets are reserved. Complete payment to confirm — payment integration ships next."
            />
          )}
          {isCancelled && (
            <StatusHero
              color="#FF6B6B"
              icon={<XCircle className="w-6 h-6" />}
              title="Booking cancelled"
              body="Inventory has been released. You can book again any time."
            />
          )}

          <div className="mt-4 text-xs text-text-secondary font-mono">
            Reference: {booking.booking_reference}
          </div>
        </div>

        {/* Order summary */}
        <div
          className="p-6 rounded-2xl border space-y-4"
          style={{
            backgroundColor: 'rgba(21, 18, 29, 0.5)',
            borderColor: 'rgba(196, 181, 253, 0.15)',
          }}
        >
          {event && (
            <div>
              <h2 className="text-xl font-outfit font-bold text-text-primary">{event.title}</h2>
              <div className="text-sm text-text-secondary mt-1 space-y-1">
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
              <span className="text-text-secondary font-plex-sans">Total</span>
              <span className="text-xl font-outfit font-bold text-text-primary">
                LKR {Number(booking.total_amount).toLocaleString()}
              </span>
            </div>
          </div>

          {booking.attendee_info && (
            <div className="pt-4 border-t border-border">
              <h3 className="text-sm font-inter font-semibold text-text-secondary uppercase tracking-wide mb-2">
                Attendee
              </h3>
              <div className="text-sm text-text-primary">{booking.attendee_info.name || '—'}</div>
              <div className="text-sm text-text-secondary">{booking.attendee_info.email || '—'}</div>
              {booking.attendee_info.phone && (
                <div className="text-sm text-text-secondary">{booking.attendee_info.phone}</div>
              )}
            </div>
          )}
        </div>

        {isPending && (
          <div className="mt-6 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelling}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-inter font-semibold disabled:opacity-50"
              style={{ backgroundColor: 'rgba(255, 107, 107, 0.12)', color: '#FF6B6B' }}
            >
              {cancelling ? <Loader className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              Cancel booking
            </button>
            <button
              type="button"
              onClick={handlePay}
              disabled={paying}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-inter font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #A78BFA 0%, #FF7AC6 100%)',
                color: '#0a0712',
              }}
            >
              {paying ? <Loader className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
              {paying ? 'Redirecting…' : 'Pay now'}
            </button>
          </div>
        )}

        {isConfirmed && (
          <div className="mt-6 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadTicket}
              disabled={downloadingTicket}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-inter font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #A78BFA 0%, #FF7AC6 100%)',
                color: '#0a0712',
              }}
            >
              {downloadingTicket ? <Loader className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
              {downloadingTicket ? 'Preparing…' : 'Download ticket (QR)'}
            </button>
            <Link href="/events" className="text-accent-primary underline text-sm">
              Browse more events →
            </Link>
          </div>
        )}

        {isCancelled && (
          <div className="mt-6 text-center">
            <Link href="/events" className="text-accent-primary underline text-sm">
              Browse more events →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusHero({
  color,
  icon,
  title,
  body,
}: {
  color: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${color}1a`, color }}
      >
        {icon}
      </div>
      <div>
        <h1 className="text-2xl font-outfit font-bold text-text-primary">{title}</h1>
        <p className="text-text-secondary font-plex-sans mt-0.5">{body}</p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between text-sm">
      <span className="text-text-secondary">{label}</span>
      <span className="text-text-primary font-inter font-semibold">{value}</span>
    </div>
  );
}
