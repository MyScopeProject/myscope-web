'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

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

export default function MovieDetailPage() {
  const params = useParams();
  const router = useRouter();
  const movieId = params.id as string;

  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTheatre, setSelectedTheatre] = useState<string | null>(null);

  useEffect(() => {
    if (movieId) {
      fetchMovie();
    }
  }, [movieId]);

  const fetchMovie = async () => {
    try {
      setLoading(true);
      setError('');

      const res = await fetch(`${API_URL}/api/movies/${movieId}`);
      const data = await res.json();

      if (data.success) {
        setMovie(data.data);
      } else {
        setError('Movie not found');
      }
    } catch (err) {
      setError('Error fetching movie details');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = (theatre: Theatre, showtime: string) => {
    // Navigate to booking page
    router.push(`/movies/${movieId}/booking`);
  };

  if (loading) {
    return (
      <div className="pt-16 min-h-screen pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading movie details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="pt-16 min-h-screen pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-400 mb-4">
            {error || 'Movie not found'}
          </div>
          <button
            onClick={() => router.push('/movies')}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            ← Back to Movies
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-16 min-h-screen pb-24">
      {/* Back Button */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <button
          onClick={() => router.push('/movies')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Movies
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Movie Header */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {/* Poster */}
          <div className="md:col-span-1">
            <div className="relative aspect-2/3 bg-gray-900 rounded-xl overflow-hidden border border-gray-700">
              {movie.poster ? (
                <img
                  src={movie.poster}
                  alt={movie.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-8xl">
                  🎬
                </div>
              )}
              {movie.rating && (
                <div className="absolute top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg text-lg font-bold">
                  {movie.rating}
                </div>
              )}
            </div>
          </div>

          {/* Movie Info */}
          <div className="md:col-span-2">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{movie.title}</h1>

            {/* Genres */}
            <div className="flex gap-2 flex-wrap mb-6">
              {movie.genre.map((g, idx) => (
                <span
                  key={idx}
                  className="px-4 py-1.5 bg-red-600/20 text-red-400 border border-red-500/50 rounded-full text-sm font-medium"
                >
                  {g}
                </span>
              ))}
            </div>

            {/* Meta Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {movie.duration && (
                <div>
                  <p className="text-gray-500 text-sm mb-1">Duration</p>
                  <p className="text-white font-medium">{movie.duration}</p>
                </div>
              )}
              {movie.language && (
                <div>
                  <p className="text-gray-500 text-sm mb-1">Language</p>
                  <p className="text-white font-medium">{movie.language}</p>
                </div>
              )}
              {movie.rating && (
                <div>
                  <p className="text-gray-500 text-sm mb-1">Rating</p>
                  <p className="text-white font-medium">{movie.rating}</p>
                </div>
              )}
              <div>
                <p className="text-gray-500 text-sm mb-1">Theaters</p>
                <p className="text-white font-medium">{movie.theatres.length}</p>
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-3">Synopsis</h2>
              <p className="text-gray-300 leading-relaxed">{movie.description}</p>
            </div>

            {/* Source & Last Updated */}
            <div className="flex gap-6 text-sm text-gray-500">
              {movie.source && <p>Source: {movie.source}</p>}
              <p>Updated: {new Date(movie.lastUpdated).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Trailer */}
        {movie.trailer && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Trailer</h2>
            <div className="relative w-full rounded-xl overflow-hidden border border-gray-700" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute top-0 left-0 w-full h-full"
                src={movie.trailer}
                title={`${movie.title} Trailer`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}

        {/* Showtimes */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Select Theater & Showtime</h2>
          
          {movie.theatres.length === 0 ? (
            <div className="text-center py-12 bg-gray-800 rounded-xl border border-gray-700">
              <p className="text-gray-400">No showtimes available</p>
            </div>
          ) : (
            <div className="space-y-6">
              {movie.theatres.map((theatre, idx) => (
                <div
                  key={idx}
                  className="bg-gray-800 rounded-xl border border-gray-700 p-6 hover:border-red-500 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold mb-1">{theatre.name}</h3>
                      <p className="text-gray-400 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {theatre.location}
                      </p>
                    </div>
                    <div className="mt-2 md:mt-0">
                      <p className="text-2xl font-bold text-red-400">
                        Rs {theatre.price.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500">per ticket</p>
                    </div>
                  </div>

                  {/* Date */}
                  <p className="text-sm text-gray-400 mb-4">
                    {new Date(theatre.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>

                  {/* Showtimes */}
                  <div>
                    <p className="text-sm font-medium text-gray-300 mb-3">Select Showtime:</p>
                    <div className="flex flex-wrap gap-3">
                      {theatre.showtimes.map((time, timeIdx) => (
                        <button
                          key={timeIdx}
                          onClick={() => handleBooking(theatre, time)}
                          className="px-6 py-3 bg-gray-700 hover:bg-red-600 border border-gray-600 hover:border-red-500 rounded-lg font-medium transition-all hover:scale-105"
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
