'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import { Ticket, Calendar, Clock, MapPin, X, AlertCircle, CheckCircle, XCircle, Film, Loader } from 'lucide-react';

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed':
        return { bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)', text: '#10B981', icon: CheckCircle };
      case 'Cancelled':
        return { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', text: '#EF4444', icon: XCircle };
      case 'Completed':
        return { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)', text: '#3B82F6', icon: CheckCircle };
      default:
        return { bg: 'rgba(156, 163, 175, 0.1)', border: 'rgba(156, 163, 175, 0.3)', text: '#9CA3AF', icon: AlertCircle };
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return { bg: 'rgba(16, 185, 129, 0.1)', text: '#10B981', label: 'Paid' };
      case 'Pending':
        return { bg: 'rgba(245, 158, 11, 0.1)', text: '#F59E0B', label: 'Pending' };
      case 'Failed':
        return { bg: 'rgba(239, 68, 68, 0.1)', text: '#EF4444', label: 'Failed' };
      case 'Refunded':
        return { bg: 'rgba(59, 130, 246, 0.1)', text: '#3B82F6', label: 'Refunded' };
      default:
        return { bg: 'rgba(156, 163, 175, 0.1)', text: '#9CA3AF', label: status };
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
      <div className="pt-16 min-h-screen pb-24" style={{ backgroundColor: '#07060A' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{
              borderColor: 'rgba(183, 148, 246, 0.3)',
              borderTopColor: '#B794F6',
            }} />
            <p className="font-inter" style={{ color: '#9B95B5' }}>Loading your bookings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-16 min-h-screen pb-24" style={{ backgroundColor: '#07060A' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-5xl md:text-6xl font-outfit font-bold mb-4" style={{
            background: 'linear-gradient(110deg, #B794F6, #C4B5FD)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.04em',
          }}>
            My Bookings
          </h1>
          <p className="text-lg font-inter" style={{ color: '#9B95B5' }}>
            Manage your movie tickets and event bookings
          </p>
        </motion.div>

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 rounded-lg border font-inter flex items-center gap-3"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderColor: 'rgba(239, 68, 68, 0.3)',
              color: '#EF4444',
            }}
          >
            <AlertCircle size={20} />
            <span>{error}</span>
          </motion.div>
        )}

        {/* Movies / Events selector */}
        <div className="mb-6 flex gap-2 p-1 rounded-xl w-fit" style={{ background: '#15121D', border: '1px solid rgba(196,181,253,0.1)' }}>
          {(['movies', 'events'] as const).map(k => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className="px-5 py-2 rounded-lg font-inter font-semibold text-sm inline-flex items-center gap-2 transition-colors"
              style={{
                background: kind === k ? '#A78BFA' : 'transparent',
                color: kind === k ? '#07060A' : '#9B95B5',
              }}
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
              className="px-6 py-3 rounded-lg font-inter font-semibold transition-all duration-300"
              style={{
                background: filter === filterOption ? '#B794F6' : '#15121D',
                color: filter === filterOption ? '#07060A' : '#9B95B5',
                border: `1px solid ${filter === filterOption ? '#B794F6' : 'rgba(196, 181, 253, 0.1)'}`,
              }}
              onMouseEnter={(e) => {
                if (filter !== filterOption) {
                  e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.3)';
                  e.currentTarget.style.background = '#1E1A2B';
                }
              }}
              onMouseLeave={(e) => {
                if (filter !== filterOption) {
                  e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.1)';
                  e.currentTarget.style.background = '#15121D';
                }
              }}
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
            className="rounded-xl border p-12 text-center"
            style={{
              background: '#15121D',
              borderColor: 'rgba(196, 181, 253, 0.1)',
            }}
          >
            <div className="text-6xl mb-4">🎫</div>
            <p className="text-xl font-outfit mb-2" style={{ color: '#F5F3FA' }}>
              No {filter !== 'all' ? filter.toLowerCase() : ''} bookings
            </p>
            <p className="font-inter mb-6" style={{ color: '#9B95B5' }}>
              {filter === 'all' ? 'Book tickets for your favorite movies and events!' : 'No bookings with this status yet'}
            </p>
            <button
              onClick={() => router.push('/movies')}
              className="px-6 py-3 rounded-lg font-inter font-semibold"
              style={{
                background: '#A78BFA',
                color: '#07060A',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#B794F6')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#A78BFA')}
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
            {filteredBookings.map((booking, idx) => {
              const statusColor = getStatusColor(booking.status);
              const paymentColor = getPaymentStatusColor(booking.paymentStatus);
              const isPast = isPastShowtime(booking.showtime.date);
              const StatusIcon = statusColor.icon;

              return (
                <motion.div
                  key={booking._id}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
                  }}
                  className="rounded-xl border overflow-hidden transition-all duration-300"
                  style={{
                    background: '#15121D',
                    borderColor: 'rgba(196, 181, 253, 0.1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.3)';
                    e.currentTarget.style.boxShadow = '0 24px 50px rgba(167, 139, 250, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div className="p-6 md:p-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                      {/* Movie Info */}
                      <div className="md:col-span-2">
                        <h3 className="text-xl font-outfit font-bold mb-3" style={{ color: '#F5F3FA' }}>
                          {booking.movie.title}
                        </h3>
                        <div className="space-y-2 font-inter text-sm">
                          <div className="flex items-center gap-2" style={{ color: '#9B95B5' }}>
                            <MapPin size={16} />
                            <span>{booking.theatre.name}</span>
                          </div>
                          <div className="flex items-center gap-2" style={{ color: '#9B95B5' }}>
                            <MapPin size={16} />
                            <span className="line-clamp-1">{booking.theatre.location}</span>
                          </div>
                        </div>
                      </div>

                      {/* Showtime */}
                      <div>
                        <p className="text-xs font-inter uppercase mb-2" style={{ color: '#9B95B5' }}>Showtime</p>
                        <p className="text-lg font-outfit font-bold mb-1" style={{ color: '#B794F6' }}>
                          {formatDate(booking.showtime.date)}
                        </p>
                        <p className="font-inter" style={{ color: '#9B95B5' }}>
                          {formatTime(booking.showtime.time)}
                        </p>
                      </div>

                      {/* Status */}
                      <div>
                        <p className="text-xs font-inter uppercase mb-2" style={{ color: '#9B95B5' }}>Status</p>
                        <div
                          className="px-3 py-2 rounded-lg border flex items-center gap-2 font-inter font-semibold text-sm w-fit"
                          style={{
                            background: statusColor.bg,
                            borderColor: statusColor.border,
                            color: statusColor.text,
                          }}
                        >
                          <StatusIcon size={16} />
                          {booking.status}
                        </div>
                      </div>
                    </div>

                    {/* Divider */}
                    <div style={{ borderTop: '1px solid rgba(196, 181, 253, 0.1)', margin: '16px 0' }} />

                    {/* Booking Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      {/* Seats */}
                      <div>
                        <p className="text-xs font-inter uppercase mb-2" style={{ color: '#9B95B5' }}>Seats</p>
                        <p className="font-outfit text-lg font-bold" style={{ color: '#F5F3FA' }}>
                          {booking.seats.map(s => s.seatNumber).join(', ')}
                        </p>
                      </div>

                      {/* Booking Reference */}
                      <div>
                        <p className="text-xs font-inter uppercase mb-2" style={{ color: '#9B95B5' }}>Booking Reference</p>
                        <p className="font-mono text-sm font-bold" style={{ color: '#A78BFA' }}>
                          {booking.bookingReference}
                        </p>
                      </div>

                      {/* Payment Status */}
                      <div>
                        <p className="text-xs font-inter uppercase mb-2" style={{ color: '#9B95B5' }}>Payment</p>
                        <div
                          className="px-3 py-2 rounded-lg font-inter font-semibold text-sm w-fit"
                          style={{
                            background: paymentColor.bg,
                            color: paymentColor.text,
                          }}
                        >
                          {paymentColor.label}
                        </div>
                      </div>
                    </div>

                    {/* Total & Actions */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-inter uppercase mb-1" style={{ color: '#9B95B5' }}>Total Amount</p>
                        <p className="text-2xl font-outfit font-bold" style={{ color: '#B794F6' }}>
                          ₹{booking.totalAmount.toLocaleString()}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3">
                        <button
                          onClick={() => router.push(`/bookings/${booking._id}`)}
                          className="px-6 py-2 rounded-lg font-inter font-semibold transition-all duration-300"
                          style={{
                            background: '#1E1A2B',
                            border: '1px solid rgba(196, 181, 253, 0.1)',
                            color: '#B794F6',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.3)';
                            e.currentTarget.style.background = '#2A2636';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.1)';
                            e.currentTarget.style.background = '#1E1A2B';
                          }}
                        >
                          View Details
                        </button>

                        {!isPast && booking.status === 'Confirmed' && (
                          <button
                            onClick={() => handleCancelBooking(booking._id)}
                            className="px-6 py-2 rounded-lg font-inter font-semibold transition-all duration-300"
                            style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              color: '#EF4444',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                            }}
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
            <div className="flex justify-center py-16"><Loader className="w-8 h-8 animate-spin text-purple-400" /></div>
          ) : eventBookings.length === 0 ? (
            <div className="rounded-xl border p-12 text-center" style={{ background: '#15121D', borderColor: 'rgba(196, 181, 253, 0.1)' }}>
              <div className="text-6xl mb-4">🎟️</div>
              <p className="text-xl font-outfit mb-2" style={{ color: '#F5F3FA' }}>No event bookings yet</p>
              <p className="font-inter mb-6" style={{ color: '#9B95B5' }}>Discover events happening near you.</p>
              <button
                type="button"
                onClick={() => router.push('/events')}
                className="px-6 py-3 rounded-lg font-inter font-semibold"
                style={{ background: '#A78BFA', color: '#07060A' }}
              >
                Browse Events
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {eventBookings.map(eb => {
                const total = Number(eb.total_amount) || 0;
                const statusMeta = (() => {
                  switch (eb.status) {
                    case 'Confirmed': return { bg: 'rgba(16,185,129,0.1)', color: '#10B981', label: eb.checked_in_at ? 'Checked in' : 'Confirmed' };
                    case 'Pending':   return { bg: 'rgba(245,158,11,0.1)', color: '#F59E0B', label: 'Pending payment' };
                    case 'Cancelled': return { bg: 'rgba(239,68,68,0.1)',  color: '#EF4444', label: 'Cancelled' };
                    case 'Refunded':  return { bg: 'rgba(59,130,246,0.1)', color: '#3B82F6', label: 'Refunded' };
                    default:          return { bg: 'rgba(156,163,175,0.1)', color: '#9CA3AF', label: eb.status };
                  }
                })();

                return (
                  <Link
                    key={eb.id}
                    href={`/bookings/event/${eb.id}`}
                    className="block rounded-xl border p-6 transition-colors"
                    style={{ background: '#15121D', borderColor: 'rgba(196, 181, 253, 0.1)' }}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      <div className="md:col-span-5">
                        <h3 className="text-lg font-outfit font-bold" style={{ color: '#F5F3FA' }}>
                          {eb.event?.title ?? '(deleted event)'}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 text-xs font-inter" style={{ color: '#9B95B5' }}>
                          {eb.event?.date && (
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(eb.event.date).toLocaleDateString()}
                            </span>
                          )}
                          {eb.event?.location && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              <span className="line-clamp-1">{eb.event.location}</span>
                            </span>
                          )}
                        </div>
                        <p className="font-mono text-xs mt-2" style={{ color: '#A78BFA' }}>{eb.booking_reference}</p>
                      </div>

                      <div className="md:col-span-2">
                        <p className="text-[10px] uppercase font-inter" style={{ color: '#9B95B5' }}>Tickets</p>
                        <p className="font-outfit text-lg font-bold" style={{ color: '#F5F3FA' }}>{eb.number_of_tickets}</p>
                      </div>

                      <div className="md:col-span-2">
                        <p className="text-[10px] uppercase font-inter" style={{ color: '#9B95B5' }}>Total</p>
                        <p className="font-outfit text-lg font-bold" style={{ color: '#B794F6' }}>LKR {total.toLocaleString()}</p>
                      </div>

                      <div className="md:col-span-3">
                        <span
                          className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-inter font-semibold"
                          style={{ background: statusMeta.bg, color: statusMeta.color }}
                        >
                          {statusMeta.label}
                        </span>
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
