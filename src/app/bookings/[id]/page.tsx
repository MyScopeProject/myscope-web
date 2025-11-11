'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface Booking {
  _id: string;
  user: {
    name: string;
    email: string;
  };
  movie: {
    _id: string;
    title: string;
    poster: string;
    duration: string;
    rating: string;
    language: string;
    trailer?: string;
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
  paymentMethod: string;
  status: string;
  bookingDate: string;
  createdAt: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function BookingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, token } = useAuth();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      router.push(`/auth/login?redirect=/bookings/${bookingId}`);
      return;
    }
    fetchBooking();
  }, [bookingId, user]);

  const fetchBooking = async () => {
    try {
      setLoading(true);
      setError('');

      const res = await fetch(`${API_URL}/api/bookings/${bookingId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (data.success) {
        setBooking(data.data);
      } else {
        setError(data.message || 'Booking not found');
      }
    } catch (err) {
      setError('Error fetching booking details');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) return;

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
        fetchBooking(); // Refresh
      } else {
        alert(data.message || 'Failed to cancel booking');
      }
    } catch (err) {
      alert('Error cancelling booking');
    }
  };

  const handlePrint = () => {
    window.print();
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

  const isPastShowtime = (showtimeDate: string) => {
    return new Date(showtimeDate) < new Date();
  };

  if (loading) {
    return (
      <div className="pt-16 min-h-screen pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading booking details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="pt-16 min-h-screen pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-400 mb-4">
            {error || 'Booking not found'}
          </div>
          <button
            onClick={() => router.push('/bookings')}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-all"
          >
            ← Back to Bookings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-16 min-h-screen pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-6 print:hidden">
          <button
            onClick={() => router.push('/bookings')}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Bookings
          </button>
        </div>

        {/* Booking Confirmation Card */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden mb-6">
          {/* Success Banner */}
          <div className="bg-green-600 p-4 text-center">
            <div className="text-4xl mb-2">✓</div>
            <h1 className="text-2xl font-bold">Booking Confirmed</h1>
            <p className="text-green-100 mt-1">Your tickets have been reserved</p>
          </div>

          {/* Booking Reference */}
          <div className="bg-gray-900 p-6 text-center">
            <p className="text-sm text-gray-400 mb-2">Booking Reference</p>
            <p className="text-3xl font-bold font-mono tracking-wider text-red-400">
              {booking.bookingReference}
            </p>
            <div className="mt-4 flex gap-2 justify-center">
              <span className={`px-4 py-1.5 border rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                {booking.status}
              </span>
              <span className={`px-4 py-1.5 border rounded-full text-sm font-medium ${
                booking.paymentStatus === 'Completed' ? 'bg-green-500/10 text-green-400 border-green-500' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500'
              }`}>
                Payment: {booking.paymentStatus}
              </span>
            </div>
          </div>

          {/* Movie Details */}
          <div className="p-6">
            <div className="flex gap-6 mb-6">
              <div className="w-32 h-48 bg-gray-900 rounded-lg overflow-hidden shrink-0">
                {booking.movie.poster ? (
                  <img
                    src={booking.movie.poster}
                    alt={booking.movie.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">
                    🎬
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">{booking.movie.title}</h2>
                <p className="text-gray-400 mb-4">
                  {booking.movie.duration} • {booking.movie.language} • {booking.movie.rating}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Theatre</p>
                    <p className="font-semibold">{booking.theatre.name}</p>
                    <p className="text-sm text-gray-400">{booking.theatre.location}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Date & Time</p>
                    <p className="font-semibold">
                      {new Date(booking.showtime.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-gray-400">{booking.showtime.time}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Seats */}
            <div className="bg-gray-900 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-400 mb-3">Your Seats</p>
              <div className="flex flex-wrap gap-2">
                {booking.seats.map((seat, idx) => (
                  <div
                    key={idx}
                    className="px-4 py-2 bg-red-600 rounded-lg font-semibold"
                  >
                    {seat.seatNumber}
                    <span className="ml-2 text-sm text-red-200">({seat.type})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="bg-gray-900 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-400 mb-3">Price Breakdown</p>
              <div className="space-y-2">
                {booking.seats.map((seat, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>
                      {seat.seatNumber} ({seat.type})
                    </span>
                    <span className="font-semibold">Rs {seat.price.toLocaleString()}</span>
                  </div>
                ))}
                <div className="border-t border-gray-700 pt-2 mt-2">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Amount</span>
                    <span className="text-red-400">Rs {booking.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Booking Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400 mb-1">Booked By</p>
                <p className="font-semibold">{booking.user.name}</p>
                <p className="text-gray-400">{booking.user.email}</p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Booking Date</p>
                <p className="font-semibold">
                  {new Date(booking.bookingDate).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="border-t border-gray-700 p-6 flex gap-3 print:hidden">
            <button
              onClick={handlePrint}
              className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Ticket
            </button>
            {booking.status === 'Confirmed' && !isPastShowtime(booking.showtime.date) && (
              <button
                onClick={handleCancelBooking}
                className="px-6 py-3 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500 rounded-lg font-medium transition-all"
              >
                Cancel Booking
              </button>
            )}
          </div>
        </div>

        {/* Important Notes */}
        <div className="bg-yellow-500/10 border border-yellow-500 rounded-lg p-4 print:hidden">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Important Information
          </h3>
          <ul className="text-sm text-gray-300 space-y-1 ml-7">
            <li>• Please arrive 15 minutes before showtime</li>
            <li>• Carry a valid ID proof for verification</li>
            <li>• Save or print this ticket for entry</li>
            <li>• Booking reference: <span className="font-mono font-semibold">{booking.bookingReference}</span></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
