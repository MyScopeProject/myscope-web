'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Film } from 'lucide-react';

interface Theatre {
  name: string;
  location: string;
  showtimes: string[];
  date: string;
  price: number;
  _id?: string;
}

interface Movie {
  _id: string;
  title: string;
  description: string;
  genre: string[];
  language: string;
  duration: string;
  rating: string;
  poster: string;
  trailer?: string;
  theatres: Theatre[];
  source: string;
  lastUpdated: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function MoviesPage() {
  const router = useRouter();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMovies();
  }, []);

  const fetchMovies = async () => {
    try {
      setLoading(true);
      setError('');
      
      const res = await fetch(`${API_URL}/api/movies`);
      const data = await res.json();
      
      if (data.success) {
        setMovies(data.data || []);
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
              borderColor: 'rgba(255, 122, 198, 0.3)',
              borderTopColor: '#FF7AC6',
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
          <div className="p-4 rounded-lg font-inter border" style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderColor: 'rgba(239, 68, 68, 0.28)',
            color: '#ef4444',
          }}>
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-16 min-h-screen pb-24" style={{ backgroundColor: '#07060A' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl md:text-7xl font-outfit font-bold mb-4 flex items-center gap-4" style={{
            background: 'linear-gradient(110deg, #FF7AC6, #6366F1)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.04em',
          }}>
            <Film size={56} style={{ color: '#FF7AC6' }} />
            Now Showing
          </h1>
          <p className="text-lg font-inter" style={{ color: '#9B95B5' }}>
            Book your tickets for the latest movies in theaters
          </p>
        </div>

        {/* Movies Grid */}
        {movies.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎬</div>
            <p className="text-lg font-inter" style={{ color: '#9B95B5' }}>No movies available</p>
            <p className="text-sm font-inter mt-2" style={{ color: 'rgba(155, 149, 181, 0.7)' }}>
              Check back soon for new releases
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 font-inter text-sm" style={{ color: '#9B95B5' }}>
              Showing {movies.length} {movies.length === 1 ? 'movie' : 'movies'}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {movies.map((movie) => (
                <div
                  key={movie._id}
                  onClick={() => handleMovieClick(movie._id)}
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
                  {/* Movie Poster */}
                  <div className="relative aspect-2/3 overflow-hidden" style={{ backgroundColor: '#1E1A2B' }}>
                    {movie.poster ? (
                      <img
                        src={movie.poster}
                        alt={movie.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
                      <div className="absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-semibold font-inter" style={{
                        backgroundColor: '#FF7AC6',
                        color: '#07060A',
                      }}>
                        {movie.rating}
                      </div>
                    )}
                  </div>

                  {/* Movie Details */}
                  <div className="p-5">
                    {/* Genre */}
                    <div className="mb-3 flex gap-2 flex-wrap">
                      {movie.genre.slice(0, 2).map((g, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-full text-xs font-inter"
                          style={{
                            backgroundColor: 'rgba(196, 181, 253, 0.1)',
                            color: '#C4B5FD',
                          }}
                        >
                          {g}
                        </span>
                      ))}
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-bold mb-2 font-outfit line-clamp-2 transition-colors" style={{
                      color: '#F5F3FA',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#FF7AC6')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#F5F3FA')}
                    >
                      {movie.title}
                    </h3>

                    {/* Description */}
                    <p className="text-sm mb-4 line-clamp-2 font-inter" style={{ color: '#9B95B5' }}>
                      {movie.description}
                    </p>

                    {/* Meta Info */}
                    <div className="flex items-center gap-3 mb-4 text-sm font-inter" style={{ color: '#C4B5FD' }}>
                      {movie.duration && (
                        <div className="flex items-center gap-1">
                          <Clock size={16} />
                          <span>{movie.duration}</span>
                        </div>
                      )}
                      {movie.language && (
                        <span>• {movie.language}</span>
                      )}
                    </div>

                    {/* Theaters Count */}
                    <div className="pt-4 font-inter" style={{
                      borderTop: '1px solid rgba(196, 181, 253, 0.1)',
                    }}>
                      <p className="text-sm" style={{ color: '#9B95B5' }}>
                        Showing at {movie.theatres.length} {movie.theatres.length === 1 ? 'theater' : 'theaters'}
                      </p>
                      {movie.theatres.length > 0 && (
                        <p className="text-xs mt-1" style={{ color: '#FF7AC6' }}>
                          From Rs {Math.min(...movie.theatres.map(t => t.price))}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
