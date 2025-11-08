'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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

  const categories = ['Music', 'Sports', 'Comedy', 'Theater', 'Conference', 'Festival', 'Other'];

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
    <div className="pt-16 min-h-screen pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-linear-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Events
          </h1>
          <p className="text-gray-400 text-lg">
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
              className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <button
              onClick={handleSearch}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
            >
              Search
            </button>
            {(searchQuery || selectedCategory || selectedLocation || dateFilter !== 'all') && (
              <button
                onClick={handleClearFilters}
                className="px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors"
                title="Clear all filters"
              >
                Clear
              </button>
            )}
          </div>

          {/* Active Filters Display */}
          {(searchQuery || selectedCategory || selectedLocation || dateFilter !== 'all') && (
            <div className="flex items-center gap-2 flex-wrap text-sm">
              <span className="text-gray-400">Active filters:</span>
              {searchQuery && (
                <span className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full flex items-center gap-2">
                  Search: "{searchQuery}"
                  <button onClick={() => { setSearchQuery(''); fetchEvents(); }} className="hover:text-white">×</button>
                </span>
              )}
              {selectedCategory && (
                <span className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full flex items-center gap-2">
                  Category: {selectedCategory}
                  <button onClick={() => setSelectedCategory('')} className="hover:text-white">×</button>
                </span>
              )}
              {selectedLocation && (
                <span className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full flex items-center gap-2">
                  Location: {selectedLocation}
                  <button onClick={() => setSelectedLocation('')} className="hover:text-white">×</button>
                </span>
              )}
              {dateFilter !== 'all' && (
                <span className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full flex items-center gap-2">
                  Date: {dateFilter === 'today' ? 'Today' : dateFilter === 'week' ? 'This Week' : 'This Month'}
                  <button onClick={() => setDateFilter('all')} className="hover:text-white">×</button>
                </span>
              )}
            </div>
          )}

          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                selectedCategory === ''
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              All Categories
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
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
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
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
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading events...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-400 mb-8">
            {error}
          </div>
        )}

        {/* Events Grid */}
        {!loading && !error && (
          <>
            {filteredEvents.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎫</div>
                <p className="text-gray-400 text-lg">No events found</p>
                <p className="text-gray-500 text-sm mt-2">
                  Try adjusting your filters or search query
                </p>
              </div>
            ) : (
              <>
                <div className="mb-4 text-gray-400">
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
                        className="group cursor-pointer bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-blue-500 transition-all hover:transform hover:scale-[1.02]"
                      >
                        {/* Event Image */}
                        <div className="relative aspect-video bg-gray-900 overflow-hidden">
                          {event.image ? (
                            <img
                              src={event.image}
                              alt={event.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-6xl">
                              🎫
                            </div>
                          )}
                          
                          {/* Date Badge */}
                          <div className="absolute top-4 left-4 bg-blue-600 text-white rounded-lg p-2 text-center min-w-[60px]">
                            <div className="text-xs font-semibold uppercase">{dateInfo.month}</div>
                            <div className="text-2xl font-bold">{dateInfo.day}</div>
                          </div>

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
                            {isAlmostSoldOut && !isSoldOut && (
                              <span className="px-3 py-1 bg-orange-500 text-white text-xs font-semibold rounded-full">
                                Almost Sold Out
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Event Details */}
                        <div className="p-5">
                          {/* Category */}
                          <div className="mb-2">
                            <span className="px-2.5 py-1 bg-gray-700 text-gray-300 text-xs rounded-full">
                              {event.category}
                            </span>
                          </div>

                          {/* Title */}
                          <h3 className="text-xl font-bold mb-2 group-hover:text-blue-400 transition-colors line-clamp-2">
                            {event.title}
                          </h3>

                          {/* Description */}
                          <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                            {event.description}
                          </p>

                          {/* Location */}
                          <div className="flex items-start gap-2 mb-2 text-sm text-gray-300">
                            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="line-clamp-1">{event.location}</span>
                          </div>

                          {/* Time */}
                          <div className="flex items-center gap-2 mb-4 text-sm text-gray-300">
                            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{dateInfo.time}</span>
                          </div>

                          {/* Price and Tickets */}
                          <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                            <div>
                              <div className="text-sm text-gray-400">Price</div>
                              <div className="text-xl font-bold text-blue-400">
                                {event.price === 0 ? 'Free' : `$${event.price}`}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-400">Tickets Left</div>
                              <div className={`text-lg font-semibold ${
                                isSoldOut ? 'text-red-400' : 
                                isAlmostSoldOut ? 'text-orange-400' : 
                                'text-green-400'
                              }`}>
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
