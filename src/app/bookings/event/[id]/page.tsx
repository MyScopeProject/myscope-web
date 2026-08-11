'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
 Apple,
 Calendar,
 CalendarPlus,
 CheckCircle,
 ChevronLeft,
 Loader,
 Mail,
 MapPin,
 RefreshCw,
 ShieldCheck,
 Smartphone,
 Ticket,
 XCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { CheckoutSteps } from '@/components/checkout/checkout-steps';
import { launchMpgsCheckout } from '@/lib/mpgsCheckout';
import { launchKokoCheckout } from '@/lib/kokoCheckout';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Koko (BNPL) is opt-in: the payment-method chooser only appears once this is
// set, so we don't show a broken option before the merchant's Koko creds are
// live on the API. Card (MPGS) is always available.
const KOKO_ENABLED = process.env.NEXT_PUBLIC_KOKO_ENABLED === 'true';

interface Booking {
 id: string;
 booking_reference: string;
 short_code?: string | null;
 number_of_tickets: number;
 ticket_price: number | string;
 total_amount: number | string;
 payment_status: string;
 status: string;
 created_at: string;
 attendee_info: { name?: string; email?: string; phone?: string | null } | null;
 guest_phone?: string | null;
 phone_verified?: boolean | null;
}

interface EventSummary {
 id: string;
 title: string;
 start_time: string | null;
 venue_name: string | null;
 seating_mode?: string | null;
}

interface TicketTypeSummary {
 id: string;
 name: string;
 price: number;
}

interface BookingSeat {
 id: string;
 seat_label: string | null;
 section: string | null;
 row_label: string | null;
 seat_number: string | null;
 status: string;
}

interface BookingLineItem {
 ticket_type_id: string;
 name: string;
 price: number;
 quantity: number;
}

interface BookingResponse {
 booking: Booking;
 event: EventSummary | null;
 ticket_type: TicketTypeSummary | null;
 // Per-category breakdown for multi-tier orders (mixed non-reserved carts +
 // reserved GA tiers). Null for single-tier orders — use `ticket_type` then.
 line_items?: BookingLineItem[] | null;
 // seating_mode is now also surfaced inside event.seating_mode (set by the
 // backend) — kept here for backwards compatibility with older response shapes.
 seating_mode?: string | null;
 // Seats linked to this booking (only present for reserved-mode bookings).
 seats?: BookingSeat[] | null;
}

interface SeatTicket {
 id: string;
 check_in_status: string | null;
 checked_in_at: string | null;
 qr_image_url: string | null;
 recipient_email?: string | null;
 recipient_name?: string | null;
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
 // Live clock for the seat-hold countdown. Ticks once a second only while
 // a reserved booking is sitting in Pending; otherwise the interval is idle.
 const [now, setNow] = useState<number>(() => Date.now());
 const [seatTickets, setSeatTickets] = useState<SeatTicket[] | null>(null);
 const [seatTicketsError, setSeatTicketsError] = useState('');
 const [downloadingSeatId, setDownloadingSeatId] = useState<string | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState('');
 // Separate from `error` (which takes over the WHOLE page below) — a
 // pre-redirect payment failure should leave the booking page intact so the
 // buyer can retry, not dead-end them on a full-page error.
 const [paymentError, setPaymentError] = useState('');
 const [cancelling, setCancelling] = useState(false);
 const [paying, setPaying] = useState(false);
 // 'card' → MPGS; 'koko' → Koko BNPL. Only user-selectable when KOKO_ENABLED.
 const [paymentMethod, setPaymentMethod] = useState<'card' | 'koko'>('card');
 const [downloadingTicket, setDownloadingTicket] = useState(false);
 const [devMarkingPaid, setDevMarkingPaid] = useState(false);
 // Tiny convenience for local dev so we don't have to run ngrok to test the
 // payment-confirmed flow. Backend gates the endpoint on NODE_ENV !== production.
 const isDev = process.env.NODE_ENV !== 'production';

 // Guest bookings carry a per-row access token (?t=…) instead of a session.
 // We read it once on mount and reuse it for every backend call below.
 const [guestToken, setGuestToken] = useState<string | null>(null);
 useEffect(() => {
  const t = new URLSearchParams(window.location.search).get('t');
  if (t) setGuestToken(t);
 }, []);

 // Suffix appended to checkout API URLs when we're acting as a guest.
 const tokenQS = guestToken ? `?token=${encodeURIComponent(guestToken)}` : '';

 // Auth gate: signed-in users go straight in. Guests must present a ?t= token —
 // anyone visiting /bookings/event/:id without one gets pushed to login (the
 // common case is a previously-signed-in user revisiting the page).
 useEffect(() => {
  if (authLoading) return;
  if (!user && !guestToken) {
   router.push(`/auth/login?redirect=/bookings/event/${bookingId}`);
  }
 }, [authLoading, user, guestToken, bookingId, router]);

