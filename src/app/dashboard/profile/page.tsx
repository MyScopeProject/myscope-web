'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { motion } from 'framer-motion';
import { User, Mail, Check, AlertCircle } from 'lucide-react';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const result = await updateUser({ name, email });
    
    setLoading(false);
    
    if (result.success) {
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to update profile' });
    }

    setTimeout(() => setMessage(null), 3000);
  };

  if (!user) {
    return (
      <div className="p-6 md:p-8" style={{ backgroundColor: '#07060A', minHeight: '100vh' }}>
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{
            borderColor: 'rgba(183, 148, 246, 0.3)',
            borderTopColor: '#B794F6',
          }} />
          <p className="font-inter" style={{ color: '#9B95B5' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8" style={{ backgroundColor: '#07060A', minHeight: '100vh' }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <h1 className="text-4xl md:text-5xl font-outfit font-bold mb-2" style={{
          background: 'linear-gradient(110deg, #B794F6, #C4B5FD)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.04em',
        }}>
          Edit Profile
        </h1>
        <p className="text-lg font-inter" style={{ color: '#9B95B5' }}>Update your personal information</p>
      </motion.div>

      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-4 rounded-lg border font-inter flex items-center gap-3"
          style={{
            background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            borderColor: message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
            color: message.type === 'success' ? '#10B981' : '#EF4444',
          }}
        >
          {message.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
          <span>{message.text}</span>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-xl border p-8"
          style={{
            background: '#15121D',
            borderColor: 'rgba(196, 181, 253, 0.1)',
          }}
        >
          <div className="flex flex-col items-center text-center">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mb-6 text-3xl overflow-hidden"
              style={{ background: 'rgba(183, 148, 246, 0.15)' }}
            >
              {user.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                '👤'
              )}
            </div>
            <h2 className="text-2xl font-outfit font-bold mb-2" style={{ color: '#F5F3FA' }}>
              {user.name}
            </h2>
            <p className="font-inter text-sm" style={{ color: '#9B95B5' }}>
              {user.email}
            </p>
            {user.provider && (
              <div className="mt-3 px-3 py-1 rounded-full text-xs font-inter" style={{
                background: 'rgba(183, 148, 246, 0.1)',
                color: '#B794F6',
                textTransform: 'capitalize',
              }}>
                Connected via {user.provider}
              </div>
            )}
            <div className="mt-6 pt-6" style={{ borderTop: '1px solid rgba(196, 181, 253, 0.1)' }}>
              <p className="text-xs font-inter uppercase mb-4" style={{ color: '#7D8BA8' }}>Member since</p>
              <p className="font-outfit text-lg" style={{ color: '#B794F6' }}>
                {new Date(user.createdAt || '').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Edit Form */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 rounded-xl border p-8"
          style={{
            background: '#15121D',
            borderColor: 'rgba(196, 181, 253, 0.1)',
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field */}
            <div>
              <label className="block mb-3 font-inter font-semibold" style={{ color: '#F5F3FA' }}>
                <div className="flex items-center gap-2 mb-2">
                  <User size={18} style={{ color: '#B794F6' }} />
                  <span>Full Name</span>
                </div>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg outline-none font-inter transition-all"
                style={{
                  background: '#1E1A2B',
                  border: '1px solid rgba(196, 181, 253, 0.12)',
                  color: '#F5F3FA',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.28)';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(167, 139, 250, 0.2)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.12)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Email Field */}
            <div>
              <label className="block mb-3 font-inter font-semibold" style={{ color: '#F5F3FA' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Mail size={18} style={{ color: '#B794F6' }} />
                  <span>Email Address</span>
                </div>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg outline-none font-inter transition-all"
                style={{
                  background: '#1E1A2B',
                  border: '1px solid rgba(196, 181, 253, 0.12)',
                  color: '#F5F3FA',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.28)';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(167, 139, 250, 0.2)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.12)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 rounded-lg font-inter font-semibold transition-all duration-300 disabled:opacity-50"
                style={{
                  background: '#B794F6',
                  color: '#07060A',
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.background = '#C5A3FF';
                    e.currentTarget.style.boxShadow = '0 12px 40px rgba(183, 148, 246, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#B794F6';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {loading ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
