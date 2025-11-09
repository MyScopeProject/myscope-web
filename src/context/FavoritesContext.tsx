'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

interface FavoritesContextType {
  favorites: string[];
  addFavorite: (trackId: string) => Promise<void>;
  removeFavorite: (trackId: string) => Promise<void>;
  isFavorite: (trackId: string) => boolean;
  loading: boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    if (!token) {
      setFavorites([]);
      setLoading(false);
      return;
    }

    async function fetchFavorites() {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/favorites`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (!res.ok) throw new Error('Failed to fetch favorites');
        
        const data = await res.json();
        
        if (data.success && data.data?.music) {
          setFavorites(data.data.music.map((track: any) => track._id));
        } else {
          setFavorites([]);
        }
      } catch (error) {
        console.error('Error fetching favorites:', error);
        setFavorites([]);
      } finally {
        setLoading(false);
      }
    }

    fetchFavorites();
  }, [token, API_URL]);

  async function addFavorite(trackId: string) {
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/favorites/${trackId}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Failed to add favorite:', {
          status: res.status,
          statusText: res.statusText,
          error,
          trackId,
          apiUrl: `${API_URL}/api/favorites/${trackId}`
        });
        alert(`Failed to add favorite: ${error.message || res.statusText}`);
        return;
      }

      const data = await res.json();
      console.log('Added to favorites:', data);
      setFavorites((prev) => [...prev, trackId]);
    } catch (error) {
      console.error('Error adding favorite:', error);
      alert(`Error adding favorite: ${error instanceof Error ? error.message : 'Network error'}`);
    }
  }

  async function removeFavorite(trackId: string) {
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/favorites/${trackId}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Failed to remove favorite:', {
          status: res.status,
          statusText: res.statusText,
          error,
          trackId,
          apiUrl: `${API_URL}/api/favorites/${trackId}`
        });
        alert(`Failed to remove favorite: ${error.message || res.statusText}`);
        return;
      }

      const data = await res.json();
      console.log('Removed from favorites:', data);
      setFavorites((prev) => prev.filter((id) => id !== trackId));
    } catch (error) {
      console.error('Error removing favorite:', error);
      alert(`Error removing favorite: ${error instanceof Error ? error.message : 'Network error'}`);
    }
  }

  function isFavorite(trackId: string): boolean {
    return favorites.includes(trackId);
  }

  return (
    <FavoritesContext.Provider value={{ favorites, addFavorite, removeFavorite, isFavorite, loading }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within FavoritesProvider');
  }
  return context;
};
