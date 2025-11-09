'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';

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
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserMusic() {
      try {
        const res = await fetch(`${API_URL}/api/music/user`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        
        if (data.success && data.data?.music) {
          setTracks(data.data.music);
        } else {
          setTracks([]);
        }
      } catch (error) {
        console.error('Failed to fetch user music', error);
        setTracks([]);
      } finally {
        setLoading(false);
      }
    }
    if (token) fetchUserMusic();
  }, [token]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading your music...</p>
      </div>
    );
  }

  return (
    <section>
      <h1 className="text-3xl font-bold mb-6">My Music Library</h1>
      {tracks.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
          <div className="text-5xl mb-3">🎵</div>
          <p className="text-gray-400">You have no tracks yet.</p>
          <p className="text-sm text-gray-500 mt-2">
            Upload your first track to get started!
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {tracks.map((track) => (
            <li key={track._id} className="bg-gray-800 rounded-lg p-4 flex flex-col items-center border border-gray-700 hover:border-purple-500 transition-colors">
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
          ))}
        </ul>
      )}
    </section>
  );
}
