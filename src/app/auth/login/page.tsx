'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { LogIn, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, googleLogin } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      router.push('/dashboard');
    } else if (result.code === 'EMAIL_NOT_VERIFIED') {
      // Bounce the user to the verification page (the email is what they typed).
      if (typeof window !== 'undefined') {
        localStorage.setItem('pendingVerificationEmail', email);
      }
      router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`);
    } else {
      setError(result.error || 'Login failed. Please try again.');
    }

    setLoading(false);
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setError('');
    setLoading(true);
    
    try {
      const result = await googleLogin(credentialResponse.credential);
      if (result.success) {
        router.push('/dashboard');
      } else {
        setError(result.error || 'Google login failed. Please try again.');
      }
    } catch (err) {
      setError('An error occurred during Google login.');
    } finally {
      setLoading(false);
    }
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
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#07060A' }}>
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
            <LogIn className="w-8 h-8" style={{ color: '#A78BFA' }} />
          </motion.div>
          <h1 className="text-4xl font-outfit font-bold mb-2 text-text-primary">Welcome Back</h1>
          <p className="text-text-secondary font-plex-sans text-lg">Sign in to your MyScope account</p>
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

          <form onSubmit={handleSubmit} className="space-y-5">
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

            {/* Email Field */}
            <motion.div variants={fadeInUp}>
              <label htmlFor="email" className="block text-sm font-inter font-semibold mb-2.5 text-text-primary">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-surface-2 border border-border rounded-xl focus:ring-2 focus:ring-accent-primary focus:border-accent-primary outline-none transition-all text-text-primary placeholder-text-muted font-plex-sans"
                style={{
                  backgroundColor: 'rgba(30, 26, 43, 0.6)',
                }}
                placeholder="••••••••"
                required
              />
            </motion.div>

            {/* Sign In Button */}
            <motion.button
              variants={fadeInUp}
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3.5 bg-accent-primary hover:bg-accent-purple rounded-xl font-semibold text-bg-dark font-inter flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                boxShadow: loading ? 'none' : '0 0 20px rgba(167, 139, 250, 0.4)',
              }}
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In
                </>
              )}
            </motion.button>

            {/* Divider */}
            <motion.div variants={fadeInUp} className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 text-text-secondary font-plex-sans">Or continue with</span>
              </div>
            </motion.div>

            {/* Google Sign In Button */}
            <motion.div variants={fadeInUp}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => {
                  setError('Google login failed. Please try again.');
                }}
                size="large"
                width="100%"
              />
            </motion.div>

            {/* Sign Up Link */}
            <motion.p variants={fadeInUp} className="text-center text-text-secondary font-plex-sans">
              Don't have an account?{' '}
              <Link href="/auth/register" className="text-accent-primary hover:text-accent-purple font-semibold transition-colors">
                Sign up
              </Link>
            </motion.p>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
}
