'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const result = await register(formData.name, formData.email, formData.password);

    if (result.success) {
      router.push('/dashboard');
    } else {
      setError(result.error || 'Registration failed. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div className="pt-16 min-h-screen flex items-center justify-center px-4 py-12 bg-bg-dark">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-outfit font-bold mb-2 text-text-primary">Join MyScope</h1>
          <p className="text-text-muted font-plex-sans">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-surface-1 p-8 rounded-lg border border-border">
          {error && (
            <div className="p-4 bg-status-destructive/10 border border-status-destructive rounded-lg text-status-destructive text-sm font-plex-sans">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-inter font-medium mb-2 text-text-primary">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-surface-2 border border-border rounded-full focus:ring-2 focus:ring-accent-primary focus:border-accent-primary outline-none transition-all text-text-primary placeholder-text-muted"
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-inter font-medium mb-2 text-text-primary">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 bg-surface-2 border border-border rounded-full focus:ring-2 focus:ring-accent-primary focus:border-accent-primary outline-none transition-all text-text-primary placeholder-text-muted"
              placeholder="••••••••"
              required
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-inter font-medium mb-2 text-text-primary">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
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
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>

          <p className="text-center text-text-muted font-plex-sans">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-accent-primary hover:text-accent-purple transition-colors">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
