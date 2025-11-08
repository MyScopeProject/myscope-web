'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface Event {
  _id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  image?: string;
  price: number;
  ticketsAvailable: number;
  ticketsSold: number;
  category: string;
  organizer: {
    _id: string;
    name: string;
    email: string;
  };
  attendees: string[];
  status: string;
  featured: boolean;
  createdAt: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function EventDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchEvent();
    }
  }, [params.id]);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/events/${params.id}`);
      const data = await response.json();

      if (data.success) {
        setEvent(data.data.event);
      } else {
        setError('Event not found');
      }
    } catch (err) {
      setError('Error fetching event details');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    try {
      setRegistering(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/events/${params.id}/register`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setEvent(data.data.event);
        alert('Successfully registered for event!');
      } else {
        alert(data.message || 'Failed to register for event');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Error registering for event');
    } finally {
      setRegistering(false);
    }
  };

  const handleUnregister = async () => {
    if (!user) return;

    try {
      setRegistering(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/events/${params.id}/unregister`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setEvent(data.data.event);
        alert('Successfully unregistered from event');
      } else {
        alert(data.message || 'Failed to unregister from event');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Error unregistering from event');
    } finally {
      setRegistering(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      full: date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  if (loading) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="pt-16 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <p className="text-gray-400 text-lg mb-4">{error || 'Event not found'}</p>
          <button
            onClick={() => router.push('/events')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
          >
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  const dateInfo = formatDate(event.date);
  const ticketsRemaining = event.ticketsAvailable - event.ticketsSold;
  const isSoldOut = ticketsRemaining <= 0;
  const isRegistered = user && event.attendees.includes(user.id);

  return (
    <div className="pt-16 min-h-screen pb-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <button
          onClick={() => router.push('/events')}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Events
        </button>

        {/* Event Header */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Image and Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Image */}
            <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden">
              {event.image ? (
                <img
                  src={event.image}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-8xl">
                  🎫
                </div>
              )}
              
              {/* Status Badges */}
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                {event.featured && (
                  <span className="px-3 py-1 bg-yellow-500 text-black text-xs font-semibold rounded-full">
                    Featured
                  </span>
                )}
                {isSoldOut && (
                  <span className="px-3 py-1 bg-red-500 text-white text-xs font-semibold rounded-full">
                    Sold Out
                  </span>
                )}
              </div>
            </div>

            {/* Event Information */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 bg-blue-600 text-white text-sm font-semibold rounded-full">
                  {event.category}
                </span>
                <span className="px-3 py-1 bg-gray-700 text-gray-300 text-sm rounded-full">
                  {event.status}
                </span>
              </div>

              <h1 className="text-4xl font-bold mb-4 bg-linear-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                {event.title}
              </h1>

              <div className="space-y-4 mb-6">
                {/* Date */}
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <div className="font-semibold">{dateInfo.full}</div>
                    <div className="text-gray-400">{dateInfo.time}</div>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <div className="font-semibold">{event.location}</div>
                  </div>
                </div>

                {/* Organizer */}
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <div>
                    <div className="text-gray-400 text-sm">Organized by</div>
                    <div className="font-semibold">{event.organizer.name}</div>
                  </div>
                </div>

                {/* Attendees */}
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <div>
                    <div className="font-semibold">{event.attendees.length} {event.attendees.length === 1 ? 'person' : 'people'} registered</div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-700 pt-6">
                <h2 className="text-xl font-semibold mb-3">About This Event</h2>
                <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {event.description}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Ticket Card */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 sticky top-24">
              <div className="mb-6">
                <div className="text-gray-400 text-sm mb-1">Ticket Price</div>
                <div className="text-4xl font-bold text-blue-400">
                  {event.price === 0 ? 'Free' : `$${event.price}`}
                </div>
              </div>

              <div className="mb-6 pb-6 border-b border-gray-700">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400">Available Tickets</span>
                  <span className="font-semibold">{event.ticketsAvailable}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400">Tickets Sold</span>
                  <span className="font-semibold">{event.ticketsSold}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Remaining</span>
                  <span className={`font-semibold ${
                    isSoldOut ? 'text-red-400' : 
                    ticketsRemaining <= 10 ? 'text-orange-400' : 
                    'text-green-400'
                  }`}>
                    {ticketsRemaining}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        isSoldOut ? 'bg-red-500' : 
                        ticketsRemaining <= 10 ? 'bg-orange-500' : 
                        'bg-green-500'
                      }`}
                      style={{ width: `${(event.ticketsSold / event.ticketsAvailable) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {isRegistered ? (
                <div className="space-y-3">
                  <div className="p-3 bg-green-500/10 border border-green-500 rounded-lg text-green-400 text-sm text-center">
                    ✓ You're registered for this event
                  </div>
                  <button
                    onClick={handleUnregister}
                    disabled={registering}
                    className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {registering ? 'Processing...' : 'Unregister'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleRegister}
                  disabled={isSoldOut || registering}
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {registering ? 'Processing...' : isSoldOut ? 'Sold Out' : 'Register Now'}
                </button>
              )}

              {!user && !isSoldOut && (
                <p className="text-gray-400 text-sm text-center mt-3">
                  You need to login to register for this event
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
