'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useFavorites } from '../../../context/FavoritesContext';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface MusicTrack {
  _id: string;
  title: string;
  artist: string;
  genre: string;
  plays: number;
  coverImage?: string;
}

export default function MusicDashboardPage() {
  const { token } = useAuth();
  const { favorites, removeFavorite, loading: favoritesLoading } = useFavorites();
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingFavorite, setRemovingFavorite] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFavorites() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/api/favorites`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        
        if (data.success && data.data?.music) {
          setTracks(data.data.music);
        } else {
          setTracks([]);
        }
      } catch (error) {
        console.error('Failed to fetch favorites', error);
        setTracks([]);
      } finally {
        setLoading(false);
      }
    }

    fetchFavorites();
  }, [token, favorites.length]); // Re-fetch when favorites count changes

  const handleRemoveFavorite = async (trackId: string) => {
    setRemovingFavorite(trackId);
    try {
      await removeFavorite(trackId);
      // Remove from local state
      setTracks(prev => prev.filter(track => track._id !== trackId));
    } finally {
      setRemovingFavorite(null);
    }
  };

  if (loading || favoritesLoading) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading your favorites...</p>
      </div>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">My Favorites</h1>
          <span className="text-2xl">❤️</span>
        </div>
        <Link 
          href="/music"
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors flex items-center gap-2"
        >
          <span>🎵</span>
          <span>Browse All Music</span>
        </Link>
      </div>

      {tracks.length > 0 && (
        <div className="mb-4 text-gray-400">
          {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'} in your favorites
        </div>
      )}

      {tracks.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
          <div className="text-5xl mb-3">💔</div>
          <p className="text-gray-400">You haven't favorited any tracks yet.</p>
          <p className="text-sm text-gray-500 mt-2">
            Browse the music library and click the heart icon to add favorites!
          </p>
          <Link
            href="/music"
            className="inline-block mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
          >
            Browse Music
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {tracks.map((track) => {
            const isRemoving = removingFavorite === track._id;

            return (
              <li 
                key={track._id} 
                className={`bg-gray-800 rounded-lg p-4 flex flex-col items-center border border-gray-700 hover:border-red-500 transition-all relative ${
                  isRemoving ? 'opacity-50' : ''
                }`}
              >
                {/* Remove Favorite Button */}
                <button
                  onClick={() => handleRemoveFavorite(track._id)}
                  disabled={isRemoving}
                  className="absolute top-3 right-3 p-2 rounded-full bg-gray-900/80 hover:bg-gray-900 transition-colors disabled:opacity-50 group"
                  aria-label="Remove from favorites"
                >
                  {isRemoving ? (
                    <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg
                      className="w-6 h-6 fill-red-500 text-red-500 group-hover:fill-none transition-all"
                      stroke="currentColor"
                      strokeWidth="2"
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

                <img
                  src={track.coverImage || '/default-music-cover.png'}
                  alt={`${track.title} cover`}
                  className="w-32 h-32 object-cover rounded mb-4"
                  onError={(e) => {
                    e.currentTarget.src = '/default-music-cover.png';
                  }}
                />
                <h2 className="text-xl font-semibold text-center">{track.title}</h2>
                <p className="text-gray-400">{track.artist}</p>
                <p className="text-sm mt-2 text-purple-400">Genre: {track.genre}</p>
                <p className="text-sm text-gray-500">Plays: {track.plays}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
