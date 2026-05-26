'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import { Ticket, Calendar, MapPin, AlertCircle, CheckCircle, XCircle, Film, Loader, Send } from 'lucide-react';

interface Booking {
  _id: string;
  movie: {
    _id: string;
    title: string;
    poster: string;
    duration: string;
    rating: string;
    language: string;
  };
  theatre: {
    name: string;
    location: string;
  };
  showtime: {
    date: string;
    time: string;
  };
  seats: Array<{
    seatNumber: string;
    type: string;
    price: number;
  }>;
  totalAmount: number;
  bookingReference: string;
  paymentStatus: string;
  status: string;
  bookingDate: string;
}

// Event-side bookings come from the snake_case checkout flow (Step 6)
interface EventBookingRow {
  id: string;
  booking_reference: string;
  number_of_tickets: number;
  ticket_price: number | string;
  total_amount: number | string;
  status: 'Pending' | 'Confirmed' | 'Cancelled' | 'Refunded';
  payment_status: string;
  created_at: string;
  checked_in_at: string | null;
  // True when this booking was issued as a comp via the organizer's Invite
  // tab. Drives the small "Invitee ticket" tag on each row.
  is_invitation?: boolean;
  event?: {
    id: string;
    title: string;
    date: string | null;
    location: string | null;
  } | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function MyBookingsPage() {
  const router = useRouter();
  const { user, token } = useAuth();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [eventBookings, setEventBookings] = useState<EventBookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventLoading, setEventLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'Confirmed' | 'Cancelled' | 'Completed'>('all');
  const [kind, setKind] = useState<'movies' | 'events'>('movies');

  useEffect(() => {
    if (!user) {
      router.push('/auth/login?redirect=/bookings');
      return;
    }
    fetchBookings();
    fetchEventBookings();
  }, [user]);

  const fetchEventBookings = async () => {
    try {
      setEventLoading(true);
      const res = await fetch(`${API_URL}/api/event-bookings`, { credentials: 'include' });
      const data = await res.json();
      if (data?.success) {
        setEventBookings((data.data?.bookings ?? data.data ?? []) as EventBookingRow[]);
      }
    } catch (err) {
      console.error('Event bookings fetch failed:', err);
    } finally {
      setEventLoading(false);
    }
  };

  useEffect(() => {
    if (filter === 'all') {
      setFilteredBookings(bookings);
    } else {
      setFilteredBookings(bookings.filter(b => b.status === filter));
    }
  }, [filter, bookings]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError('');

      const res = await fetch(`${API_URL}/api/bookings`, {
        credentials: 'include',
      });

      const data = await res.json();

      if (data.success) {
        setBookings(data.data || []);
        setFilteredBookings(data.data || []);
      } else {
        setError(data.message || 'Failed to load bookings');
      }
    } catch (err) {
      setError('Error fetching bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
      const res = await fetch(`${API_URL}/api/bookings/${bookingId}/cancel`, {
        method: 'PUT',
        credentials: 'include',
      });

      const data = await res.json();

      if (data.success) {
        alert('Booking cancelled successfully');
        fetchBookings();
      } else {
        alert(data.message || 'Failed to cancel booking');
      }
    } catch (err) {
      alert('Error cancelling booking');
    }
  };

  // Theme-aware status classes. Same colour family (emerald/amber/blue/etc.)
  // but uses Tailwind utilities with dark: variants so the chips adapt to mode.
  const getStatusMeta = (status: string) => {
    switch (status) {
      case 'Confirmed':
        return { className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', icon: CheckCircle };
      case 'Cancelled':
        return { className: 'border-destructive/30 bg-destructive/10 text-destructive', icon: XCircle };
      case 'Completed':
        return { className: 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400', icon: CheckCircle };
      default:
        return { className: 'border-border bg-muted text-muted-foreground', icon: AlertCircle };
    }
  };

  const getPaymentStatusMeta = (status: string) => {
    switch (status) {
      case 'Completed':
        return { className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', label: 'Paid' };
      case 'Pending':
        return { className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', label: 'Pending' };
      case 'Failed':
        return { className: 'bg-destructive/10 text-destructive', label: 'Failed' };
      case 'Refunded':
        return { className: 'bg-sky-500/10 text-sky-600 dark:text-sky-400', label: 'Refunded' };
      default:
        return { className: 'bg-muted text-muted-foreground', label: status };
    }
  };

  const isPastShowtime = (showtimeDate: string) => {
    return new Date(showtimeDate) < new Date();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (timeString: string) => {
    const date = new Date(`2024-01-01T${timeString}`);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  if (loading) {
    return (
      <div className="pt-16 min-h-screen pb-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center py-12">
            <Loader className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
            <p className="font-inter text-muted-foreground">Loading your bookings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-16 min-h-screen pb-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-5xl md:text-6xl font-outfit font-bold mb-4 tracking-tight text-foreground">
            My Bookings
          </h1>
          <p className="text-lg font-inter text-muted-foreground">
            Manage your movie tickets and event bookings
          </p>
        </motion.div>

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive font-inter flex items-center gap-3"
          >
            <AlertCircle size={20} />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Movies / Events selector */}
        <div className="mb-6 flex gap-2 p-1 rounded-xl w-fit bg-card border border-border">
          {(['movies', 'events'] as const).map(k => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`px-5 py-2 rounded-lg font-inter font-semibold text-sm inline-flex items-center gap-2 transition-colors ${
                kind === k
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {k === 'movies' ? <Film className="w-4 h-4" /> : <Ticket className="w-4 h-4" />}
              {k === 'movies' ? `Movies (${bookings.length})` : `Events (${eventBookings.length})`}
            </button>
          ))}
        </div>

        {/* Filter Tabs — only meaningful for movies (event statuses differ) */}
        {kind === 'movies' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-8 flex flex-wrap gap-3"
        >
          {['all', 'Confirmed', 'Completed', 'Cancelled'].map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption as any)}
              className={`px-6 py-3 rounded-lg font-inter font-semibold transition-colors border ${
                filter === filterOption
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground hover:bg-muted'
              }`}
            >
              {filterOption === 'all' ? 'All Bookings' : filterOption}
            </button>
          ))}
        </motion.div>
        )}

        {/* Bookings List */}
        {kind === 'movies' && (filteredBookings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border border-border bg-card p-12 text-center"
          >
            <div className="text-6xl mb-4">🎫</div>
            <p className="text-xl font-outfit mb-2 text-foreground">
              No {filter !== 'all' ? filter.toLowerCase() : ''} bookings
            </p>
            <p className="font-inter mb-6 text-muted-foreground">
              {filter === 'all' ? 'Book tickets for your favorite movies and events!' : 'No bookings with this status yet'}
            </p>
            <button
              onClick={() => router.push('/movies')}
              className="px-6 py-3 rounded-lg font-inter font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Browse Movies
            </button>
          </motion.div>
        ) : (
          <motion.div
            className="space-y-4"
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: { staggerChildren: 0.1 },
              },
            }}
          >
            {filteredBookings.map((booking) => {
              const statusMeta = getStatusMeta(booking.status);
              const paymentMeta = getPaymentStatusMeta(booking.paymentStatus);
              const isPast = isPastShowtime(booking.showtime.date);
              const StatusIcon = statusMeta.icon;

              return (
                <motion.div
                  key={booking._id}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
                  }}
                  className="rounded-xl border border-border bg-card overflow-hidden transition-colors hover:border-primary/40"
                >
                  <div className="p-6 md:p-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                      {/* Movie Info */}
                      <div className="md:col-span-2">
                        <h3 className="text-xl font-outfit font-bold mb-3 text-foreground">
                          {booking.movie.title}
                        </h3>
                        <div className="space-y-2 font-inter text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin size={16} />
                            <span>{booking.theatre.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin size={16} />
                            <span className="line-clamp-1">{booking.theatre.location}</span>
                          </div>
                        </div>
                      </div>

                      {/* Showtime */}
                      <div>
                        <p className="text-xs font-inter uppercase mb-2 text-muted-foreground">Showtime</p>
                        <p className="text-lg font-outfit font-bold mb-1 text-primary">
                          {formatDate(booking.showtime.date)}
                        </p>
                        <p className="font-inter text-muted-foreground">
                          {formatTime(booking.showtime.time)}
                        </p>
                      </div>

                      {/* Status */}
                      <div>
                        <p className="text-xs font-inter uppercase mb-2 text-muted-foreground">Status</p>
                        <div className={`px-3 py-2 rounded-lg border flex items-center gap-2 font-inter font-semibold text-sm w-fit ${statusMeta.className}`}>
                          <StatusIcon size={16} />
                          {booking.status}
                        </div>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-border my-4" />

                    {/* Booking Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      {/* Seats */}
                      <div>
                        <p className="text-xs font-inter uppercase mb-2 text-muted-foreground">Seats</p>
                        <p className="font-outfit text-lg font-bold text-foreground">
                          {booking.seats.map(s => s.seatNumber).join(', ')}
                        </p>
                      </div>

                      {/* Booking Reference */}
                      <div>
                        <p className="text-xs font-inter uppercase mb-2 text-muted-foreground">Booking Reference</p>
                        <p className="font-mono text-sm font-bold text-primary">
                          {booking.bookingReference}
                        </p>
                      </div>

                      {/* Payment Status */}
                      <div>
                        <p className="text-xs font-inter uppercase mb-2 text-muted-foreground">Payment</p>
                        <div className={`px-3 py-2 rounded-lg font-inter font-semibold text-sm w-fit ${paymentMeta.className}`}>
                          {paymentMeta.label}
                        </div>
                      </div>
                    </div>

                    {/* Total & Actions */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-inter uppercase mb-1 text-muted-foreground">Total Amount</p>
                        <p className="text-2xl font-outfit font-bold text-primary">
                          ₹{booking.totalAmount.toLocaleString()}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3">
                        <button
                          onClick={() => router.push(`/bookings/${booking._id}`)}
                          className="px-6 py-2 rounded-lg font-inter font-semibold border border-border bg-muted text-foreground hover:bg-muted/70 hover:border-primary/40 transition-colors"
                        >
                          View Details
                        </button>

                        {!isPast && booking.status === 'Confirmed' && (
                          <button
                            onClick={() => handleCancelBooking(booking._id)}
                            className="px-6 py-2 rounded-lg font-inter font-semibold border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15 transition-colors"
                          >
                            Cancel Booking
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ))}

        {/* Events list */}
        {kind === 'events' && (
          eventLoading ? (
            <div className="flex justify-center py-16"><Loader className="w-8 h-8 animate-spin text-primary" /></div>
          ) : eventBookings.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <div className="text-6xl mb-4">🎟️</div>
              <p className="text-xl font-outfit mb-2 text-foreground">No event bookings yet</p>
              <p className="font-inter mb-6 text-muted-foreground">Discover events happening near you.</p>
              <button
                type="button"
                onClick={() => router.push('/events')}
                className="px-6 py-3 rounded-lg font-inter font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Browse Events
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {eventBookings.map(eb => {
                const total = Number(eb.total_amount) || 0;
                // Mirrors getStatusMeta but with event-specific labels.
                const statusMeta = (() => {
                  switch (eb.status) {
                    case 'Confirmed': return { className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', label: eb.checked_in_at ? 'Checked in' : 'Confirmed' };
                    case 'Pending':   return { className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', label: 'Pending payment' };
                    case 'Cancelled': return { className: 'bg-destructive/10 text-destructive', label: 'Cancelled' };
                    case 'Refunded':  return { className: 'bg-sky-500/10 text-sky-600 dark:text-sky-400', label: 'Refunded' };
                    default:          return { className: 'bg-muted text-muted-foreground', label: eb.status };
                  }
                })();

                return (
                  <Link
                    key={eb.id}
                    href={`/bookings/event/${eb.id}`}
                    className="block rounded-xl border border-border bg-card p-4 sm:p-6 transition-colors hover:border-primary/40"
                  >
                    {/* On mobile: event info stacks above a 3-col mini-grid of meta.
                        On md+: everything is a single 12-col row. The `md:contents`
                        trick lets the mobile wrapper "vanish" at desktop so its
                        children become direct grid items of the parent. */}
                    <div className="flex flex-col gap-4 md:grid md:grid-cols-12 md:items-center">
                      <div className="md:col-span-5">
                        <div className="flex flex-wrap items-start gap-2">
                          <h3 className="text-base sm:text-lg font-outfit font-bold text-foreground line-clamp-2">
                            {eb.event?.title ?? '(deleted event)'}
                          </h3>
                          {/* Comp-ticket marker: this booking was issued via the
                              organizer's Invite tab, so it's a complimentary
                              ticket rather than something the user purchased. */}
                          {eb.is_invitation && (
                            <span
                              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary"
                              title="Complimentary ticket from the organizer"
                            >
                              <Send className="w-3 h-3" /> Invitee ticket
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs font-inter text-muted-foreground">
                          {eb.event?.date && (
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(eb.event.date).toLocaleDateString()}
                            </span>
                          )}
                          {eb.event?.location && (
                            <span className="inline-flex items-center gap-1 min-w-0">
                              <MapPin className="w-3.5 h-3.5 shrink-0" />
                              <span className="line-clamp-1">{eb.event.location}</span>
                            </span>
                          )}
                        </div>
                        <p className="font-mono text-xs mt-2 text-primary">{eb.booking_reference}</p>
                      </div>

                      <div className="grid grid-cols-3 gap-3 md:contents">
                        <div className="md:col-span-2">
                          <p className="text-[10px] uppercase font-inter text-muted-foreground">Tickets</p>
                          <p className="font-outfit text-base sm:text-lg font-bold text-foreground">{eb.number_of_tickets}</p>
                        </div>

                        <div className="md:col-span-2">
                          <p className="text-[10px] uppercase font-inter text-muted-foreground">Total</p>
                          <p className="font-outfit text-base sm:text-lg font-bold text-primary whitespace-nowrap">
                            LKR {total.toLocaleString()}
                          </p>
                        </div>

                        <div className="md:col-span-3 flex md:block">
                          <span className={`inline-flex items-center px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-inter font-semibold ${statusMeta.className}`}>
                            {statusMeta.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}
