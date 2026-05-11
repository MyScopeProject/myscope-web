'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, MapPin, Clock, Ticket } from 'lucide-react';

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

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month

  const categories = ['Music', 'Sports', 'Theater', 'Comedy', 'Conference', 'Festival', 'Other'];

  useEffect(() => {
    fetchEvents();
  }, [selectedCategory, dateFilter]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category', selectedCategory);
      if (searchQuery.trim()) params.append('search', searchQuery);
      params.append('upcoming', 'true'); // Only show upcoming events
      
      const url = `${API_URL}/api/events?${params.toString()}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setEvents(data.data.events || []);
      } else {
        setError('Failed to load events');
      }
    } catch (err) {
      setError('Error fetching events');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    fetchEvents();
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedLocation('');
    setDateFilter('all');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    const year = date.getFullYear();
    const time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return { month, day, year, time, full: `${month} ${day}, ${year} at ${time}` };
  };

  const filterByDate = (events: Event[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return events.filter(event => {
      const eventDate = new Date(event.date);
      
      if (dateFilter === 'today') {
        const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
        return eventDay.getTime() === today.getTime();
      } else if (dateFilter === 'week') {
        const weekFromNow = new Date(today);
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        return eventDate >= today && eventDate <= weekFromNow;
      } else if (dateFilter === 'month') {
        const monthFromNow = new Date(today);
        monthFromNow.setMonth(monthFromNow.getMonth() + 1);
        return eventDate >= today && eventDate <= monthFromNow;
      }
      return true;
    });
  };

  const filterByLocation = (events: Event[]) => {
    if (!selectedLocation) return events;
    return events.filter(event => 
      event.location.toLowerCase().includes(selectedLocation.toLowerCase())
    );
  };

  const filteredEvents = filterByLocation(filterByDate(Array.isArray(events) ? events : []));

  const getTicketsRemaining = (event: Event) => {
    return event.ticketsAvailable - event.ticketsSold;
  };

  const handleEventClick = (eventId: string) => {
    router.push(`/events/${eventId}`);
  };

  return (
    <div className="pt-16 min-h-screen pb-24" style={{ backgroundColor: '#07060A' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl md:text-7xl font-outfit font-bold mb-4" style={{
            background: 'linear-gradient(110deg, #B794F6, #C4B5FD)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.04em',
          }}>
            Events
          </h1>
          <p className="text-lg font-inter" style={{ color: '#9B95B5' }}>
            Discover concerts, festivals, and live experiences near you
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          {/* Search Bar */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search for events, venues, or organizers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 px-4 py-3 rounded-full outline-none text-sm font-inter transition-all"
              style={{
                backgroundColor: '#1E1A2B',
                border: '1px solid rgba(196, 181, 253, 0.12)',
                color: '#F5F3FA',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.28)';
                e.currentTarget.style.boxShadow = '0 0 20px rgba(167, 139, 250, 0.2)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.12)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <button
              onClick={handleSearch}
              className="px-6 py-3 rounded-full font-semibold font-inter transition-all flex items-center gap-2"
              style={{
                backgroundColor: '#B794F6',
                color: '#07060A',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#C5A3FF';
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(183, 148, 246, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#B794F6';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <Search size={18} />
              Search
            </button>
            {(searchQuery || selectedCategory || selectedLocation || dateFilter !== 'all') && (
              <button
                onClick={handleClearFilters}
                className="px-4 py-3 rounded-full font-semibold font-inter transition-all border"
                style={{
                  backgroundColor: '#1E1A2B',
                  borderColor: 'rgba(196, 181, 253, 0.1)',
                  color: '#F5F3FA',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2A2636';
                  e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.28)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#1E1A2B';
                  e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.1)';
                }}
                title="Clear all filters"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Active Filters Display */}
          {(searchQuery || selectedCategory || selectedLocation || dateFilter !== 'all') && (
            <div className="flex items-center gap-2 flex-wrap text-sm font-inter">
              <span style={{ color: '#9B95B5' }}>Active filters:</span>
              {searchQuery && (
                <span className="px-3 py-1 rounded-full flex items-center gap-2" style={{
                  backgroundColor: 'rgba(183, 148, 246, 0.15)',
                  border: '1px solid rgba(183, 148, 246, 0.28)',
                  color: '#B794F6',
                }}>
                  Search: "{searchQuery}"
                  <button onClick={() => { setSearchQuery(''); fetchEvents(); }} className="hover:opacity-70">×</button>
                </span>
              )}
              {selectedCategory && (
                <span className="px-3 py-1 rounded-full flex items-center gap-2" style={{
                  backgroundColor: 'rgba(183, 148, 246, 0.15)',
                  border: '1px solid rgba(183, 148, 246, 0.28)',
                  color: '#B794F6',
                }}>
                  Category: {selectedCategory}
                  <button onClick={() => setSelectedCategory('')} className="hover:opacity-70">×</button>
                </span>
              )}
              {selectedLocation && (
                <span className="px-3 py-1 rounded-full flex items-center gap-2" style={{
                  backgroundColor: 'rgba(183, 148, 246, 0.15)',
                  border: '1px solid rgba(183, 148, 246, 0.28)',
                  color: '#B794F6',
                }}>
                  Location: {selectedLocation}
                  <button onClick={() => setSelectedLocation('')} className="hover:opacity-70">×</button>
                </span>
              )}
              {dateFilter !== 'all' && (
                <span className="px-3 py-1 rounded-full flex items-center gap-2" style={{
                  backgroundColor: 'rgba(183, 148, 246, 0.15)',
                  border: '1px solid rgba(183, 148, 246, 0.28)',
                  color: '#B794F6',
                }}>
                  Date: {dateFilter === 'today' ? 'Today' : dateFilter === 'week' ? 'This Week' : 'This Month'}
                  <button onClick={() => setDateFilter('all')} className="hover:opacity-70">×</button>
                </span>
              )}
            </div>
          )}

          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory('')}
              className="px-4 py-2 rounded-full whitespace-nowrap transition-all font-inter text-sm"
              style={{
                backgroundColor: selectedCategory === '' ? '#B794F6' : '#1E1A2B',
                color: selectedCategory === '' ? '#07060A' : '#9B95B5',
                border: `1px solid ${selectedCategory === '' ? '#B794F6' : 'rgba(196, 181, 253, 0.1)'}`,
              }}
              onMouseEnter={(e) => {
                if (selectedCategory !== '') {
                  e.currentTarget.style.backgroundColor = '#2A2636';
                  e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.28)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedCategory !== '') {
                  e.currentTarget.style.backgroundColor = '#1E1A2B';
                  e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.1)';
                }
              }}
            >
              All Categories
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className="px-4 py-2 rounded-full whitespace-nowrap transition-all font-inter text-sm"
                style={{
                  backgroundColor: selectedCategory === category ? '#B794F6' : '#1E1A2B',
                  color: selectedCategory === category ? '#07060A' : '#9B95B5',
                  border: `1px solid ${selectedCategory === category ? '#B794F6' : 'rgba(196, 181, 253, 0.1)'}`,
                }}
                onMouseEnter={(e) => {
                  if (selectedCategory !== category) {
                    e.currentTarget.style.backgroundColor = '#2A2636';
                    e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.28)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedCategory !== category) {
                    e.currentTarget.style.backgroundColor = '#1E1A2B';
                    e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.1)';
                  }
                }}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Date and Location Filters */}
          <div className="flex flex-wrap gap-4">
            {/* Date Filter */}
            <div className="flex-1 min-w-[200px]">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg font-inter text-sm outline-none"
                style={{
                  backgroundColor: '#1E1A2B',
                  borderColor: 'rgba(196, 181, 253, 0.12)',
                  border: '1px solid rgba(196, 181, 253, 0.12)',
                  color: '#F5F3FA',
                }}
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>

            {/* Location Filter */}
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Filter by location..."
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg font-inter text-sm outline-none"
                style={{
                  backgroundColor: '#1E1A2B',
                  borderColor: 'rgba(196, 181, 253, 0.12)',
                  border: '1px solid rgba(196, 181, 253, 0.12)',
                  color: '#F5F3FA',
                }}
              />
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{
              borderColor: 'rgba(183, 148, 246, 0.3)',
              borderTopColor: '#B794F6',
            }} />
            <p className="font-inter" style={{ color: '#9B95B5' }}>Loading events...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-lg mb-8 font-inter border" style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderColor: 'rgba(239, 68, 68, 0.28)',
            color: '#ef4444',
          }}>
            {error}
          </div>
        )}

        {/* Events Grid */}
        {!loading && !error && (
          <>
            {filteredEvents.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎫</div>
                <p className="text-lg font-inter" style={{ color: '#9B95B5' }}>No events found</p>
                <p className="text-sm font-inter mt-2" style={{ color: 'rgba(155, 149, 181, 0.7)' }}>
                  Try adjusting your filters or search query
                </p>
              </div>
            ) : (
              <>
                <div className="mb-4 font-inter text-sm" style={{ color: '#9B95B5' }}>
                  Showing {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredEvents.map((event) => {
                    const dateInfo = formatDate(event.date);
                    const ticketsRemaining = getTicketsRemaining(event);
                    const isSoldOut = ticketsRemaining <= 0;
                    const isAlmostSoldOut = ticketsRemaining > 0 && ticketsRemaining <= 10;

                    return (
                      <div
                        key={event._id}
                        onClick={() => handleEventClick(event._id)}
                        className="group cursor-pointer rounded-2xl overflow-hidden border transition-all"
                        style={{
                          backgroundColor: '#15121D',
                          borderColor: 'rgba(196, 181, 253, 0.1)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.28)';
                          e.currentTarget.style.boxShadow = '0 24px 50px rgba(167, 139, 250, 0.15)';
                          e.currentTarget.style.transform = 'translateY(-4px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.1)';
                          e.currentTarget.style.boxShadow = 'none';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        {/* Event Image */}
                        <div className="relative aspect-video overflow-hidden" style={{ backgroundColor: '#1E1A2B' }}>
                          {event.image ? (
                            <img
                              src={event.image}
                              alt={event.title}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-6xl bg-gradient-to-br" style={{
                              backgroundImage: 'linear-gradient(135deg, #1E1A2B, #2A2636)',
                            }}>
                              🎫
                            </div>
                          )}
                          
                          {/* Date Badge */}
                          <div className="absolute top-4 left-4 rounded-lg p-2 text-center min-w-[60px] font-inter" style={{
                            backgroundColor: '#B794F6',
                            color: '#07060A',
                          }}>
                            <div className="text-xs font-semibold uppercase">{dateInfo.month}</div>
                            <div className="text-2xl font-bold">{dateInfo.day}</div>
                          </div>

                          {/* Status Badges */}
                          <div className="absolute top-4 right-4 flex flex-col gap-2">
                            {event.featured && (
                              <span className="px-3 py-1 bg-yellow-500 text-black text-xs font-semibold rounded-full font-inter">
                                Featured
                              </span>
                            )}
                            {isSoldOut && (
                              <span className="px-3 py-1 text-white text-xs font-semibold rounded-full font-inter" style={{
                                backgroundColor: '#ef4444',
                              }}>
                                Sold Out
                              </span>
                            )}
                            {isAlmostSoldOut && !isSoldOut && (
                              <span className="px-3 py-1 text-white text-xs font-semibold rounded-full font-inter" style={{
                                backgroundColor: '#F59E0B',
                              }}>
                                Almost Sold Out
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Event Details */}
                        <div className="p-5">
                          {/* Category */}
                          <div className="mb-3">
                            <span className="px-2.5 py-1 rounded-full text-xs font-inter" style={{
                              backgroundColor: 'rgba(196, 181, 253, 0.1)',
                              color: '#C4B5FD',
                            }}>
                              {event.category}
                            </span>
                          </div>

                          {/* Title */}
                          <h3 className="text-lg font-bold mb-2 font-outfit transition-colors line-clamp-2" style={{
                            color: '#F5F3FA',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#B794F6')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#F5F3FA')}
                          >
                            {event.title}
                          </h3>

                          {/* Description */}
                          <p className="text-sm mb-4 line-clamp-2 font-inter" style={{ color: '#9B95B5' }}>
                            {event.description}
                          </p>

                          {/* Location */}
                          <div className="flex items-start gap-2 mb-2 text-sm font-inter" style={{ color: '#C4B5FD' }}>
                            <MapPin size={18} className="shrink-0 mt-0.5" />
                            <span className="line-clamp-1">{event.location}</span>
                          </div>

                          {/* Time */}
                          <div className="flex items-center gap-2 mb-4 text-sm font-inter" style={{ color: '#C4B5FD' }}>
                            <Clock size={18} className="shrink-0" />
                            <span>{dateInfo.time}</span>
                          </div>

                          {/* Price and Tickets */}
                          <div className="flex items-center justify-between pt-4 font-inter" style={{
                            borderTop: '1px solid rgba(196, 181, 253, 0.1)',
                          }}>
                            <div>
                              <div className="text-xs" style={{ color: '#9B95B5' }}>Price</div>
                              <div className="text-xl font-bold" style={{ color: '#B794F6' }}>
                                {event.price === 0 ? 'Free' : `$${event.price}`}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs" style={{ color: '#9B95B5' }}>Tickets Left</div>
                              <div className="text-lg font-semibold" style={{
                                color: isSoldOut ? '#ef4444' : isAlmostSoldOut ? '#F59E0B' : '#10B981'
                              }}>
                                {isSoldOut ? 'Sold Out' : ticketsRemaining}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
