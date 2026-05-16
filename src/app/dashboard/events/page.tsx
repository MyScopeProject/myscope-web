'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Ticket, AlertCircle, Trash2, Eye } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface Event {
  _id: string;
  title: string;
  date: string;
  location: string;
  status: string;
  ticketsRemaining: number;
  price?: number;
  category?: string;
}

export default function EventsDashboardPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [unregisteringId, setUnregisteringId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUserEvents() {
      try {
        const res = await fetch(`${API_URL}/api/events/user`, {
          credentials: 'include',
        });
        const data = await res.json();
        
        if (data.success && data.data?.events) {
          setEvents(data.data.events);
        } else {
          setEvents([]);
        }
      } catch (error) {
        console.error('Failed to fetch user events', error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    }
    if (token) fetchUserEvents();
  }, [token]);

  const handleUnregister = async (event: Event) => {
    if (!confirm(`Are you sure you want to unregister from "${event.title}"?`)) return;
    
    setUnregisteringId(event._id);
    try {
      const res = await fetch(`${API_URL}/api/events/${event._id}/unregister`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        setEvents(prev => prev.filter(e => e._id !== event._id));
        alert('Unregistered successfully');
      } else {
        alert('Failed to unregister');
      }
    } catch (err) {
      alert('Error unregistering');
    } finally {
      setUnregisteringId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return { bg: 'rgba(59, 130, 246, 0.1)', text: '#3B82F6', label: 'Upcoming' };
      case 'ongoing':
        return { bg: 'rgba(16, 185, 129, 0.1)', text: '#10B981', label: 'Ongoing' };
      default:
        return { bg: 'rgba(156, 163, 175, 0.1)', text: '#9CA3AF', label: status };
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8" style={{ backgroundColor: '#07060A', minHeight: '100vh' }}>
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{
            borderColor: 'rgba(183, 148, 246, 0.3)',
            borderTopColor: '#B794F6',
          }} />
          <p className="font-inter" style={{ color: '#9B95B5' }}>Loading your events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8" style={{ backgroundColor: '#07060A', minHeight: '100vh' }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <h1 className="text-4xl md:text-5xl font-outfit font-bold mb-2" style={{
          background: 'linear-gradient(110deg, #B794F6, #C4B5FD)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.04em',
        }}>
          My Events
        </h1>
        <p className="text-lg font-inter" style={{ color: '#9B95B5' }}>
          Manage your registered events
        </p>
      </motion.div>

      {events.length === 0 ? (
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
          <p className="text-2xl font-outfit font-bold mb-2" style={{ color: '#F5F3FA' }}>
            No Events Yet
          </p>
          <p className="font-inter mb-6" style={{ color: '#9B95B5' }}>
            You haven't registered for any events yet. Explore our events to find something exciting!
          </p>
          <button
            onClick={() => router.push('/events')}
            className="px-6 py-3 rounded-lg font-inter font-semibold transition-all duration-300"
            style={{
              background: '#B794F6',
              color: '#07060A',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#C5A3FF';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(183, 148, 246, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#B794F6';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Explore Events
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
          {events.map((event, idx) => {
            const statusColor = getStatusColor(event.status);

            return (
              <motion.div
                key={event._id}
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
                    {/* Event Title & Category */}
                    <div className="md:col-span-2">
                      <h3 className="text-xl font-outfit font-bold mb-3" style={{ color: '#F5F3FA' }}>
                        {event.title}
                      </h3>
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin size={16} style={{ color: '#9B95B5' }} />
                        <span className="text-sm font-inter" style={{ color: '#9B95B5' }}>
                          {event.location}
                        </span>
                      </div>
                      {event.category && (
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-inter font-semibold" style={{
                          backgroundColor: 'rgba(196, 181, 253, 0.1)',
                          color: '#C4B5FD',
                        }}>
                          {event.category}
                        </span>
                      )}
                    </div>

                    {/* Date */}
                    <div>
                      <p className="text-xs font-inter uppercase mb-2" style={{ color: '#9B95B5' }}>Date</p>
                      <div className="flex items-center gap-2">
                        <Calendar size={18} style={{ color: '#B794F6' }} />
                        <p className="font-outfit font-bold" style={{ color: '#B794F6' }}>
                          {formatDate(event.date)}
                        </p>
                      </div>
                    </div>

                    {/* Status */}
                    <div>
                      <p className="text-xs font-inter uppercase mb-2" style={{ color: '#9B95B5' }}>Status</p>
                      <div
                        className="px-3 py-2 rounded-lg text-sm font-inter font-semibold w-fit"
                        style={{
                          backgroundColor: statusColor.bg,
                          color: statusColor.text,
                        }}
                      >
                        {statusColor.label}
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div style={{ borderTop: '1px solid rgba(196, 181, 253, 0.1)', margin: '16px 0' }} />

                  {/* Event Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div>
                      <p className="text-xs font-inter uppercase mb-2" style={{ color: '#9B95B5' }}>Tickets</p>
                      <div className="flex items-center gap-2">
                        <Ticket size={18} style={{ color: '#10B981' }} />
                        <p className="font-outfit font-bold" style={{ color: '#10B981' }}>
                          {event.ticketsRemaining} available
                        </p>
                      </div>
                    </div>
                    {event.price && (
                      <div>
                        <p className="text-xs font-inter uppercase mb-2" style={{ color: '#9B95B5' }}>Price</p>
                        <p className="text-lg font-outfit font-bold" style={{ color: '#B794F6' }}>
                          ₹{event.price.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4" style={{ borderTop: '1px solid rgba(196, 181, 253, 0.1)' }}>
                    <button
                      onClick={() => router.push(`/events/${event._id}`)}
                      className="flex items-center gap-2 px-6 py-2 rounded-lg font-inter font-semibold transition-all duration-300"
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
                      <Eye size={18} />
                      View Details
                    </button>
                    <button
                      onClick={() => handleUnregister(event)}
                      disabled={unregisteringId === event._id}
                      className="flex items-center gap-2 px-6 py-2 rounded-lg font-inter font-semibold transition-all duration-300 disabled:opacity-50"
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#EF4444',
                      }}
                      onMouseEnter={(e) => {
                        if (unregisteringId !== event._id) {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                      }}
                    >
                      <Trash2 size={18} />
                      {unregisteringId === event._id ? 'Unregistering...' : 'Unregister'}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
