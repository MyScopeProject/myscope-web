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

interface AuthResult {
  success: boolean;
  error?: string;
  // 'EMAIL_NOT_VERIFIED' surfaces from /login when account isn't verified yet.
  code?: 'EMAIL_NOT_VERIFIED' | string;
  // Set when /register succeeds — the account exists but isn't logged in yet.
  needsVerification?: boolean;
}

interface AuthContextType {
  user: User | null;
  // Sentinel: 'cookie' when authenticated via httpOnly cookie, null otherwise.
  // Kept in the interface so existing `if (!token)` checks continue to work.
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (name: string, email: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  googleLogin: (credential: string) => Promise<{ success: boolean; error?: string }>;
  verifyEmail: (email: string, otp: string) => Promise<AuthResult>;
  resendVerification: (email: string) => Promise<{ success: boolean; error?: string }>;
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

  const register = async (name: string, email: string, password: string): Promise<AuthResult> => {
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      // Backend creates the account but doesn't issue a cookie until verification.
      if (data.success) {
        return { success: true, needsVerification: true };
      }
      return { success: false, error: data.message || 'Registration failed' };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const login = async (email: string, password: string): Promise<AuthResult> => {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        // /login response shape: { success, user, token } (user at the top level)
        const rawUser = data.data?.user ?? data.user;
        if (rawUser) {
          setUser(mapUser(rawUser));
          setToken(COOKIE_SENTINEL);
        } else {
          // Cookie was set but body lacks user — pick it up via checkAuth.
          await checkAuth();
        }
        return { success: true };
      }
      // Surface EMAIL_NOT_VERIFIED so callers can redirect to /auth/verify-email.
      return { success: false, error: data.message || 'Login failed', code: data.code };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const verifyEmail = async (email: string, otp: string): Promise<AuthResult> => {
    try {
      const response = await fetch(`${API_URL}/api/auth/verify-email`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await response.json();
      if (data.success) {
        // Verify endpoint also sets the auth cookie + returns the user.
        if (data.data?.user) {
          setUser(mapUser(data.data.user));
          setToken(COOKIE_SENTINEL);
        }
        return { success: true };
      }
      return { success: false, error: data.message || 'Verification failed' };
    } catch (error) {
      console.error('Verify-email error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const resendVerification = async (email: string) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/resend-verification`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      return data.success
        ? { success: true }
        : { success: false, error: data.message || 'Could not resend code' };
    } catch (error) {
      console.error('Resend-verification error:', error);
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

      // Accept any subset of editable fields (name, email, phone, city)
      const hasUpdate = ['name', 'email', 'phone', 'city'].some(
        (k) => (userData as Record<string, unknown>)[k] !== undefined,
      );
      if (!hasUpdate) {
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
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, checkAuth, updateUser, googleLogin, verifyEmail, resendVerification }}>
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
