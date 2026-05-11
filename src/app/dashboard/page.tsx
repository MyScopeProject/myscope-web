'use client';

import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface DashboardStats {
  songsPlayed: number;
  eventsAttended: number;
  showsWatched: number;
}

interface Activity {
  _id: string;
  type: 'music' | 'event' | 'show' | 'post';
  title: string;
  timestamp: string;
  icon: string;
}

interface UpcomingEvent {
  _id: string;
  title: string;
  date: string;
  location: string;
  ticketsAvailable: number;
}

function DashboardContent() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    songsPlayed: 0,
    eventsAttended: 0,
    showsWatched: 0,
  });
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
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
      const eventsResponse = await fetch(`${API_URL}/api/events?upcoming=true&limit=2`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const eventsData = await eventsResponse.json();
      
      if (eventsData.success) {
        setUpcomingEvents(eventsData.data.events || []);
      }

      // For now, we'll use placeholder stats until we have user-specific activity tracking
      // In a full implementation, these would come from a user activity/analytics endpoint
      setStats({
        songsPlayed: 0,
        eventsAttended: 0,
        showsWatched: 0,
      });

      setRecentActivity([]);
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
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-bg-dark">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-outfit font-bold mb-2 text-text-primary">Welcome back, {user.name}! 👋</h1>
          <p className="text-text-muted font-plex-sans">Email: {user.email}</p>
          <p className="text-text-muted text-sm font-plex-sans">Member since: {new Date(user.createdAt).toLocaleDateString()}</p>
        </div>
        
        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-accent-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-text-muted font-plex-sans">Loading your dashboard...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {[
                { label: 'Songs Played', value: stats.songsPlayed.toString(), icon: '🎵' },
                { label: 'Events Attended', value: stats.eventsAttended.toString(), icon: '🎉' },
                { label: 'Shows Watched', value: stats.showsWatched.toString(), icon: '🎬' },
              ].map((stat) => (
                <div key={stat.label} className="p-6 bg-surface-1 rounded-lg border border-border hover:bg-surface-2 transition-colors">
                  <div className="text-3xl mb-2">{stat.icon}</div>
                  <div className="text-3xl font-bold text-accent-primary mb-1 font-outfit">{stat.value}</div>
                  <div className="text-text-muted font-inter text-sm">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-surface-1 rounded-lg border border-border p-6">
                <h2 className="text-2xl font-outfit font-bold mb-4 text-text-primary">Recent Activity</h2>
                {recentActivity.length === 0 ? (
                  <div className="text-center py-8 text-text-muted">
                    <div className="text-5xl mb-3">📊</div>
                    <p className="font-plex-sans">No recent activity yet</p>
                    <p className="text-sm text-text-muted/70 mt-2 font-plex-sans">
                      Start exploring music, events, and shows!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentActivity.map((activity) => (
                      <div key={activity._id} className="flex items-center gap-3 pb-3 border-b border-border last:border-0">
                        <div className="w-12 h-12 bg-accent-purple/20 rounded-lg flex items-center justify-center text-2xl">
                          {activity.icon}
                        </div>
                        <div>
                          <p className="font-medium text-text-primary font-inter">{activity.title}</p>
                          <p className="text-sm text-text-muted font-plex-sans">
                            {new Date(activity.timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-surface-1 rounded-lg border border-border p-6">
                <h2 className="text-2xl font-outfit font-bold mb-4 text-text-primary">Upcoming Events</h2>
                {upcomingEvents.length === 0 ? (
                  <div className="text-center py-8 text-text-muted">
                    <div className="text-5xl mb-3">🎫</div>
                    <p className="font-plex-sans">No upcoming events</p>
                    <p className="text-sm text-text-muted/70 mt-2 font-plex-sans">
                      Check out our events page to find something exciting!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingEvents.map((event) => (
                      <div key={event._id} className="p-4 bg-surface-2 rounded-lg border border-border hover:border-accent-primary hover:bg-surface-3 transition-colors cursor-pointer">
                        <h3 className="font-semibold mb-1 text-text-primary font-outfit">{event.title}</h3>
                        <p className="text-sm text-text-muted mb-2 font-plex-sans">
                          {formatEventDate(event.date)}
                        </p>
                        <div className="flex items-center justify-between text-xs text-text-muted/70 font-inter">
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                            {event.location}
                          </span>
                          <span className="text-status-success">
                            {event.ticketsAvailable} tickets left
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
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
