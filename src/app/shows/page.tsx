'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Search, X, Play, Eye, Heart, Star } from 'lucide-react';

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
      setError('');
      
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category', selectedCategory);
      if (searchQuery.trim()) params.append('search', searchQuery);
      
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
    fetchShows();
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
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
    <div className="pt-16 min-h-screen pb-24" style={{ backgroundColor: '#07060A' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl md:text-7xl font-outfit font-bold mb-4" style={{
            background: 'linear-gradient(110deg, #D8C7FE, #B794F6)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.04em',
          }}>
            Shows
          </h1>
          <p className="text-lg font-inter" style={{ color: '#9B95B5' }}>
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
                backgroundColor: '#D8C7FE',
                color: '#07060A',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#E8D9FE';
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(216, 199, 254, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#D8C7FE';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <Search size={18} />
              Search
            </button>
            {(searchQuery || selectedCategory) && (
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
          {(searchQuery || selectedCategory) && (
            <div className="flex items-center gap-2 text-sm font-inter flex-wrap">
              <span style={{ color: '#9B95B5' }}>Active filters:</span>
              {searchQuery && (
                <span className="px-3 py-1 rounded-full flex items-center gap-2" style={{
                  backgroundColor: 'rgba(216, 199, 254, 0.15)',
                  border: '1px solid rgba(216, 199, 254, 0.28)',
                  color: '#D8C7FE',
                }}>
                  Search: "{searchQuery}"
                  <button onClick={() => { setSearchQuery(''); fetchShows(); }} className="hover:opacity-70">×</button>
                </span>
              )}
              {selectedCategory && (
                <span className="px-3 py-1 rounded-full flex items-center gap-2" style={{
                  backgroundColor: 'rgba(216, 199, 254, 0.15)',
                  border: '1px solid rgba(216, 199, 254, 0.28)',
                  color: '#D8C7FE',
                }}>
                  Category: {selectedCategory}
                  <button onClick={() => setSelectedCategory('')} className="hover:opacity-70">×</button>
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
                backgroundColor: selectedCategory === '' ? '#D8C7FE' : '#1E1A2B',
                color: selectedCategory === '' ? '#07060A' : '#9B95B5',
                border: `1px solid ${selectedCategory === '' ? '#D8C7FE' : 'rgba(196, 181, 253, 0.1)'}`,
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
                  backgroundColor: selectedCategory === category ? '#D8C7FE' : '#1E1A2B',
                  color: selectedCategory === category ? '#07060A' : '#9B95B5',
                  border: `1px solid ${selectedCategory === category ? '#D8C7FE' : 'rgba(196, 181, 253, 0.1)'}`,
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
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{
              borderColor: 'rgba(216, 199, 254, 0.3)',
              borderTopColor: '#D8C7FE',
            }} />
            <p className="font-inter" style={{ color: '#9B95B5' }}>Loading shows...</p>
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

        {/* Shows Grid */}
        {!loading && !error && (
          <>
            {filteredShows.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎬</div>
                <p className="text-lg font-inter" style={{ color: '#9B95B5' }}>No shows found</p>
                <p className="text-sm font-inter mt-2" style={{ color: 'rgba(155, 149, 181, 0.7)' }}>
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
                      <div className="relative aspect-video rounded-lg overflow-hidden mb-3 border transition-all" style={{
                        backgroundColor: '#15121D',
                        borderColor: 'rgba(196, 181, 253, 0.1)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.borderColor = 'rgba(240, 166, 248, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.1)';
                      }}
                      >
                        {show.thumbnail ? (
                          <img
                            src={show.thumbnail}
                            alt={show.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br" style={{
                            backgroundImage: 'linear-gradient(135deg, #1E1A2B, #2A2636)',
                          }}>
                            🎬
                          </div>
                        )}
                        
                        {/* Overlay on Hover */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center" style={{
                          backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        }}>
                          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{
                            backgroundColor: '#D8C7FE',
                            color: '#07060A',
                          }}>
                            <Play size={24} fill="currentColor" />
                          </div>
                        </div>

                        {/* Duration Badge */}
                        <div className="absolute bottom-2 right-2 px-2 py-1 rounded text-xs font-inter" style={{
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          color: '#F5F3FA',
                        }}>
                          {formatDuration(show.duration)}
                        </div>

                        {/* Featured Badge */}
                        {show.featured && (
                          <div className="absolute top-2 left-2 px-2 py-1 rounded text-xs font-semibold font-inter" style={{
                            backgroundColor: '#fbbf24',
                            color: '#000',
                          }}>
                            Featured
                          </div>
                        )}
                      </div>

                      {/* Show Info */}
                      <div>
                        <h3 className="font-semibold truncate mb-1 font-inter transition-colors" style={{
                          color: '#F5F3FA',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#D8C7FE')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#F5F3FA')}
                        >
                          {show.title}
                        </h3>
                        
                        <div className="flex items-center gap-2 text-xs mb-2 font-inter" style={{ color: '#C4B5FD' }}>
                          <span className="px-2 py-0.5 rounded-full" style={{
                            backgroundColor: 'rgba(196, 181, 253, 0.1)',
                          }}>
                            {show.category}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs font-inter" style={{ color: '#9B95B5' }}>
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1" style={{ color: '#C4B5FD' }}>
                              <Eye size={14} />
                              {formatViews(show.views)}
                            </span>
                            
                            <button
                              onClick={(e) => handleLikeShow(show._id, e)}
                              className="flex items-center gap-1 transition-colors"
                              style={{
                                color: isLiked ? '#D8C7FE' : '#9B95B5',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = '#D8C7FE')}
                              onMouseLeave={(e) => {
                                if (!isLiked) {
                                  e.currentTarget.style.color = '#9B95B5';
                                }
                              }}
                            >
                              <Heart size={14} fill={isLiked ? 'currentColor' : 'none'} />
                              {show.likes.length}
                            </button>
                          </div>

                          {show.rating > 0 && (
                            <div className="flex items-center gap-1" style={{ color: '#fbbf24' }}>
                              <Star size={14} fill="currentColor" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}>
          <div className="max-w-6xl w-full">
            {/* Close Button */}
            <button
              onClick={() => {
                setShowVideoPlayer(false);
                setSelectedShow(null);
              }}
              className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
              style={{
                backgroundColor: '#1E1A2B',
                color: '#F5F3FA',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2A2636';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#1E1A2B';
              }}
            >
              <X size={24} />
            </button>

            {/* Video Player */}
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#15121D' }}>
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
                    <h2 className="text-2xl font-bold mb-2 font-outfit" style={{ color: '#F5F3FA' }}>{selectedShow.title}</h2>
                    <div className="flex items-center gap-4 text-sm flex-wrap" style={{ color: '#9B95B5' }}>
                      <span className="px-3 py-1 rounded-full font-inter" style={{
                        backgroundColor: 'rgba(196, 181, 253, 0.1)',
                      }}>{selectedShow.category}</span>
                      <span className="flex items-center gap-1 font-inter">
                        <Eye size={16} />
                        {formatViews(selectedShow.views)} views
                      </span>
                      <span className="font-inter">{formatDuration(selectedShow.duration)}</span>
                      {selectedShow.rating > 0 && (
                        <span className="flex items-center gap-1 font-inter" style={{ color: '#fbbf24' }}>
                          <Star size={16} fill="currentColor" />
                          {selectedShow.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={(e) => handleLikeShow(selectedShow._id, e)}
                    className="px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 font-inter"
                    style={{
                      backgroundColor: user && selectedShow.likes.includes(user.id) ? '#D8C7FE' : '#1E1A2B',
                      color: user && selectedShow.likes.includes(user.id) ? '#07060A' : '#F5F3FA',
                    }}
                    onMouseEnter={(e) => {
                      if (!(user && selectedShow.likes.includes(user.id))) {
                        e.currentTarget.style.backgroundColor = '#2A2636';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!(user && selectedShow.likes.includes(user.id))) {
                        e.currentTarget.style.backgroundColor = '#1E1A2B';
                      }
                    }}
                  >
                    <Heart size={20} fill={(user && selectedShow.likes.includes(user.id)) ? 'currentColor' : 'none'} />
                    {selectedShow.likes.length}
                  </button>
                </div>

                <p className="mb-4 whitespace-pre-wrap font-inter" style={{ color: '#C4B5FD' }}>{selectedShow.description}</p>

                {selectedShow.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedShow.tags.map((tag, index) => (
                      <span key={index} className="px-3 py-1 rounded-full text-sm font-inter" style={{
                        backgroundColor: 'rgba(196, 181, 253, 0.1)',
                        color: '#C4B5FD',
                      }}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="text-sm font-inter pt-4" style={{
                  borderTop: '1px solid rgba(196, 181, 253, 0.1)',
                  color: '#9B95B5',
                }}>
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
