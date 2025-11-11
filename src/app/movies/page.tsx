'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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
      <div className="pt-16 min-h-screen pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading movies...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pt-16 min-h-screen pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-400">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-16 min-h-screen pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-linear-to-r from-red-400 to-pink-400 bg-clip-text text-transparent flex items-center gap-3">
            🎬 Now Showing
          </h1>
          <p className="text-gray-400 text-lg">
            Book your tickets for the latest movies in theaters
          </p>
        </div>

        {/* Movies Grid */}
        {movies.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎬</div>
            <p className="text-gray-400 text-lg">No movies available</p>
            <p className="text-gray-500 text-sm mt-2">
              Check back soon for new releases
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 text-gray-400">
              Showing {movies.length} {movies.length === 1 ? 'movie' : 'movies'}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {movies.map((movie) => (
                <div
                  key={movie._id}
                  onClick={() => handleMovieClick(movie._id)}
                  className="group cursor-pointer bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-red-500 transition-all hover:transform hover:scale-[1.02]"
                >
                  {/* Movie Poster */}
                  <div className="relative aspect-2/3 bg-gray-900 overflow-hidden">
                    {movie.poster ? (
                      <img
                        src={movie.poster}
                        alt={movie.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-6xl">
                        🎬
                      </div>
                    )}
                    
                    {/* Rating Badge */}
                    {movie.rating && (
                      <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                        {movie.rating}
                      </div>
                    )}
                  </div>

                  {/* Movie Details */}
                  <div className="p-5">
                    {/* Genre */}
                    <div className="mb-2 flex gap-2 flex-wrap">
                      {movie.genre.slice(0, 2).map((g, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 bg-gray-700 text-gray-300 text-xs rounded-full"
                        >
                          {g}
                        </span>
                      ))}
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold mb-2 group-hover:text-red-400 transition-colors line-clamp-2">
                      {movie.title}
                    </h3>

                    {/* Description */}
                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                      {movie.description}
                    </p>

                    {/* Meta Info */}
                    <div className="flex items-center gap-3 mb-4 text-sm text-gray-300">
                      {movie.duration && (
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{movie.duration}</span>
                        </div>
                      )}
                      {movie.language && (
                        <span>• {movie.language}</span>
                      )}
                    </div>

                    {/* Theaters Count */}
                    <div className="pt-4 border-t border-gray-700">
                      <p className="text-sm text-gray-400">
                        Showing at {movie.theatres.length} {movie.theatres.length === 1 ? 'theater' : 'theaters'}
                      </p>
                      {movie.theatres.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
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
