'use client';

import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { motion } from 'framer-motion';
import { Calendar, Ticket, Heart, ArrowRight, Clock, MapPin, Users } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface UpcomingEvent {
  _id: string;
  title: string;
  date: string;
  location: string;
  ticketsAvailable: number;
  price: number;
  category: string;
  image?: string;
}

interface DashboardStats {
  eventsAttended: number;
  favoriteCount: number;
  upcomingEventsCount: number;
}

function DashboardContent() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    eventsAttended: 0,
    favoriteCount: 0,
    upcomingEventsCount: 0,
  });
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Fetch upcoming events
      const eventsResponse = await fetch(`${API_URL}/api/events?upcoming=true&limit=6`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const eventsData = await eventsResponse.json();
      
      if (eventsData.success) {
        const events = eventsData.data.events || [];
        setUpcomingEvents(events);
        setStats(prev => ({
          ...prev,
          upcomingEventsCount: events.length
        }));
      }

      setStats(prev => ({
        ...prev,
        eventsAttended: 0,
        favoriteCount: 0,
      }));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatEventTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (!user) return null;

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <div style={{ backgroundColor: '#07060A', color: '#F5F3FA', minHeight: '100vh' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12 md:mb-16"
        >
          <div 
            className="relative rounded-2xl overflow-hidden p-8 md:p-12 border"
            style={{
              background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.15) 0%, rgba(183, 148, 246, 0.1) 100%)',
              borderColor: 'rgba(196, 181, 253, 0.15)',
            }}
          >
            {/* Animated Background Gradient */}
            <motion.div
              animate={{
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
              }}
              className="absolute inset-0 opacity-50 -z-10"
              style={{
                background: 'radial-gradient(circle at 30% 50%, rgba(167, 139, 250, 0.1) 0%, transparent 60%)',
              }}
            />

            <div className="relative z-10">
              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-3xl md:text-5xl font-bold font-outfit mb-4"
                style={{ color: '#F5F3FA' }}
              >
                Welcome back, {user.name}! 👋
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="text-lg font-inter"
                style={{ color: '#9B95B5' }}
              >
                Discover new events, explore amazing movies, and make unforgettable memories
              </motion.p>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="mt-6 flex flex-col sm:flex-row gap-4"
              >
                <Link
                  href="/events"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-inter font-semibold transition-all duration-300"
                  style={{
                    background: '#A78BFA',
                    color: '#F5F3FA',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#B794F6';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#A78BFA';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <Ticket size={20} />
                  Explore Events
                </Link>
                <Link
                  href="/movies"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-inter font-semibold border transition-all duration-300"
                  style={{
                    borderColor: 'rgba(196, 181, 253, 0.3)',
                    color: '#B794F6',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(167, 139, 250, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <span>🎬</span>
                  Browse Movies
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{
              borderColor: 'rgba(183, 148, 246, 0.3)',
              borderTopColor: '#B794F6',
            }} />
            <p className="font-inter" style={{ color: '#9B95B5' }}>Loading your dashboard...</p>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
            >
              {[
                {
                  label: 'Events Attended',
                  value: stats.eventsAttended,
                  icon: Calendar,
                  color: '#A78BFA',
                  bgColor: 'rgba(167, 139, 250, 0.1)',
                },
                {
                  label: 'Favorites',
                  value: stats.favoriteCount,
                  icon: Heart,
                  color: '#B794F6',
                  bgColor: 'rgba(183, 148, 246, 0.1)',
                },
                {
                  label: 'Upcoming Events',
                  value: stats.upcomingEventsCount,
                  icon: Ticket,
                  color: '#D8C7FE',
                  bgColor: 'rgba(216, 199, 254, 0.1)',
                },
              ].map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={idx}
                    variants={itemVariants}
                    className="rounded-xl border p-6 transition-all duration-300"
                    style={{
                      background: '#15121D',
                      borderColor: 'rgba(196, 181, 253, 0.1)',
                    }}
                    whileHover={{
                      borderColor: 'rgba(196, 181, 253, 0.3)',
                      transform: 'translateY(-4px)',
                    }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className="p-3 rounded-lg"
                        style={{ background: stat.bgColor }}
                      >
                        <Icon size={24} style={{ color: stat.color }} />
                      </div>
                      <span className="text-2xl">
                        {idx === 0 ? '🎉' : idx === 1 ? '❤️' : '🎫'}
                      </span>
                    </div>
                    <div className="text-4xl font-bold font-outfit mb-2" style={{ color: stat.color }}>
                      {stat.value}
                    </div>
                    <p className="font-inter text-sm" style={{ color: '#9B95B5' }}>
                      {stat.label}
                    </p>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Upcoming Events Section */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mb-12"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold font-outfit mb-2" style={{ color: '#F5F3FA' }}>
                    Upcoming Events
                  </h2>
                  <p className="font-inter" style={{ color: '#9B95B5' }}>
                    Don't miss these exciting events coming your way
                  </p>
                </div>
                <Link
                  href="/events"
                  className="hidden sm:flex items-center gap-2 font-inter font-semibold px-4 py-2 rounded-lg transition-all"
                  style={{ color: '#B794F6' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(183, 148, 246, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  View All
                  <ArrowRight size={18} />
                </Link>
              </div>

              {upcomingEvents.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-xl border p-12 text-center"
                  style={{
                    background: '#15121D',
                    borderColor: 'rgba(196, 181, 253, 0.1)',
                  }}
                >
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-xl font-outfit mb-2" style={{ color: '#F5F3FA' }}>
                    No upcoming events
                  </p>
                  <p className="font-inter" style={{ color: '#9B95B5' }}>
                    Check out our events page to find something exciting!
                  </p>
                  <Link
                    href="/events"
                    className="mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-lg font-inter font-semibold"
                    style={{
                      background: '#A78BFA',
                      color: '#F5F3FA',
                    }}
                  >
                    <Ticket size={18} />
                    Explore Events
                  </Link>
                </motion.div>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {upcomingEvents.map((event, idx) => (
                    <motion.div
                      key={event._id}
                      variants={itemVariants}
                      className="rounded-xl border overflow-hidden group cursor-pointer transition-all duration-300"
                      style={{
                        background: '#15121D',
                        borderColor: 'rgba(196, 181, 253, 0.1)',
                      }}
                      whileHover={{
                        borderColor: 'rgba(196, 181, 253, 0.3)',
                        transform: 'translateY(-8px)',
                      }}
                      onClick={() => window.location.href = `/events/${event._id}`}
                    >
                      {/* Event Image/Icon */}
                      <div
                        className="h-40 flex items-center justify-center text-4xl relative overflow-hidden"
                        style={{
                          background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.2) 0%, rgba(183, 148, 246, 0.15) 100%)',
                        }}
                      >
                        <motion.div
                          initial={{ scale: 1 }}
                          whileHover={{ scale: 1.1 }}
                          className="group-hover:scale-110 transition-transform"
                        >
                          {idx % 3 === 0 ? '🎪' : idx % 3 === 1 ? '🎸' : '🎭'}
                        </motion.div>
                      </div>

                      {/* Event Details */}
                      <div className="p-5">
                        <h3 className="text-lg font-bold font-outfit mb-3 line-clamp-2" style={{ color: '#F5F3FA' }}>
                          {event.title}
                        </h3>

                        <div className="space-y-2 mb-4">
                          {/* Date */}
                          <div className="flex items-center gap-2 font-inter text-sm" style={{ color: '#9B95B5' }}>
                            <Calendar size={16} />
                            <span>{formatEventDate(event.date)}</span>
                            <Clock size={16} />
                            <span>{formatEventTime(event.date)}</span>
                          </div>

                          {/* Location */}
                          <div className="flex items-center gap-2 font-inter text-sm" style={{ color: '#9B95B5' }}>
                            <MapPin size={16} />
                            <span className="line-clamp-1">{event.location}</span>
                          </div>

                          {/* Tickets */}
                          <div className="flex items-center gap-2 font-inter text-sm" style={{ color: '#A78BFA' }}>
                            <Ticket size={16} />
                            <span>{event.ticketsAvailable} tickets available</span>
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="pt-4 border-t flex items-center justify-between" style={{ borderColor: 'rgba(196, 181, 253, 0.1)' }}>
                          <div className="font-outfit font-bold" style={{ color: '#B794F6' }}>
                            ₹{event.price}
                          </div>
                          <motion.div
                            whileHover={{ x: 4 }}
                            className="text-accent-primary"
                            style={{ color: '#A78BFA' }}
                          >
                            <ArrowRight size={20} />
                          </motion.div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.div>

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="rounded-xl border p-8"
              style={{
                background: '#15121D',
                borderColor: 'rgba(196, 181, 253, 0.1)',
              }}
            >
              <h2 className="text-2xl font-bold font-outfit mb-6" style={{ color: '#F5F3FA' }}>
                Quick Tips
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { icon: '💡', text: 'Explore featured events to discover hidden gems' },
                  { icon: '⭐', text: 'Add events to your favorites for quick access' },
                  { icon: '📢', text: 'Follow organizers to get notifications for new events' },
                  { icon: '🎯', text: 'Check out movie showtimes at nearby theaters' },
                ].map((tip, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-4 p-4 rounded-lg"
                    style={{
                      background: 'rgba(167, 139, 250, 0.05)',
                    }}
                  >
                    <span className="text-2xl flex-shrink-0">{tip.icon}</span>
                    <p className="font-inter text-sm" style={{ color: '#9B95B5' }}>
                      {tip.text}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