 // Tick once a second so the seat-hold countdown stays live. Only run the
 // interval while it's actually meaningful (reserved + Pending) to avoid
 // re-rendering the page every second on confirmed/cancelled bookings.
 useEffect(() => {
  const status = data?.booking?.status;
  if (seatingMode !== 'reserved' || status !== 'Pending') return;
  const t = setInterval(() => setNow(Date.now()), 1000);
  return () => clearInterval(t);
 }, [seatingMode, data?.booking?.status]);

 useEffect(() => {
  const p = new URLSearchParams(window.location.search).get('payment');
  if (p) setPaymentResult(p);
 }, []);

 // When the user lands back from MPGS with ?payment=success but the
 // booking is still Pending, the webhook either hasn't arrived yet or was
 // missed (e.g. Render free-tier cold start). Poll /reconcile a few times
 // so we self-heal instead of leaving the user staring at "Pending".
 const [reconciling, setReconciling] = useState(false);
 useEffect(() => {
  if (paymentResult !== 'success') return;
  if (data?.booking?.status !== 'Pending') return;

  setReconciling(true);
  let attempts = 0;
  const MAX_ATTEMPTS = 10; // ~30s of polling at 3s intervals
  const interval = setInterval(async () => {
   attempts++;
   try {
    const res = await fetch(
     `${API_URL}/api/checkout/${bookingId}/reconcile${tokenQS}`,
     { method: 'POST', credentials: 'include' },
    );
    const body = await res.json();
    if (body?.success && body.data?.status === 'Confirmed') {
     clearInterval(interval);
     setReconciling(false);
     await fetchBooking();
     return;
    }
   } catch {
    // network blip — keep polling until we hit MAX_ATTEMPTS
   }
   if (attempts >= MAX_ATTEMPTS) {
    clearInterval(interval);
    setReconciling(false);
   }
  }, 3000);
  return () => clearInterval(interval);
 }, [paymentResult, data?.booking?.status, bookingId, tokenQS]); // eslint-disable-line react-hooks/exhaustive-deps

 const fetchBooking = async () => {
  if (!bookingId) return;
  try {
   setLoading(true);
   const res = await fetch(`${API_URL}/api/checkout/${bookingId}${tokenQS}`, {
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

 // Every confirmed booking gets one ticket row per ticket (a seat for reserved
 // events, a plain GA ticket otherwise). Fetch them so multi-ticket buyers see
 // and manage each ticket individually.
 const fetchSeatTickets = async () => {
  if (!bookingId) return;
  setSeatTicketsError('');
  try {
   const res = await fetch(`${API_URL}/api/checkout/${bookingId}/tickets${tokenQS}`, {
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
  const isConfirmed = data?.booking?.status === 'Confirmed';
  if (isConfirmed && !seatTickets && !seatTicketsError) {
   fetchSeatTickets();
  }
 }, [data?.booking?.status, seatTickets, seatTicketsError]); // eslint-disable-line react-hooks/exhaustive-deps

 // Phone verification (OTP). The booking already exists at this point, so we
 // verify the number on the booking via the checkout verify-phone endpoints.
 const [otp, setOtp] = useState('');
 const [otpSent, setOtpSent] = useState(false);
 const [otpSentTo, setOtpSentTo] = useState<string | null>(null);
 const [otpBusy, setOtpBusy] = useState(false);
 const [otpError, setOtpError] = useState('');
 const [phoneVerified, setPhoneVerified] = useState(false);
 const [verifyUnavailable, setVerifyUnavailable] = useState(false);

 const requestOtp = async () => {
  if (!data?.booking) return;
  setOtpError('');
  setOtpBusy(true);
  try {
   const res = await fetch(
    `${API_URL}/api/checkout/${data.booking.id}/verify-phone/request${tokenQS}`,
    { method: 'POST', credentials: 'include' },
   );
   const body = await res.json();
   if (!body?.success) {
    // 503 = phone verification channel turned off platform-wide; hide the card.
    if (res.status === 503) setVerifyUnavailable(true);
    setOtpError(body?.message || 'Could not send the code.');
    return;
   }
   if (body.data?.phone_verified) {
    setPhoneVerified(true);
    return;
   }
   setOtpSent(true);
   setOtpSentTo(body.data?.sent_to_last4 ?? null);
  } catch {
   setOtpError('Network error sending the code.');
  } finally {
   setOtpBusy(false);
  }
 };

 const verifyOtp = async () => {
  if (!data?.booking) return;
  const code = otp.trim();
  if (!code) {
   setOtpError('Enter the code we sent you.');
   return;
  }
  setOtpError('');
  setOtpBusy(true);
  try {
   const res = await fetch(
    `${API_URL}/api/checkout/${data.booking.id}/verify-phone${tokenQS}`,
    {
     method: 'POST',
     credentials: 'include',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ otp: code }),
    },
   );
   const body = await res.json();
   if (!body?.success) {
    setOtpError(body?.message || 'Incorrect code.');
    return;
   }
   setPhoneVerified(true);
   setOtp('');
  } catch {
   setOtpError('Network error verifying the code.');
  } finally {
   setOtpBusy(false);
  }
 };

 const [transferringId, setTransferringId] = useState<string | null>(null);
 const [refundRequesting, setRefundRequesting] = useState(false);
 const [refundRequested, setRefundRequested] = useState(false);
 const handleRefund = async () => {
  if (!data?.booking) return;
  const reason = window.prompt(
   'Request a refund?\n\nOptionally tell us why so we can improve things:',
   '',
  );
  if (reason === null) return; // cancelled
  setRefundRequesting(true);
  try {
   const res = await fetch(
    `${API_URL}/api/checkout/${data.booking.id}/refund${tokenQS}`,
    {
     method: 'POST',
     credentials: 'include',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ reason: reason.trim() || undefined }),
    },
   );
   const body = await res.json();
   if (!body?.success) {
    setError(body?.message || 'Refund request failed.');
    return;
   }
   setRefundRequested(true);
  } catch {
   setError('Network error requesting refund.');
  } finally {
   setRefundRequesting(false);
  }
 };

 const handleTransferSeatTicket = async (ticket: SeatTicket) => {
  if (!data?.booking) return;
  const recipient = window.prompt(
   `Transfer this ticket to someone else?\n\nEnter their email address — we'll send them the QR.`,
   '',
  );
  if (!recipient || !recipient.trim()) return;
  setTransferringId(ticket.id);
  try {
   const res = await fetch(
    `${API_URL}/api/checkout/${data.booking.id}/tickets/${ticket.id}/transfer${tokenQS}`,
    {
     method: 'POST',
     credentials: 'include',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ recipient_email: recipient.trim() }),
    },
   );
   const body = await res.json();
   if (!body?.success) {
    setError(body?.message || 'Transfer failed.');
    return;
   }
   // Refresh per-seat tickets so the recipient appears in the row state.
   await fetchSeatTickets();
  } catch {
   setError('Network error transferring ticket.');
  } finally {
   setTransferringId(null);
  }
 };

