'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { Card, CardBody, CardHeader, CardFooter } from '@/components/ui/card';
import Badge from '@/components/ui/badge';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface Event {
  _id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  status: string;
  price: number;
  ticketsAvailable: number;
  ticketsSold: number;
  category: string;
  image?: string;
  organizer?: {
    name: string;
    email: string;
  };
  attendees?: string[];
}

export default function EventDetailPage({ params }: { params: { id: string } }) {
  const { token, user } = useAuth();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [unregistering, setUnregistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    async function fetchEvent() {
      try {
        const res = await fetch(`${API_URL}/api/events/${params.id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        
        if (data.success && data.data?.event) {
          setEvent(data.data.event);
          // Check if user is registered
          if (user && data.data.event.attendees) {
            setIsRegistered(data.data.event.attendees.includes(user.id));
          }
        }
      } catch (error) {
        console.error('Failed to fetch event', error);
      } finally {
        setLoading(false);
      }
    }
    fetchEvent();
  }, [params.id, token, user]);

  const handleUnregister = async () => {
    if (!event) return;
    if (!confirm(`Are you sure you want to unregister from "${event.title}"?`)) return;
    
    setUnregistering(true);
    try {
      const res = await fetch(`${API_URL}/api/events/${event._id}/unregister`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        setIsRegistered(false);
        alert('Unregistered successfully');
        router.push('/dashboard/events');
      } else {
        alert('Failed to unregister');
      }
    } catch (err) {
      alert('Error unregistering');
    } finally {
      setUnregistering(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading event details...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <Card className="text-center py-12">
        <CardBody>
          <div className="text-5xl mb-3">❌</div>
          <p className="text-gray-400 mb-4">Event not found</p>
          <Button variant="primary" onClick={() => router.push('/dashboard/events')}>
            Back to My Events
          </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          ← Back
        </Button>
        <h1 className="text-3xl font-bold">{event.title}</h1>
      </div>

      {/* Main event card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">{event.title}</h2>
              <div className="flex items-center gap-2">
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
                {event.category && (
                  <Badge variant="primary" rounded>
                    {event.category}
                  </Badge>
                )}
                {isRegistered && (
                  <Badge variant="success" rounded>
                    ✓ Registered
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardBody className="space-y-6">
          {/* Event image */}
          {event.image && (
            <div className="w-full h-64 rounded-lg overflow-hidden bg-gray-700">
              <img 
                src={event.image} 
                alt={event.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Description */}
          <div>
            <h3 className="text-lg font-semibold mb-2">About this event</h3>
            <p className="text-gray-400 leading-relaxed">{event.description}</p>
          </div>

          {/* Event details grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl">📅</span>
                <div>
                  <p className="text-sm text-gray-500">Date & Time</p>
                  <p className="text-white font-medium">
                    {new Date(event.date).toLocaleDateString('en-US', { 
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                  <p className="text-sm text-gray-400">
                    {new Date(event.date).toLocaleTimeString('en-US', { 
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-2xl">📍</span>
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="text-white font-medium">{event.location}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-2xl">💰</span>
                <div>
                  <p className="text-sm text-gray-500">Price</p>
                  <p className="text-white font-medium">
                    {event.price > 0 ? `$${event.price.toFixed(2)}` : 'Free'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🎟️</span>
                <div>
                  <p className="text-sm text-gray-500">Tickets Available</p>
                  <p className="text-white font-medium">
                    {event.ticketsAvailable} remaining
                  </p>
                  <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                    <div 
                      className="bg-emerald-500 h-2 rounded-full transition-all"
                      style={{ 
                        width: `${((event.ticketsAvailable) / (event.ticketsAvailable + (event.ticketsSold || 0))) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              </div>

              {event.organizer && (
                <div className="flex items-start gap-3">
                  <span className="text-2xl">👤</span>
                  <div>
                    <p className="text-sm text-gray-500">Organized by</p>
                    <p className="text-white font-medium">{event.organizer.name}</p>
                    <p className="text-sm text-gray-400">{event.organizer.email}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardBody>

        <CardFooter className="flex gap-3">
          {isRegistered ? (
            <Button
              variant="accent"
              onClick={handleUnregister}
              isLoading={unregistering}
              disabled={unregistering}
            >
              Unregister from Event
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => router.push(`/events/${event._id}`)}
            >
              View in Events Page
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/events')}
          >
            Back to My Events
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
