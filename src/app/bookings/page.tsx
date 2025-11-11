'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function MyBookingsPage() {
  const router = useRouter();
  const { user, token } = useAuth();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'Confirmed' | 'Cancelled' | 'Completed'>('all');

  useEffect(() => {
    if (!user) {
      router.push('/auth/login?redirect=/bookings');
      return;
    }
    fetchBookings();
  }, [user]);

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
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (data.success) {
        alert('Booking cancelled successfully');
        fetchBookings(); // Refresh list
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
        return 'bg-green-500/10 text-green-400 border-green-500';
      case 'Cancelled':
        return 'bg-red-500/10 text-red-400 border-red-500';
      case 'Completed':
        return 'bg-blue-500/10 text-blue-400 border-blue-500';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'text-green-400';
      case 'Pending':
        return 'text-yellow-400';
      case 'Failed':
        return 'text-red-400';
      case 'Refunded':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  };

  const isPastShowtime = (showtimeDate: string) => {
    return new Date(showtimeDate) < new Date();
  };

  if (loading) {
    return (
      <div className="pt-16 min-h-screen pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading your bookings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-16 min-h-screen pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Bookings</h1>
          <p className="text-gray-400">View and manage your movie bookings</p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-3 flex-wrap">
          {(['all', 'Confirmed', 'Cancelled', 'Completed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === status
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {status === 'all' ? 'All Bookings' : status}
              {status !== 'all' && (
                <span className="ml-2 text-sm">
                  ({bookings.filter(b => b.status === status).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Bookings List */}
        {filteredBookings.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded-xl border border-gray-700">
            <div className="text-6xl mb-4">🎫</div>
            <p className="text-gray-400 text-lg mb-4">
              {filter === 'all' ? 'No bookings yet' : `No ${filter.toLowerCase()} bookings`}
            </p>
            <button
              onClick={() => router.push('/movies')}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-all"
            >
              Browse Movies
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <div
                key={booking._id}
                className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-red-500 transition-all"
              >
                <div className="md:flex">
                  {/* Movie Poster */}
                  <div className="md:w-48 h-64 md:h-auto bg-gray-900 flex-shrink-0">
                    {booking.movie.poster ? (
                      <img
                        src={booking.movie.poster}
                        alt={booking.movie.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-6xl">
                        🎬
                      </div>
                    )}
                  </div>

                  {/* Booking Details */}
                  <div className="flex-1 p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-2xl font-bold mb-2">{booking.movie.title}</h3>
                        <p className="text-gray-400 text-sm">
                          {booking.movie.duration} • {booking.movie.language} • {booking.movie.rating}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <span className={`px-3 py-1 border rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                          {booking.status}
                        </span>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Theatre</p>
                        <p className="font-semibold">{booking.theatre.name}</p>
                        <p className="text-sm text-gray-400">{booking.theatre.location}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Showtime</p>
                        <p className="font-semibold">
                          {new Date(booking.showtime.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                        <p className="text-sm text-gray-400">{booking.showtime.time}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Seats</p>
                        <p className="font-semibold">
                          {booking.seats.map(s => s.seatNumber).join(', ')}
                        </p>
                        <p className="text-sm text-gray-400">{booking.seats.length} seat(s)</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Booking Reference</p>
                        <p className="font-semibold font-mono">{booking.bookingReference}</p>
                        <p className={`text-sm ${getPaymentStatusColor(booking.paymentStatus)}`}>
                          Payment: {booking.paymentStatus}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-gray-700">
                      <div>
                        <p className="text-sm text-gray-400">Total Amount</p>
                        <p className="text-2xl font-bold text-red-400">Rs {booking.totalAmount.toLocaleString()}</p>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => router.push(`/bookings/${booking._id}`)}
                          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-all"
                        >
                          View Details
                        </button>
                        {booking.status === 'Confirmed' && !isPastShowtime(booking.showtime.date) && (
                          <button
                            onClick={() => handleCancelBooking(booking._id)}
                            className="px-4 py-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500 rounded-lg font-medium transition-all"
                          >
                            Cancel Booking
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
