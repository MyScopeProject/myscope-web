'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Film, Ticket, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface Theatre {
  name: string;
  location: string;
  showtimes: string[];
  date: string;
  price: number;
  _id?: string;
}

interface Movie {
  id: string;
  title: string;
  description: string;
  genre: string;
  language: string;
  duration: number;
  rating: string;
  poster: string;
  backdrop?: string;
  director?: string;
  cast_list?: string;
  imdb_rating?: number;
  theatres?: Array<{ theatre_name: string; location: string; showtime: string }>;
  created_at: string;
  updated_at: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function MoviesPage() {
  const router = useRouter();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [filteredMovies, setFilteredMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [allGenres, setAllGenres] = useState<string[]>([]);

  useEffect(() => {
    fetchMovies();
  }, []);

  useEffect(() => {
    if (selectedGenre === 'all') {
      setFilteredMovies(movies);
    } else {
      setFilteredMovies(movies.filter(m => m.genre?.includes(selectedGenre)));
    }
  }, [selectedGenre, movies]);

  const fetchMovies = async () => {
    try {
      setLoading(true);
      setError('');
      
      const res = await fetch(`${API_URL}/api/movies`);
      const data = await res.json();
      
      if (data.success) {
        const movieData = data.data || [];
        setMovies(movieData);
        setFilteredMovies(movieData);

        // Extract all unique genres (genre is a comma-separated string)
        const genres = new Set<string>();
        movieData.forEach((m: Movie) => {
          if (m.genre) {
            m.genre.split(',').forEach(g => genres.add(g.trim()));
          }
        });
        setAllGenres(Array.from(genres).sort());
      } else {
        setError('Failed to load movies');
      }
    } catch (err) {
      setError('Error fetching movies');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMovieClick = (movieId: string) => {
    router.push(`/movies/${movieId}`);
  };

  if (loading) {
    return (
      <div className="pt-16 min-h-screen pb-24" style={{ backgroundColor: '#07060A' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{
              borderColor: 'rgba(183, 148, 246, 0.3)',
              borderTopColor: '#B794F6',
            }} />
            <p className="font-inter" style={{ color: '#9B95B5' }}>Loading movies...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-16 min-h-screen pb-24" style={{ backgroundColor: '#07060A' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-lg font-inter border flex items-center gap-3"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderColor: 'rgba(239, 68, 68, 0.3)',
              color: '#EF4444',
            }}
          >
            <AlertCircle size={20} />
            <span>{error}</span>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-16 min-h-screen pb-24" style={{ backgroundColor: '#07060A' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center gap-4 mb-4">
            <Film size={48} style={{ color: '#B794F6' }} />
            <h1 className="text-5xl md:text-6xl font-outfit font-bold" style={{
              background: 'linear-gradient(110deg, #B794F6, #C4B5FD)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.04em',
            }}>
              Now Showing
            </h1>
          </div>
          <p className="text-lg font-inter" style={{ color: '#9B95B5' }}>
            Book your tickets for the latest movies in theaters
          </p>
        </motion.div>

        {/* Genre Filter */}
        {allGenres.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-10 flex flex-wrap gap-3"
          >
            <button
              onClick={() => setSelectedGenre('all')}
              className="px-6 py-3 rounded-lg font-inter font-semibold transition-all duration-300"
              style={{
                background: selectedGenre === 'all' ? '#B794F6' : '#15121D',
                color: selectedGenre === 'all' ? '#07060A' : '#9B95B5',
                border: `1px solid ${selectedGenre === 'all' ? '#B794F6' : 'rgba(196, 181, 253, 0.1)'}`,
              }}
              onMouseEnter={(e) => {
                if (selectedGenre !== 'all') {
                  e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.3)';
                  e.currentTarget.style.background = '#1E1A2B';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedGenre !== 'all') {
                  e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.1)';
                  e.currentTarget.style.background = '#15121D';
                }
              }}
            >
              All Genres
            </button>

            {allGenres.map((genre) => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className="px-6 py-3 rounded-lg font-inter font-semibold transition-all duration-300"
                style={{
                  background: selectedGenre === genre ? '#B794F6' : '#15121D',
                  color: selectedGenre === genre ? '#07060A' : '#9B95B5',
                  border: `1px solid ${selectedGenre === genre ? '#B794F6' : 'rgba(196, 181, 253, 0.1)'}`,
                }}
                onMouseEnter={(e) => {
                  if (selectedGenre !== genre) {
                    e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.3)';
                    e.currentTarget.style.background = '#1E1A2B';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedGenre !== genre) {
                    e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.1)';
                    e.currentTarget.style.background = '#15121D';
                  }
                }}
              >
                {genre}
              </button>
            ))}
          </motion.div>
        )}

        {/* Movies Count */}
        {filteredMovies.length > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 font-inter text-sm" style={{ color: '#9B95B5' }}
          >
            Showing {filteredMovies.length} {filteredMovies.length === 1 ? 'movie' : 'movies'}
          </motion.p>
        )}

        {/* Movies Grid */}
        {filteredMovies.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border p-12 text-center"
            style={{
              background: '#15121D',
              borderColor: 'rgba(196, 181, 253, 0.1)',
            }}
          >
            <div className="text-6xl mb-4">🎬</div>
            <p className="text-xl font-outfit mb-2" style={{ color: '#F5F3FA' }}>
              No movies found
            </p>
            <p className="font-inter" style={{ color: '#9B95B5' }}>
              {selectedGenre === 'all' ? 'Check back soon for new releases' : `No movies in ${selectedGenre} genre`}
            </p>
            {selectedGenre !== 'all' && (
              <button
                onClick={() => setSelectedGenre('all')}
                className="mt-6 px-6 py-3 rounded-lg font-inter font-semibold"
                style={{
                  background: '#A78BFA',
                  color: '#07060A',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#B794F6')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#A78BFA')}
              >
                View All Movies
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: { staggerChildren: 0.08 },
              },
            }}
          >
            {filteredMovies.map((movie) => (
              <motion.div
                key={movie._id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
                }}
                onClick={() => handleMovieClick(movie._id)}
                className="group cursor-pointer rounded-xl overflow-hidden border transition-all duration-300"
                style={{
                  backgroundColor: '#15121D',
                  borderColor: 'rgba(196, 181, 253, 0.1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.3)';
                  e.currentTarget.style.boxShadow = '0 24px 50px rgba(167, 139, 250, 0.15)';
                  e.currentTarget.style.transform = 'translateY(-8px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.1)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Movie Poster */}
                <div className="relative aspect-2/3 overflow-hidden" style={{ backgroundColor: '#1E1A2B' }}>
                  {movie.poster ? (
                    <img
                      src={movie.poster}
                      alt={movie.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl bg-gradient-to-br" style={{
                      backgroundImage: 'linear-gradient(135deg, #1E1A2B, #2A2636)',
                    }}>
                      🎬
                    </div>
                  )}
                  
                  {/* Rating Badge */}
                  {movie.rating && (
                    <div className="absolute top-3 right-3 px-3 py-1 rounded-lg text-sm font-semibold font-inter backdrop-blur-sm" style={{
                      background: 'rgba(183, 148, 246, 0.9)',
                      color: '#07060A',
                    }}>
                      {movie.rating}
                    </div>
                  )}

                  {/* Overlay on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4 bg-gradient-to-t"
                    style={{
                      background: 'linear-gradient(to top, #07060A, transparent)',
                    }}
                  >
                    <div className="flex items-center gap-2 font-inter text-sm text-white">
                      <Ticket size={16} />
                      <span>{movie.theatres.length} Theaters</span>
                    </div>
                  </div>
                </div>

                {/* Movie Details */}
                <div className="p-4">
                  {/* Genre Tags */}
                  <div className="mb-3 flex gap-2 flex-wrap">
                    {movie.genre.slice(0, 2).map((g, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 rounded-full text-xs font-inter font-semibold"
                        style={{
                          backgroundColor: 'rgba(196, 181, 253, 0.1)',
                          color: '#C4B5FD',
                        }}
                      >
                        {g}
                      </span>
                    ))}
                    {movie.genre.length > 2 && (
                      <span
                        className="px-2 py-1 rounded-full text-xs font-inter font-semibold"
                        style={{
                          backgroundColor: 'rgba(196, 181, 253, 0.08)',
                          color: '#9B95B5',
                        }}
                      >
                        +{movie.genre.length - 2}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-bold mb-2 font-outfit line-clamp-2 transition-colors" style={{
                    color: '#F5F3FA',
                  }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#B794F6')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#F5F3FA')}
                  >
                    {movie.title}
                  </h3>

                  {/* Description */}
                  <p className="text-xs mb-3 line-clamp-2 font-inter" style={{ color: '#9B95B5' }}>
                    {movie.description}
                  </p>

                  {/* Divider */}
                  <div style={{ borderTop: '1px solid rgba(196, 181, 253, 0.1)', margin: '12px 0' }} />

                  {/* Meta Info */}
                  <div className="space-y-2 text-xs font-inter" style={{ color: '#9B95B5' }}>
                    <div className="flex items-center gap-2">
                      <Clock size={14} />
                      <span>{movie.duration}</span>
                    </div>
                    {movie.language && (
                      <div style={{ color: '#C4B5FD' }}>
                        {movie.language}
                      </div>
                    )}
                    {movie.theatres.length > 0 && (
                      <div style={{ color: '#B794F6', fontWeight: 600 }}>
                        From ₹{Math.min(...movie.theatres.map(t => t.price)).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
