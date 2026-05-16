'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  profileImage?: string;
  provider?: string; // 'local', 'google', etc.
  phone?: string;
  city?: string;
}

interface AuthContextType {
  user: User | null;
  // Sentinel: 'cookie' when authenticated via httpOnly cookie, null otherwise.
  // Kept in the interface so existing `if (!token)` checks continue to work.
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  googleLogin: (credential: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const COOKIE_SENTINEL = 'cookie';

type RawUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  profile_image?: string;
  google_id?: string;
  phone?: string;
  city?: string;
};

const mapUser = (raw: RawUser): User => ({
  id: raw.id,
  name: raw.name,
  email: raw.email,
  role: raw.role ?? 'user',
  createdAt: raw.created_at,
  profileImage: raw.profile_image,
  provider: raw.google_id ? 'google' : 'local',
  phone: raw.phone,
  city: raw.city,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUser(mapUser(data.data.user));
        setToken(COOKIE_SENTINEL);
      } else {
        setUser(null);
        setToken(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (data.success) {
        setUser(mapUser(data.data.user));
        setToken(COOKIE_SENTINEL);
        return { success: true };
      }
      return { success: false, error: data.message || 'Registration failed' };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        setUser(mapUser(data.data.user));
        setToken(COOKIE_SENTINEL);
        return { success: true };
      }
      return { success: false, error: data.message || 'Login failed' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setToken(null);
    }
  };

  const googleLogin = async (credential: string) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: credential }),
      });

      const data = await response.json();

      if (data.success) {
        setUser(mapUser(data.data.user));
        setToken(COOKIE_SENTINEL);
        return { success: true };
      }
      return { success: false, error: data.message || 'Google login failed' };
    } catch (error) {
      console.error('Google login error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const updateUser = async (userData: Partial<User>) => {
    try {
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      if (!userData.name && !userData.email) {
        return { success: false, error: 'No data provided to update' };
      }

      const response = await fetch(`${API_URL}/api/user/profile`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (data.success && data.data?.user) {
        setUser(mapUser(data.data.user));
        return { success: true };
      }
      return { success: false, error: data.message || 'Update failed' };
    } catch (error) {
      console.error('Update error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, checkAuth, updateUser, googleLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
