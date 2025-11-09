'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';

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

    // Clear message after 3 seconds
    setTimeout(() => setMessage(null), 3000);
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <section>
      <h2 className="text-2xl font-bold mb-4">Edit Profile</h2>
      
      {message && (
        <div className={`mb-4 p-4 rounded ${message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <label className="block">
          <span className="block mb-2">Name:</span>
          <input
            className="w-full p-2 rounded bg-gray-800 border border-gray-700 focus:border-purple-500 focus:outline-none"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
        </label>
        <label className="block">
          <span className="block mb-2">Email:</span>
          <input
            className="w-full p-2 rounded bg-gray-800 border border-gray-700 focus:border-purple-500 focus:outline-none"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </label>
        <button 
          className="bg-emerald-500 px-4 py-2 rounded hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed" 
          type="submit"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
      </form>
    </section>
  );
}
