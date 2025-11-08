'use client';

import { useState, useEffect } from 'react';
import { useMusicPlayer } from '@/context/MusicPlayerContext';

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
  
  const { playTrack, currentTrack, isPlaying } = useMusicPlayer();

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

  const filteredMusic = Array.isArray(music) ? music : [];

  return (
    <div className="pt-16 min-h-screen pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Music
          </h1>
          <p className="text-gray-400 text-lg">
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
              className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
            />
            <button
              onClick={handleSearch}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors"
            >
              Search
            </button>
            {(searchQuery || selectedGenre) && (
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
          {(searchQuery || selectedGenre) && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400">Active filters:</span>
              {searchQuery && (
                <span className="px-3 py-1 bg-purple-600/20 text-purple-400 rounded-full flex items-center gap-2">
                  Search: "{searchQuery}"
                  <button onClick={() => setSearchQuery('')} className="hover:text-white">×</button>
                </span>
              )}
              {selectedGenre && (
                <span className="px-3 py-1 bg-purple-600/20 text-purple-400 rounded-full flex items-center gap-2">
                  Genre: {selectedGenre}
                  <button onClick={() => setSelectedGenre('')} className="hover:text-white">×</button>
                </span>
              )}
            </div>
          )}

          {/* Genre Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedGenre('')}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                selectedGenre === ''
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              All Genres
            </button>
            {genres.map((genre) => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                  selectedGenre === genre
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading music...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-400 mb-8">
            {error}
          </div>
        )}

        {/* Music Grid */}
        {!loading && !error && (
          <>
            {filteredMusic.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎵</div>
                <p className="text-gray-400 text-lg">No music found</p>
                <p className="text-gray-500 text-sm mt-2">
                  {searchQuery || selectedGenre 
                    ? 'Try different search terms or filters'
                    : 'No music available at the moment'}
                </p>
                {(searchQuery || selectedGenre) && (
                  <button
                    onClick={handleClearFilters}
                    className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="mb-4 text-gray-400">
                  Showing {filteredMusic.length} {filteredMusic.length === 1 ? 'track' : 'tracks'}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {filteredMusic.map((track) => (
                  <div
                    key={track._id}
                    className="group cursor-pointer"
                    onClick={() => handlePlayTrack(track)}
                  >
                    {/* Album Art */}
                    <div className="relative aspect-square bg-gray-800 rounded-lg overflow-hidden mb-3 hover:scale-105 transition-transform">
                      {track.coverImage ? (
                        <img
                          src={track.coverImage}
                          alt={track.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-6xl">
                          🎵
                        </div>
                      )}
                      
                      {/* Play Button Overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        {currentTrack?._id === track._id && isPlaying ? (
                          <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </div>
                        ) : (
                          <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Now Playing Indicator */}
                      {currentTrack?._id === track._id && (
                        <div className="absolute top-2 right-2">
                          <div className="flex gap-1 items-end h-4">
                            <div className="w-1 bg-purple-500 rounded-full animate-pulse" style={{ height: '60%' }}></div>
                            <div className="w-1 bg-purple-500 rounded-full animate-pulse" style={{ height: '100%', animationDelay: '0.2s' }}></div>
                            <div className="w-1 bg-purple-500 rounded-full animate-pulse" style={{ height: '80%', animationDelay: '0.4s' }}></div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Track Info */}
                    <div>
                      <h3 className="font-semibold truncate group-hover:text-purple-400 transition-colors">
                        {track.title}
                      </h3>
                      <p className="text-gray-400 text-sm truncate">{track.artist}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        {track.genre && (
                          <span className="px-2 py-0.5 bg-gray-800 rounded-full">
                            {track.genre}
                          </span>
                        )}
                        <span>{track.plays} plays</span>
                      </div>
                    </div>
                  </div>
                ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
