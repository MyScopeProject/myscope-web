'use client';

import { useState, useEffect } from 'react';
import { useMusicPlayer } from '@/context/MusicPlayerContext';
import { useFavorites } from '@/context/FavoritesContext';
import { useAuth } from '@/context/AuthContext';
import { Search, X } from 'lucide-react';

interface Music {
  _id: string;
  title: string;
  artist: string;
  album?: string;
  coverImage?: string;
  audioUrl: string;
  genre?: string;
  likes: string[];
  plays: number;
  createdAt: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function MusicPage() {
  const [music, setMusic] = useState<Music[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [togglingFavorite, setTogglingFavorite] = useState<string | null>(null);
  
  const { playTrack, currentTrack, isPlaying } = useMusicPlayer();
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const { user } = useAuth();

  const genres = ['Pop', 'Rock', 'Hip Hop', 'Jazz', 'Electronic', 'Classical', 'R&B'];

  useEffect(() => {
    fetchMusic();
  }, [selectedGenre]);

  const fetchMusic = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Build query parameters
      const params = new URLSearchParams();
      if (selectedGenre) params.append('genre', selectedGenre);
      if (searchQuery.trim()) params.append('search', searchQuery);
      
      const url = `${API_URL}/api/music${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        // Backend returns data.data.music (nested structure)
        setMusic(data.data.music || []);
      } else {
        setError('Failed to load music');
      }
    } catch (err) {
      setError('Error fetching music');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    fetchMusic();
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedGenre('');
  };

  const handlePlayTrack = (track: Music) => {
    playTrack({
      _id: track._id,
      title: track.title,
      artist: track.artist,
      album: track.album,
      coverImage: track.coverImage,
      audioUrl: track.audioUrl,
    });
  };

  const handleToggleFavorite = async (e: React.MouseEvent, trackId: string) => {
    e.stopPropagation(); // Prevent playing track when clicking favorite
    
    if (!user) {
      alert('Please login to add favorites');
      return;
    }

    setTogglingFavorite(trackId);
    try {
      if (isFavorite(trackId)) {
        await removeFavorite(trackId);
      } else {
        await addFavorite(trackId);
      }
    } finally {
      setTogglingFavorite(null);
    }
  };

  const filteredMusic = Array.isArray(music) ? music : [];

  return (
    <div className="pt-16 min-h-screen pb-24" style={{ backgroundColor: '#07060A' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl md:text-7xl font-outfit font-bold mb-4" style={{
            background: 'linear-gradient(110deg, #A78BFA, #C4B5FD)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.04em',
          }}>
            Music
          </h1>
          <p className="text-lg font-inter" style={{ color: '#9B95B5' }}>
            Stream millions of songs from your favorite artists
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-8 space-y-4">
          {/* Search Bar */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search for songs, artists, or albums..."
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
                backgroundColor: '#A78BFA',
                color: '#07060A',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#C4B5FD';
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(167, 139, 250, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#A78BFA';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <Search size={18} />
              Search
            </button>
            {(searchQuery || selectedGenre) && (
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
          {(searchQuery || selectedGenre) && (
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <span className="font-inter" style={{ color: '#9B95B5' }}>Active filters:</span>
              {searchQuery && (
                <span className="px-3 py-1 rounded-full flex items-center gap-2 font-inter" style={{
                  backgroundColor: 'rgba(167, 139, 250, 0.15)',
                  border: '1px solid rgba(167, 139, 250, 0.28)',
                  color: '#A78BFA',
                }}>
                  Search: "{searchQuery}"
                  <button onClick={() => setSearchQuery('')} className="hover:opacity-70">×</button>
                </span>
              )}
              {selectedGenre && (
                <span className="px-3 py-1 rounded-full flex items-center gap-2 font-inter" style={{
                  backgroundColor: 'rgba(167, 139, 250, 0.15)',
                  border: '1px solid rgba(167, 139, 250, 0.28)',
                  color: '#A78BFA',
                }}>
                  Genre: {selectedGenre}
                  <button onClick={() => setSelectedGenre('')} className="hover:opacity-70">×</button>
                </span>
              )}
            </div>
          )}

          {/* Genre Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedGenre('')}
              className="px-4 py-2 rounded-full whitespace-nowrap transition-all font-inter text-sm"
              style={{
                backgroundColor: selectedGenre === '' ? '#A78BFA' : '#1E1A2B',
                color: selectedGenre === '' ? '#07060A' : '#9B95B5',
                border: `1px solid ${selectedGenre === '' ? '#A78BFA' : 'rgba(196, 181, 253, 0.1)'}`,
              }}
              onMouseEnter={(e) => {
                if (selectedGenre !== '') {
                  e.currentTarget.style.backgroundColor = '#2A2636';
                  e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.28)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedGenre !== '') {
                  e.currentTarget.style.backgroundColor = '#1E1A2B';
                  e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.1)';
                }
              }}
            >
              All Genres
            </button>
            {genres.map((genre) => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className="px-4 py-2 rounded-full whitespace-nowrap transition-all font-inter text-sm"
                style={{
                  backgroundColor: selectedGenre === genre ? '#A78BFA' : '#1E1A2B',
                  color: selectedGenre === genre ? '#07060A' : '#9B95B5',
                  border: `1px solid ${selectedGenre === genre ? '#A78BFA' : 'rgba(196, 181, 253, 0.1)'}`,
                }}
                onMouseEnter={(e) => {
                  if (selectedGenre !== genre) {
                    e.currentTarget.style.backgroundColor = '#2A2636';
                    e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.28)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedGenre !== genre) {
                    e.currentTarget.style.backgroundColor = '#1E1A2B';
                    e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.1)';
                  }
                }}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{
              borderColor: 'rgba(167, 139, 250, 0.3)',
              borderTopColor: '#A78BFA',
            }} />
            <p className="font-inter" style={{ color: '#9B95B5' }}>Loading music...</p>
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

        {/* Music Grid */}
        {!loading && !error && (
          <>
            {filteredMusic.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎵</div>
                <p className="text-lg font-inter" style={{ color: '#9B95B5' }}>No music found</p>
                <p className="text-sm mt-2 font-inter" style={{ color: 'rgba(155, 149, 181, 0.7)' }}>
                  {searchQuery || selectedGenre 
                    ? 'Try different search terms or filters'
                    : 'No music available at the moment'}
                </p>
                {(searchQuery || selectedGenre) && (
                  <button
                    onClick={handleClearFilters}
                    className="mt-4 px-4 py-2 rounded-full transition-all font-inter"
                    style={{
                      backgroundColor: '#A78BFA',
                      color: '#07060A',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#C4B5FD';
                      e.currentTarget.style.boxShadow = '0 12px 40px rgba(167, 139, 250, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#A78BFA';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="mb-4 font-inter text-sm" style={{ color: '#9B95B5' }}>
                  Showing {filteredMusic.length} {filteredMusic.length === 1 ? 'track' : 'tracks'}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {filteredMusic.map((track) => {
                  const favorited = isFavorite(track._id);
                  const isToggling = togglingFavorite === track._id;

                  return (
                  <div
                    key={track._id}
                    className="group cursor-pointer"
                    onClick={() => handlePlayTrack(track)}
                  >
                    {/* Album Art */}
                    <div className="relative aspect-square rounded-lg overflow-hidden mb-3 border transition-all" style={{
                      backgroundColor: '#15121D',
                      borderColor: 'rgba(196, 181, 253, 0.1)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)';
                      e.currentTarget.style.borderColor = 'rgba(167, 139, 250, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.1)';
                    }}
                    >
                      {track.coverImage ? (
                        <img
                          src={track.coverImage}
                          alt={track.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-6xl bg-gradient-to-br" style={{
                          backgroundImage: 'linear-gradient(135deg, #1E1A2B, #2A2636)',
                        }}>
                          🎵
                        </div>
                      )}

                      {/* Favorite Button */}
                      {user && (
                        <button
                          onClick={(e) => handleToggleFavorite(e, track._id)}
                          disabled={isToggling}
                          className="absolute top-2 left-2 p-2 rounded-full transition-all disabled:opacity-50 z-10 border"
                          style={{
                            backgroundColor: 'rgba(7, 6, 10, 0.8)',
                            borderColor: 'rgba(196, 181, 253, 0.1)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(30, 26, 43, 0.9)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(7, 6, 10, 0.8)';
                          }}
                          aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          {isToggling ? (
                            <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{
                              borderColor: 'rgba(167, 139, 250, 0.3)',
                              borderTopColor: '#A78BFA',
                            }} />
                          ) : (
                            <svg
                              className="w-5 h-5 transition-colors"
                              stroke="currentColor"
                              strokeWidth="2"
                              fill={favorited ? 'currentColor' : 'none'}
                              style={{
                                color: favorited ? '#B794F6' : '#9B95B5',
                              }}
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                              />
                            </svg>
                          )}
                        </button>
                      )}
                      
                      {/* Play Button Overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center" style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                      }}>
                        {currentTrack?._id === track._id && isPlaying ? (
                          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{
                            background: 'linear-gradient(135deg, #A78BFA, #C4B5FD)',
                            boxShadow: '0 12px 40px rgba(167, 139, 250, 0.4)',
                          }}>
                            <svg className="w-8 h-8 text-bg-dark" fill="currentColor" viewBox="0 0 20 20" style={{ color: '#07060A' }}>
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{
                            background: 'linear-gradient(135deg, #A78BFA, #C4B5FD)',
                            boxShadow: '0 12px 40px rgba(167, 139, 250, 0.4)',
                          }}>
                            <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 20 20" style={{ color: '#07060A' }}>
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Now Playing Indicator */}
                      {currentTrack?._id === track._id && (
                        <div className="absolute top-2 right-2">
                          <div className="flex gap-1 items-end h-4">
                            <div className="w-1 rounded-full animate-pulse" style={{ height: '60%', backgroundColor: '#A78BFA' }} />
                            <div className="w-1 rounded-full animate-pulse" style={{ height: '100%', backgroundColor: '#A78BFA', animationDelay: '0.2s' }} />
                            <div className="w-1 rounded-full animate-pulse" style={{ height: '80%', backgroundColor: '#A78BFA', animationDelay: '0.4s' }} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Track Info */}
                    <div>
                      <h3 className="font-semibold truncate transition-colors text-sm font-inter" style={{
                        color: '#F5F3FA',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#A78BFA')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#F5F3FA')}
                      >
                        {track.title}
                      </h3>
                      <p className="text-sm truncate font-inter" style={{ color: '#9B95B5' }}>{track.artist}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs font-inter flex-wrap" style={{ color: 'rgba(155, 149, 181, 0.7)' }}>
                        {track.genre && (
                          <span className="px-2 py-0.5 rounded-full border" style={{
                            backgroundColor: '#1E1A2B',
                            borderColor: 'rgba(196, 181, 253, 0.1)',
                          }}>
                            {track.genre}
                          </span>
                        )}
                        <span>{track.plays} plays</span>
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
