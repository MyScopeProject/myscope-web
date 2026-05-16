'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { UserPlus, AlertCircle, CheckCircle, Loader } from 'lucide-react';
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
  const [passwordStrength, setPasswordStrength] = useState(0);

  const { register } = useAuth();
  const router = useRouter();

  const calculatePasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 6) strength += 1;
    if (pwd.length >= 10) strength += 1;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength += 1;
    if (/[0-9]/.test(pwd)) strength += 1;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength += 1;
    return strength;
  };

  const handlePasswordChange = (value: string) => {
    setFormData({ ...formData, password: value });
    setPasswordStrength(calculatePasswordStrength(value));
  };

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
      // Backend doesn't issue a session until the user verifies their email.
      // Remember the email so the verify page can prefill it.
      if (typeof window !== 'undefined') {
        localStorage.setItem('pendingVerificationEmail', formData.email);
      }
      router.push(`/auth/verify-email?email=${encodeURIComponent(formData.email)}`);
    } else {
      setError(result.error || 'Registration failed. Please try again.');
    }

    setLoading(false);
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.2,
      },
    },
  };

  const getStrengthColor = () => {
    if (passwordStrength <= 1) return '#FF6B6B';
    if (passwordStrength <= 2) return '#f59e0b';
    if (passwordStrength <= 3) return '#3b82f6';
    return '#10b981';
  };

  const getStrengthLabel = () => {
    if (passwordStrength <= 1) return 'Weak';
    if (passwordStrength <= 2) return 'Fair';
    if (passwordStrength <= 3) return 'Good';
    return 'Strong';
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12" style={{ backgroundColor: '#07060A' }}>
      {/* Animated Background Gradients */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at 20% 50%, rgba(167, 139, 250, 0.12) 0%, transparent 50%)',
        }} />
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at 80% 20%, rgba(255, 122, 198, 0.08) 0%, transparent 50%)',
        }} />
      </div>

      {/* Animated Gradient Orbs */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.05, 0.1, 0.05],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-1/3 -left-1/4 w-96 h-96 rounded-full blur-3xl -z-10"
        style={{
          background: 'rgba(167, 139, 250, 0.4)',
          filter: 'blur(80px)',
        }}
      />
      <motion.div
        animate={{
          scale: [1, 0.9, 1],
          opacity: [0.05, 0.08, 0.05],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -bottom-1/4 -right-1/4 w-96 h-96 rounded-full blur-3xl -z-10"
        style={{
          background: 'rgba(255, 122, 198, 0.3)',
          filter: 'blur(80px)',
        }}
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-md w-full"
      >
        {/* Header */}
        <motion.div variants={fadeInUp} className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full"
            style={{
              background: 'rgba(167, 139, 250, 0.1)',
              border: '1px solid rgba(167, 139, 250, 0.2)',
            }}
          >
            <UserPlus className="w-8 h-8" style={{ color: '#A78BFA' }} />
          </motion.div>
          <h1 className="text-4xl font-outfit font-bold mb-2 text-text-primary">Join MyScope</h1>
          <p className="text-text-secondary font-plex-sans text-lg">Create your account and discover amazing content</p>
        </motion.div>

        {/* Form Card */}
        <motion.div
          variants={fadeInUp}
          className="relative backdrop-blur-sm rounded-2xl p-8 border"
          style={{
            backgroundColor: 'rgba(21, 18, 29, 0.5)',
            borderColor: 'rgba(196, 181, 253, 0.15)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          }}
        >
          {/* Glow Effect */}
          <div
            className="absolute -inset-0.5 bg-gradient-to-r from-accent-primary to-pink-500 rounded-2xl -z-10 opacity-0 group-hover:opacity-20 blur transition duration-500"
            style={{
              background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.3) 0%, rgba(255, 122, 198, 0.2) 100%)',
              opacity: 0.1,
            }}
          />

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Alert */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 p-4 rounded-lg border"
                style={{
                  backgroundColor: 'rgba(255, 107, 107, 0.1)',
                  borderColor: 'rgba(255, 107, 107, 0.3)',
                }}
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#FF6B6B' }} />
                <p className="text-sm font-plex-sans" style={{ color: '#FF6B6B' }}>{error}</p>
              </motion.div>
            )}

            {/* Full Name Field */}
            <motion.div variants={fadeInUp}>
              <label htmlFor="name" className="block text-sm font-inter font-semibold mb-2.5 text-text-primary">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-surface-2 border border-border rounded-xl focus:ring-2 focus:ring-accent-primary focus:border-accent-primary outline-none transition-all text-text-primary placeholder-text-muted font-plex-sans"
                style={{
                  backgroundColor: 'rgba(30, 26, 43, 0.6)',
                }}
                placeholder="John Doe"
                required
              />
            </motion.div>

            {/* Email Field */}
            <motion.div variants={fadeInUp}>
              <label htmlFor="email" className="block text-sm font-inter font-semibold mb-2.5 text-text-primary">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 bg-surface-2 border border-border rounded-xl focus:ring-2 focus:ring-accent-primary focus:border-accent-primary outline-none transition-all text-text-primary placeholder-text-muted font-plex-sans"
                style={{
                  backgroundColor: 'rgba(30, 26, 43, 0.6)',
                }}
                placeholder="you@example.com"
                required
              />
            </motion.div>

            {/* Password Field */}
            <motion.div variants={fadeInUp}>
              <label htmlFor="password" className="block text-sm font-inter font-semibold mb-2.5 text-text-primary">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                className="w-full px-4 py-3 bg-surface-2 border border-border rounded-xl focus:ring-2 focus:ring-accent-primary focus:border-accent-primary outline-none transition-all text-text-primary placeholder-text-muted font-plex-sans"
                style={{
                  backgroundColor: 'rgba(30, 26, 43, 0.6)',
                }}
                placeholder="••••••••"
                required
              />
              {formData.password && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 flex items-center gap-2"
                >
                  <div className="flex-1 h-1.5 bg-surface-2 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(passwordStrength / 5) * 100}%` }}
                      style={{ backgroundColor: getStrengthColor() }}
                    />
                  </div>
                  <span className="text-xs font-inter font-semibold" style={{ color: getStrengthColor() }}>
                    {getStrengthLabel()}
                  </span>
                </motion.div>
              )}
            </motion.div>

            {/* Confirm Password Field */}
            <motion.div variants={fadeInUp}>
              <label htmlFor="confirmPassword" className="block text-sm font-inter font-semibold mb-2.5 text-text-primary">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 bg-surface-2 border border-border rounded-xl focus:ring-2 focus:ring-accent-primary focus:border-accent-primary outline-none transition-all text-text-primary placeholder-text-muted font-plex-sans"
                  style={{
                    backgroundColor: 'rgba(30, 26, 43, 0.6)',
                  }}
                  placeholder="••••••••"
                  required
                />
                {formData.confirmPassword && formData.password === formData.confirmPassword && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                  >
                    <CheckCircle className="w-5 h-5" style={{ color: '#10b981' }} />
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* Sign Up Button */}
            <motion.button
              variants={fadeInUp}
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3.5 bg-accent-primary hover:bg-accent-purple rounded-xl font-semibold text-bg-dark font-inter flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6"
              style={{
                boxShadow: loading ? 'none' : '0 0 20px rgba(167, 139, 250, 0.4)',
              }}
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create Account
                </>
              )}
            </motion.button>

            {/* Sign In Link */}
            <motion.p variants={fadeInUp} className="text-center text-text-secondary font-plex-sans">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-accent-primary hover:text-accent-purple font-semibold transition-colors">
                Sign in
              </Link>
            </motion.p>
          </form>
        </motion.div>

        {/* Trust Indicators */}
        <motion.div
          variants={fadeInUp}
          className="mt-8 flex items-center justify-center gap-6 text-sm text-text-secondary font-plex-sans"
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" style={{ color: '#10b981' }} />
            <span>Secure & Private</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" style={{ color: '#10b981' }} />
            <span>Quick Signup</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
