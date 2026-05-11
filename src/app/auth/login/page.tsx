'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      router.push('/dashboard');
    } else {
      setError(result.error || 'Login failed. Please try again.');
    }
    
    setLoading(false);
  };

  return (
    <div className="pt-16 min-h-screen flex items-center justify-center px-4 bg-bg-dark">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-outfit font-bold mb-2 text-text-primary">Welcome Back</h1>
          <p className="text-text-muted font-plex-sans">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-surface-1 p-8 rounded-lg border border-border">
          {error && (
            <div className="p-4 bg-status-destructive/10 border border-status-destructive rounded-lg text-status-destructive text-sm font-plex-sans">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-inter font-medium mb-2 text-text-primary">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-surface-2 border border-border rounded-full focus:ring-2 focus:ring-accent-primary focus:border-accent-primary outline-none transition-all text-text-primary placeholder-text-muted"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-inter font-medium mb-2 text-text-primary">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-surface-2 border border-border rounded-full focus:ring-2 focus:ring-accent-primary focus:border-accent-primary outline-none transition-all text-text-primary placeholder-text-muted"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-accent-primary hover:bg-accent-purple rounded-full font-semibold text-bg-dark hover:shadow-glow hover:shadow-accent-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-inter"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <p className="text-center text-text-muted font-plex-sans">
            Don't have an account?{' '}
            <Link href="/auth/register" className="text-accent-primary hover:text-accent-purple transition-colors">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
