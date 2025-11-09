'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { Card, CardBody, CardFooter } from '@/components/ui/card';
import Badge from '@/components/ui/badge';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface Event {
  _id: string;
  title: string;
  date: string;
  location: string;
  status: string;
  ticketsRemaining: number;
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
          headers: { Authorization: `Bearer ${token}` },
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

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading your events...</p>
      </div>
    );
  }

  return (
    <section>
      <h1 className="text-3xl font-bold mb-6">My Events</h1>
      {events.length === 0 ? (
        <Card className="text-center py-12">
          <CardBody>
            <div className="text-5xl mb-3">🎫</div>
            <p className="text-gray-400 mb-2">You have not registered for any events yet.</p>
            <p className="text-sm text-gray-500">
              Check out our events page to find something exciting!
            </p>
          </CardBody>
        </Card>
      ) : (
        <ul className="space-y-4">
          {events.map(event => (
            <Card key={event._id} hoverable>
              <CardBody>
                <div 
                  className="cursor-pointer" 
                  onClick={() => router.push(`/dashboard/events/${event._id}`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <h2 className="text-xl font-semibold">{event.title}</h2>
                    <Badge 
                      variant={
                        event.status === 'upcoming' ? 'success' : 
                        event.status === 'ongoing' ? 'info' : 
                        'secondary'
                      }
                      rounded
                    >
                      {event.status}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-gray-400">
                    <div className="flex items-center gap-2">
                      <span className="text-purple-400">📅</span>
                      <span>{new Date(event.date).toLocaleDateString('en-US', { 
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-purple-400">📍</span>
                      <span>{event.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-purple-400">🎟️</span>
                      <span>{event.ticketsRemaining} tickets remaining</span>
                    </div>
                  </div>
                </div>
              </CardBody>
              
              <CardFooter className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/dashboard/events/${event._id}`);
                  }}
                >
                  View Details
                </Button>
                <Button
                  variant="accent"
                  size="sm"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!confirm(`Are you sure you want to unregister from "${event.title}"?`)) return;
                    
                    setUnregisteringId(event._id);
                    try {
                      const res = await fetch(`${API_URL}/api/events/${event._id}/unregister`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}` },
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
                  }}
                  disabled={unregisteringId === event._id}
                  isLoading={unregisteringId === event._id}
                >
                  {unregisteringId === event._id ? 'Unregistering' : 'Unregister'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </ul>
      )}
    </section>
  );
}