 const handleDownloadSeatTicket = async (ticket: SeatTicket) => {
  if (!data?.booking) return;
  setDownloadingSeatId(ticket.id);
  try {
   const res = await fetch(
    `${API_URL}/api/checkout/${data.booking.id}/tickets/${ticket.id}/png${tokenQS}`,
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
  // Run the fetch once we have *some* way to authenticate: either a signed-in
  // user, or a guest token from the URL.
  if (user || guestToken) fetchBooking();
 }, [user, guestToken, bookingId]); // eslint-disable-line react-hooks/exhaustive-deps

 const handleCancel = async () => {
  if (!data?.booking) return;
  if (!confirm('Cancel this booking? The tickets will be released back to inventory.')) return;
  setCancelling(true);
  try {
   const res = await fetch(`${API_URL}/api/checkout/${data.booking.id}/cancel${tokenQS}`, {
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
   const res = await fetch(`${API_URL}/api/checkout/${data.booking.id}/ticket${tokenQS}`, {
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
  if (!confirm('Simulate a successful payment for this booking? (Dev only)')) return;
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

 const handlePayKoko = async () => {
  if (!data?.booking) return;
  setPaying(true);
  setPaymentError('');
  try {
   const res = await fetch(`${API_URL}/api/payments/initialize-event-koko`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
     bookingId: data.booking.id,
     ...(guestToken ? { guestToken } : {}),
    }),
   });
   const body = await res.json();
   if (!body?.success) {
    setPaymentError(body?.message || 'Failed to start Koko payment.');
    setPaying(false);
    return;
   }
   // Full-page redirect to Koko's hosted page. The verdict comes back via
   // Koko's signed server-to-server webhook (and orderView reconcile), then
   // the browser lands on this page with ?payment=… — same as the card flow.
   launchKokoCheckout({ actionUrl: body.data.actionUrl, fields: body.data.fields });
  } catch (err) {
   console.error('Koko checkout error:', err);
   setPaymentError('Payment failed. Please try again.');
   setPaying(false);
  }
 };

 const handlePay = async () => {
  if (!data?.booking) return;
  if (KOKO_ENABLED && paymentMethod === 'koko') return handlePayKoko();
  setPaying(true);
  setPaymentError('');
  try {
   const res = await fetch(`${API_URL}/api/payments/initialize-event`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
     bookingId: data.booking.id,
     // Backend allows guest payment init when this token matches the row.
     ...(guestToken ? { guestToken } : {}),
    }),
   });
   const body = await res.json();
   if (!body?.success) {
    setPaymentError(body?.message || 'Failed to initialize payment.');
    setPaying(false);
    return;
   }

   const { sessionId, checkoutJsUrl } = body.data;
   await launchMpgsCheckout({
    sessionId,
    checkoutJsUrl,
    // These fire only for problems BEFORE the browser leaves for MPGS
    // (bad session, SDK config errors) — we're still on this page then.
    // Success/cancel/decline all redirect to returnUrl (set server-side)
    // and land back on this same page via the reload after redirect.
    onCancel: () => setPaying(false),
    onError: (err) => {
     console.error('MPGS checkout error:', err);
     setPaymentError('Payment failed. Please try again.');
     setPaying(false);
    },
   });
   // showPaymentPage() redirects the whole browser to MPGS on success; the
   // above callbacks only fire for a pre-redirect failure, so nothing else
   // runs here in the normal flow.
  } catch (err) {
   console.error('MPGS checkout error:', err);
   setPaymentError('Payment failed. Please try again.');
   setPaying(false);
  }
 };

 if (authLoading || loading) {
  return (
   <div className="min-h-screen flex items-center justify-center">
    <Loader className="w-8 h-8 animate-spin text-muted-foreground" />
   </div>
  );
 }

 if (error || !data) {
  return (
   <div className="min-h-screen flex items-center justify-center px-4">
    <div className="text-center max-w-md">
     <p className="text-muted-foreground mb-4">{error || 'Booking not found.'}</p>
     <Link href="/events" className="text-primary underline">
      Browse events
     </Link>
    </div>
   </div>
  );
 }

 const { booking, event, ticket_type, seats, line_items } = data;
 const isPending = booking.status === 'Pending';
 const isCancelled = booking.status === 'Cancelled';
 const isConfirmed = booking.status === 'Confirmed';
 const isReserved = (event?.seating_mode ?? seatingMode) === 'reserved';

 const bookingPhone = booking.attendee_info?.phone || booking.guest_phone || null;
 const isPhoneVerified = phoneVerified || !!booking.phone_verified;
 const showPhoneVerify =
  !!bookingPhone && !isPhoneVerified && !verifyUnavailable && !isCancelled;

 return (
  <div className="min-h-screen px-4 py-12">
   <div className="max-w-2xl mx-auto">
    {/* Progress strip — third step (Pay) of the event checkout flow.
      Steps 1 (Choose) and 2 (Details) happened on /events/[id]/checkout
      and render here as completed. Hidden once the booking is confirmed
      (paid + reconciled) since the strip is no longer informative. */}
    {!isConfirmed && <CheckoutSteps activeIndex={1} />}

    {/* Payment result banners (shown after MPGS redirect-back) */}
    {paymentResult === 'success' && !isConfirmed && (
     <div className="mb-4 flex items-center gap-2 p-3 text-sm font-inter border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
      {reconciling && <Loader className="w-4 h-4 animate-spin shrink-0" />}
      <span>
       Payment received — confirming your booking{reconciling ? '… (this can take a few seconds)' : '. This page will update shortly.'}
      </span>
     </div>
    )}
    {paymentResult === 'cancelled' && (
     <div className="mb-4 p-3 text-sm font-inter border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400">
      Payment was cancelled. Your tickets are still reserved — you can try again below.
     </div>
    )}
    {paymentResult === 'refund_pending' && (
     <div className="mb-4 p-3 text-sm font-inter border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400">
      Your Koko payment went through, but these seats were just taken by another buyer, so we couldn&rsquo;t confirm this booking. A full refund has been initiated — our team will process it within 3 business days. We&rsquo;re sorry for the inconvenience.
     </div>
    )}

    <Link
     href="/events"
     className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-3"
    >
     <ChevronLeft className="w-4 h-4" />
     Back to events
    </Link>

    {/* Status hero — only for confirmed/cancelled. Pending no longer shows
      a "Review your order" hero. */}
    {(isConfirmed || isCancelled) && (
     <div className="p-6 rounded-2xl border border-border bg-card dark:bg-card/60 dark:backdrop-blur-sm mb-6 dark:bg-card/40">
      {isConfirmed && (
       <StatusHero
        tone="success"
        icon={<CheckCircle className="w-6 h-6" />}
        title="Booking confirmed"
        body="Your e-tickets will be emailed to you shortly."
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
     </div>
    )}

    {/* Order summary */}
    <div className="p-6 rounded-2xl border border-border bg-card dark:bg-card/60 dark:backdrop-blur-sm space-y-4 dark:bg-card/40">
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

     {/* Per-seat line items — only present for reserved-mode bookings.
       Surfaces "which seats did I just get?" before payment, which the
       previous summary (quantity + unit price only) didn't answer. */}
     {isReserved && seats && seats.length > 0 && (
      <div className="pt-4 border-t border-border">
       <h3 className="text-sm font-inter font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        Your seats ({seats.length})
       </h3>
       <ul className="space-y-1.5">
        {seats.map(s => (
         <li key={s.id} className="flex items-baseline justify-between gap-3 text-sm">
          <div className="min-w-0">
           <span className="font-mono font-semibold text-foreground">
            Seat {s.seat_label ?? `${s.row_label}-${s.seat_number}`}
           </span>
           {s.section && (
            <span className="ml-2 text-xs text-muted-foreground">{s.section}</span>
           )}
          </div>
          <span className="shrink-0 text-muted-foreground">
           LKR {Number(booking.ticket_price).toLocaleString()}
          </span>
         </li>
        ))}
       </ul>
      </div>
     )}

     <div className="pt-4 border-t border-border space-y-2">
      {line_items && line_items.length > 0 ? (
       // Multi-category order: one row per tier ("Gold × 2 — LKR 5,000").
       <>
        {line_items.map((li) => (
         <Row
          key={li.ticket_type_id}
          label={`${li.name} × ${li.quantity}`}
          value={`LKR ${(Number(li.price) * li.quantity).toLocaleString()}`}
         />
        ))}
        <Row label="Total tickets" value={String(booking.number_of_tickets)} />
       </>
      ) : (
       <>
        <Row label="Ticket type" value={ticket_type?.name ?? '—'} />
        <Row
         label={isReserved ? 'Seats' : 'Quantity'}
         value={String(booking.number_of_tickets)}
        />
        <Row label="Unit price" value={`LKR ${Number(booking.ticket_price).toLocaleString()}`} />
       </>
      )}
      <div className="flex items-baseline justify-between pt-2 border-t border-border">
       <span className="text-muted-foreground font-plex-sans">Total</span>
       <span className="text-2xl font-outfit font-bold text-foreground">
        LKR {Number(booking.total_amount).toLocaleString()}
       </span>
      </div>
     </div>

     <div className="pt-4 border-t border-border">
      <h3 className="text-sm font-inter font-semibold text-muted-foreground uppercase tracking-wide mb-2">
       Attendee
      </h3>
      {booking.attendee_info && (
       <>
        <div className="text-sm text-foreground">{booking.attendee_info.name || '—'}</div>
        <div className="text-sm text-muted-foreground">{booking.attendee_info.email || '—'}</div>
        {booking.attendee_info.phone && (
         <div className="text-sm text-muted-foreground">{booking.attendee_info.phone}</div>
        )}
       </>
      )}

      {/* Booking code */}
      <div className="mt-3 pt-3 border-t border-border">
       {booking.short_code ? (
        <div className="space-y-1">
         <div className="flex items-baseline gap-2">
          <span className="text-[10px] font-inter font-semibold text-muted-foreground uppercase tracking-wider">
           Booking code
          </span>
          <span className="font-mono font-bold text-foreground tracking-[0.2em] text-lg">
           {booking.short_code}
          </span>
         </div>
         <div className="text-[11px] text-muted-foreground font-mono">
          Support reference: {booking.booking_reference}
         </div>
        </div>
       ) : (
        <div className="text-xs text-muted-foreground font-mono">
         Reference: {booking.booking_reference}
        </div>
       )}
      </div>
     </div>
    </div>

    {/* Phone verification — confirm the attendee's number is reachable so
      SMS reminders / alerts actually land. Shown until verified. */}
    {showPhoneVerify && (
     <div className="mt-6 rounded-2xl border border-border bg-card dark:bg-card/60 dark:backdrop-blur-sm p-5 dark:bg-card/40">
      <div className="flex items-start gap-3">
       <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Smartphone className="h-5 w-5" />
       </div>
       <div className="min-w-0 flex-1">
        <h3 className="font-outfit font-bold text-foreground">Verify your phone</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
         We&rsquo;ll text a 6-digit code to{' '}
         <span className="font-medium text-foreground">{bookingPhone}</span> so your SMS
         ticket alerts and reminders reach you.
        </p>

        {!otpSent ? (
         <button
          type="button"
          onClick={requestOtp}
          disabled={otpBusy}
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-inter font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
         >
          {otpBusy ? <Loader className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
          {otpBusy ? 'Sending…' : 'Send code'}
         </button>
        ) : (
         <div className="mt-3 space-y-2">
          {otpSentTo && (
           <p className="text-xs text-muted-foreground">
            Code sent to the number ending in{' '}
            <span className="font-mono font-semibold">{otpSentTo}</span>.
           </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
           <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="6-digit code"
            aria-label="Verification code"
            className="w-36 rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono tracking-[0.3em] text-foreground placeholder:tracking-normal focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
           />
           <button
            type="button"
            onClick={verifyOtp}
            disabled={otpBusy || otp.length < 4}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-inter font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
           >
            {otpBusy ? <Loader className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {otpBusy ? 'Verifying…' : 'Verify'}
           </button>
           <button
            type="button"
            onClick={requestOtp}
            disabled={otpBusy}
            className="text-xs font-medium text-primary hover:underline disabled:opacity-60"
           >
            Resend
           </button>
          </div>
         </div>
        )}

        {otpError && <p className="mt-2 text-xs text-destructive">{otpError}</p>}
       </div>
      </div>
     </div>
    )}

    {/* Verified confirmation — plain inline row, no card/border/background.
      Text stays green (consistent with the checkmark meaning "verified"
      elsewhere) but without a container it doesn't compete with the
      "Payment received" success banner, which keeps the card treatment. */}
    {!!bookingPhone && isPhoneVerified && !isCancelled && (
     <div className="mt-6 flex items-start gap-2 font-inter">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
      <div className="min-w-0">
       <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Phone number verified</p>
       <p className="mt-0.5 text-xs text-emerald-600/80 dark:text-emerald-400/80">
        You&rsquo;ll receive SMS updates for this booking.
       </p>
      </div>
     </div>
    )}

    {/* Seat-hold countdown — only meaningful for reserved Pending bookings.
      Backend's hold_seats RPC locks seats for 10 min from checkout; we
      mirror that window here so users know they have to act. After 0,
      pg_cron's release_expired_holds will have already released the seats. */}
    {isPending && seatingMode === 'reserved' && (() => {
     const HOLD_MS = 10 * 60 * 1000;
     const created = new Date(booking.created_at).getTime();
     const deadline = created + HOLD_MS;
     const msLeft = Math.max(0, deadline - now);
     const expired = msLeft === 0;
     const mm = String(Math.floor(msLeft / 60000)).padStart(2, '0');
     const ss = String(Math.floor((msLeft % 60000) / 1000)).padStart(2, '0');
     // Fraction of the hold window still remaining — drives the progress bar.
     const pct = Math.max(0, Math.min(100, (msLeft / HOLD_MS) * 100));

     return expired ? (
      <div className="mt-6 overflow-hidden rounded-xl border border-red-500/30 bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent p-3.5 backdrop-blur-sm">
       <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
         <p className="text-xs font-semibold text-red-600 dark:text-red-400">Reservation expired</p>
         <p className="mt-0.5 text-[11px] leading-snug text-red-700/70 dark:text-red-200/55">
          Your seats were released. Refresh for the latest status, or cancel and start over.
         </p>
        </div>
        <button
         type="button"
         onClick={fetchBooking}
         className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/5 px-2.5 py-1.5 text-[11px] font-semibold text-red-600 dark:text-red-400 transition-colors hover:bg-red-500/15"
        >
         <RefreshCw className="h-3.5 w-3.5" />
         Refresh
        </button>
       </div>
      </div>
     ) : (
      <div className="mt-6 overflow-hidden rounded-xl border border-red-500/30 bg-gradient-to-br from-red-500/10 via-red-500/5 to-transparent p-3.5 backdrop-blur-sm">
       <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-red-600/80 dark:text-red-400/80">
         Seats held · pay within
        </p>
        <div className="mt-0.5 flex items-center gap-1 font-mono tabular-nums text-red-600 dark:text-red-300">
         <span className="rounded-md bg-red-500/15 px-1.5 py-0.5 text-lg font-bold leading-none">{mm}</span>
         <span className="text-lg font-bold leading-none">:</span>
         <span className="rounded-md bg-red-500/15 px-1.5 py-0.5 text-lg font-bold leading-none">{ss}</span>
         <span className="ml-1 font-sans text-[10px] font-medium text-red-600/60 dark:text-red-400/60">min : sec</span>
        </div>
       </div>
       <p className="mt-2 text-[11px] leading-snug text-red-700/70 dark:text-red-200/55">
        Your seats are held just for you. If payment isn&rsquo;t completed in time, they&rsquo;ll be released.
       </p>
       {/* Depleting progress bar — at-a-glance time remaining. */}
       <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-red-500/15">
        <div
         className="h-full rounded-full bg-red-500/70 transition-[width] duration-1000 ease-linear"
         style={{ width: `${pct}%` }}
        />
       </div>
      </div>
     );
    })()}

    {isPending && (
     <div className="mt-6 space-y-3">
      {paymentError && (
       <div className="p-3 text-sm font-inter border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400">
        {paymentError}
       </div>
      )}
      {KOKO_ENABLED && (
       <div className="rounded-lg border border-border p-3">
        <p className="mb-2 text-sm font-inter font-semibold">Payment Method</p>
        <div className="space-y-2">
         <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 has-checked:border-primary has-checked:bg-primary/5">
          <input
           type="radio"
           name="paymentMethod"
           value="card"
           checked={paymentMethod === 'card'}
           onChange={() => setPaymentMethod('card')}
           disabled={paying}
          />
          <span className="text-sm font-inter">Debit / Credit Card, Wallets &amp; Banking</span>
         </label>
         <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 has-checked:border-primary has-checked:bg-primary/5">
          <input
           type="radio"
           name="paymentMethod"
           value="koko"
           checked={paymentMethod === 'koko'}
           onChange={() => setPaymentMethod('koko')}
           disabled={paying}
          />
          <span className="text-sm font-inter">
           <span className="font-semibold">KOKO</span> — Pay in 3 interest-free instalments
          </span>
         </label>
        </div>
       </div>
      )}
      <button
       type="button"
       onClick={handlePay}
       disabled={paying}
       className="inline-flex w-full items-center justify-center gap-2 px-6 py-3.5 text-base font-inter font-semibold disabled:opacity-60 disabled:cursor-not-allowed bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm rounded-lg"
      >
       {paying && <Loader className="w-5 h-5 animate-spin" />}
       {paying
        ? 'Redirecting to secure checkout…'
        : KOKO_ENABLED && paymentMethod === 'koko'
         ? 'Continue with Koko'
         : 'Confirm and Pay'}
      </button>
      <p className="text-center text-xs text-muted-foreground">
       You&rsquo;ll be redirected to our secure payment gateway to complete your payment.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
       <button
        type="button"
        onClick={handleCancel}
        disabled={cancelling}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-inter font-medium disabled:opacity-50 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
       >
        {cancelling ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
        Cancel booking
       </button>
       {isDev && (
        <button
         type="button"
         onClick={handleDevMarkPaid}
         disabled={devMarkingPaid}
         className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-inter font-medium disabled:opacity-50 bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-dashed border-sky-500/40 hover:bg-sky-500/15"
         title="Local-dev only: simulate a payment success without going through the gateway"
        >
         {devMarkingPaid ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
         {devMarkingPaid ? 'Confirming…' : 'Mark paid (dev)'}
        </button>
       )}
      </div>
     </div>
    )}

    {isConfirmed && (
     <div className="mt-6">
      <h3 className="text-sm font-inter font-semibold text-muted-foreground uppercase tracking-wide mb-3">
       Your tickets ({seatTickets?.length ?? booking.number_of_tickets})
      </h3>
      {seatTicketsError ? (
       <div className="p-3 text-sm border border-destructive/30 bg-destructive/10 text-destructive">
        {seatTicketsError}
       </div>
      ) : !seatTickets ? (
       <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader className="w-4 h-4 animate-spin" /> Loading tickets…
       </div>
      ) : seatTickets.length === 0 ? (
       // Legacy fallback: a confirmed booking that predates per-ticket rows.
       // Offer the single booking-level QR so the buyer still has a ticket.
       <div className="flex flex-col items-center gap-2 p-4 text-sm text-muted-foreground rounded-2xl border border-border bg-card dark:bg-card/60 dark:backdrop-blur-sm">
        <button
         type="button"
         onClick={handleDownloadTicket}
         disabled={downloadingTicket}
         className="inline-flex items-center gap-2 px-6 py-3 text-sm font-inter font-semibold disabled:opacity-60 disabled:cursor-not-allowed bg-primary text-primary-foreground hover:bg-primary/90"
        >
         {downloadingTicket ? <Loader className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
         {downloadingTicket ? 'Preparing…' : 'Download ticket (QR)'}
        </button>
        <span className="text-xs">Individual tickets are being generated — refresh in a moment.</span>
       </div>
      ) : (
       <ul className="space-y-2">
        {seatTickets.map((t, i) => {
         const seatLabel = t.seat?.seat_label || '—';
         const sectionLabel = t.seat?.section || '';
         const checkedIn = t.check_in_status === 'checked-in';
         // Reserved tickets are labelled by seat; GA tickets by index.
         const title = t.seat ? `Seat ${seatLabel}` : `Ticket ${i + 1}`;
         return (
          <li
           key={t.id}
           className="flex flex-col gap-3 p-4 rounded-2xl border border-border bg-card dark:bg-card/60 dark:backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between"
          >
           <div className="min-w-0">
            <div className="font-outfit font-semibold text-foreground">{title}</div>
            {sectionLabel && (
             <div className="text-xs text-muted-foreground mt-0.5">{sectionLabel}</div>
            )}
            {t.recipient_email && (
             <div className="mt-1 text-xs text-muted-foreground">
              Sent to <span className="font-mono">{t.recipient_email}</span>
             </div>
            )}
            {checkedIn && (
             <div className="text-xs mt-1 text-emerald-600 dark:text-emerald-400">
              ✓ Checked in
             </div>
            )}
           </div>
           <div className="flex shrink-0 gap-2">
            <button
             type="button"
             onClick={() => handleTransferSeatTicket(t)}
             disabled={transferringId === t.id || checkedIn}
             title={checkedIn ? 'Already used — cannot transfer' : 'Send to a different email'}
             className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-inter font-semibold disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl border border-border bg-card dark:bg-card/60 dark:backdrop-blur-sm hover:bg-muted text-foreground"
            >
             {transferringId === t.id ? (
              <Loader className="w-3.5 h-3.5 animate-spin" />
             ) : (
              <Mail className="w-3.5 h-3.5" />
             )}
             {transferringId === t.id ? 'Sending…' : 'Transfer'}
            </button>
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
           </div>
          </li>
         );
        })}
       </ul>
      )}
      {event?.start_time && (
       <div className="mt-4 p-4 rounded-2xl border border-border bg-card dark:bg-card/60 dark:backdrop-blur-sm">
        <AddToCalendar
         title={event.title}
         startIso={event.start_time}
         location={event.venue_name}
         description={`Booking reference: ${booking.booking_reference}`}
        />
       </div>
      )}
      <div className="mt-4 flex flex-col items-center gap-2">
       <button
        type="button"
        onClick={handleRefund}
        disabled={refundRequesting || refundRequested}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-inter font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-60"
       >
        {refundRequesting ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
        {refundRequested ? 'Refund requested' : refundRequesting ? 'Requesting…' : 'Request refund'}
       </button>
       <Link href="/events" className="text-primary underline text-sm">
        Browse more events →
       </Link>
      </div>
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

// "Add to Calendar" — three deep-links that cover ~all desktop and mobile
// calendars. Google/Outlook open in a new tab; Apple downloads a .ics file
// which iOS/macOS Calendar auto-imports. Reduces no-shows on event day.
function AddToCalendar({
 title,
 startIso,
 endIso,
 location,
 description,
}: {
 title: string;
 startIso: string;
 endIso?: string | null;
 location?: string | null;
 description?: string | null;
}) {
 const start = new Date(startIso);
 // Default to a 3-hour window when we don't know the actual end time —
 // matches typical event length and is easy to edit afterward.
 const end = endIso ? new Date(endIso) : new Date(start.getTime() + 3 * 60 * 60 * 1000);

 // Google/Outlook want UTC stamps as YYYYMMDDTHHmmssZ.
 const fmtGoogle = (d: Date) =>
  d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

 const text = encodeURIComponent(title);
 const loc = encodeURIComponent(location || '');
 const det = encodeURIComponent(description || '');
 const dates = `${fmtGoogle(start)}/${fmtGoogle(end)}`;

 const googleUrl =
  `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}` +
  `&dates=${dates}&details=${det}&location=${loc}`;

 const outlookUrl =
  `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent` +
  `&subject=${text}&startdt=${encodeURIComponent(start.toISOString())}` +
  `&enddt=${encodeURIComponent(end.toISOString())}&body=${det}&location=${loc}`;

 // Build an .ics blob for Apple/iCal — works offline, no third-party hop.
 const handleAppleClick = () => {
  const dtStamp = fmtGoogle(new Date());
  const ics = [
   'BEGIN:VCALENDAR',
   'VERSION:2.0',
   'PRODID:-//MyScope//Event Booking//EN',
   'CALSCALE:GREGORIAN',
   'BEGIN:VEVENT',
   `UID:${dtStamp}-${Math.random().toString(36).slice(2, 10)}@myscope.lk`,
   `DTSTAMP:${dtStamp}`,
   `DTSTART:${fmtGoogle(start)}`,
   `DTEND:${fmtGoogle(end)}`,
   `SUMMARY:${title.replace(/([,;])/g, '\\$1')}`,
   location ? `LOCATION:${location.replace(/([,;])/g, '\\$1')}` : '',
   description ? `DESCRIPTION:${description.replace(/([,;\n])/g, m => (m === '\n' ? '\\n' : `\\${m}`))}` : '',
   'END:VEVENT',
   'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 40)}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
 };

 const btn =
  'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-inter font-medium rounded-2xl border border-border bg-card dark:bg-card/60 dark:backdrop-blur-sm hover:bg-muted text-foreground';

 return (
  <div className="w-full">
   <div className="mb-2 flex items-center gap-1.5 text-xs font-inter font-semibold text-muted-foreground uppercase tracking-wide">
    <CalendarPlus className="w-3.5 h-3.5" />
    Add to calendar
   </div>
   <div className="flex flex-wrap gap-2">
    <a href={googleUrl} target="_blank" rel="noopener noreferrer" className={btn}>
     <Calendar className="w-3.5 h-3.5" />
     Google
    </a>
    <button type="button" onClick={handleAppleClick} className={btn}>
     <Apple className="w-3.5 h-3.5" />
     Apple
    </button>
    <a href={outlookUrl} target="_blank" rel="noopener noreferrer" className={btn}>
     <Mail className="w-3.5 h-3.5" />
     Outlook
    </a>
   </div>
  </div>
 );
}

// Semantic tone palette → uses theme-aware Tailwind utilities so the page
// looks right in both light and dark mode without a hex code in sight.
const STATUS_TONE_CLASSES: Record<'success' | 'warning' | 'danger', string> = {
 success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
 warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
 danger: 'bg-destructive/10 text-destructive',
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
