'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

interface Show {
  _id: string;
  title: string;
  category: string;
  description: string;
  videoUrl: string;
  thumbnail?: string;
  duration: number;
  rating: number;
  views: number;
  likes: string[];
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
  };
  tags: string[];
  featured: boolean;
  publishedAt: string;
  createdAt: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function ShowsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);

  const categories = ['Concert', 'Interview', 'Documentary', 'Behind the Scenes', 'Live Performance', 'Music Video', 'Talk Show', 'Other'];

  useEffect(() => {
    fetchShows();
  }, [selectedCategory]);

  const fetchShows = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (selectedCategory) params.append('category', selectedCategory);
      
      const url = `${API_URL}/api/shows?${params.toString()}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setShows(data.data.shows || []);
      } else {
        setError('Failed to load shows');
      }
    } catch (err) {
      setError('Error fetching shows');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchShows();
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/shows?search=${searchQuery}`);
      const data = await response.json();

      if (data.success) {
        setShows(data.data.shows || []);
      }
    } catch (err) {
      setError('Error searching shows');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleShowClick = async (show: Show) => {
    setSelectedShow(show);
    setShowVideoPlayer(true);
    
    // Increment view count
    try {
      await fetch(`${API_URL}/api/shows/${show._id}/view`, {
        method: 'POST',
      });
    } catch (err) {
      console.error('Error incrementing views:', err);
    }
  };

  const handleLikeShow = async (showId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      router.push('/auth/login');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/shows/${showId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setShows(shows.map(show => 
          show._id === showId ? data.data.show : show
        ));
        
        if (selectedShow && selectedShow._id === showId) {
          setSelectedShow(data.data.show);
        }
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  const filteredShows = Array.isArray(shows) ? shows : [];

  return (
    <div className="pt-16 min-h-screen pb-24 bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-linear-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
            Shows
          </h1>
          <p className="text-gray-400 text-lg">
            Watch exclusive content, live performances, and trending shows
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          {/* Search Bar */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search for shows, artists, or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
            />
            <button
              onClick={handleSearch}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-colors"
            >
              Search
            </button>
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                selectedCategory === ''
                  ? 'bg-red-600 text-white'
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
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading shows...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-400 mb-8">
            {error}
          </div>
        )}

        {/* Shows Grid */}
        {!loading && !error && (
          <>
            {filteredShows.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎬</div>
                <p className="text-gray-400 text-lg">No shows found</p>
                <p className="text-gray-500 text-sm mt-2">
                  Try a different search or category
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {filteredShows.map((show) => {
                  const isLiked = user && show.likes.includes(user.id);

                  return (
                    <div
                      key={show._id}
                      onClick={() => handleShowClick(show)}
                      className="group cursor-pointer"
                    >
                      {/* Thumbnail */}
                      <div className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden mb-3 hover:scale-105 transition-transform">
                        {show.thumbnail ? (
                          <img
                            src={show.thumbnail}
                            alt={show.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-6xl">
                            🎬
                          </div>
                        )}
                        
                        {/* Overlay on Hover */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                            </svg>
                          </div>
                        </div>

                        {/* Duration Badge */}
                        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 text-white text-xs rounded">
                          {formatDuration(show.duration)}
                        </div>

                        {/* Featured Badge */}
                        {show.featured && (
                          <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-500 text-black text-xs font-semibold rounded">
                            Featured
                          </div>
                        )}
                      </div>

                      {/* Show Info */}
                      <div>
                        <h3 className="font-semibold truncate group-hover:text-red-400 transition-colors mb-1">
                          {show.title}
                        </h3>
                        
                        <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                          <span className="px-2 py-0.5 bg-gray-800 rounded-full">
                            {show.category}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              {formatViews(show.views)}
                            </span>
                            
                            <button
                              onClick={(e) => handleLikeShow(show._id, e)}
                              className={`flex items-center gap-1 hover:text-red-400 transition-colors ${
                                isLiked ? 'text-red-400' : ''
                              }`}
                            >
                              <svg className="w-4 h-4" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                              </svg>
                              {show.likes.length}
                            </button>
                          </div>

                          {show.rating > 0 && (
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              <span>{show.rating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Video Player Modal */}
      {showVideoPlayer && selectedShow && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="max-w-6xl w-full">
            {/* Close Button */}
            <button
              onClick={() => {
                setShowVideoPlayer(false);
                setSelectedShow(null);
              }}
              className="absolute top-4 right-4 w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Video Player */}
            <div className="bg-gray-900 rounded-xl overflow-hidden">
              <div className="aspect-video bg-black">
                <video
                  src={selectedShow.videoUrl}
                  controls
                  autoPlay
                  className="w-full h-full"
                  poster={selectedShow.thumbnail}
                >
                  Your browser does not support the video tag.
                </video>
              </div>

              {/* Video Info */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-2">{selectedShow.title}</h2>
                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                      <span className="px-3 py-1 bg-gray-800 rounded-full">{selectedShow.category}</span>
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        {formatViews(selectedShow.views)} views
                      </span>
                      <span>{formatDuration(selectedShow.duration)}</span>
                      {selectedShow.rating > 0 && (
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          {selectedShow.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={(e) => handleLikeShow(selectedShow._id, e)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                      user && selectedShow.likes.includes(user.id)
                        ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-gray-800 hover:bg-gray-700'
                    }`}
                  >
                    <svg className="w-5 h-5" fill={user && selectedShow.likes.includes(user.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    {selectedShow.likes.length}
                  </button>
                </div>

                <p className="text-gray-300 mb-4 whitespace-pre-wrap">{selectedShow.description}</p>

                {selectedShow.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedShow.tags.map((tag, index) => (
                      <span key={index} className="px-3 py-1 bg-gray-800 text-gray-300 text-sm rounded-full">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="text-sm text-gray-400 border-t border-gray-800 pt-4">
                  <span>Uploaded by {selectedShow.uploadedBy.name}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
