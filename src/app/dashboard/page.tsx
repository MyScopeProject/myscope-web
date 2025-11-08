'use client';

import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';

function DashboardContent() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="pt-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Welcome back, {user.name}! 👋</h1>
          <p className="text-gray-400">Email: {user.email}</p>
          <p className="text-gray-400 text-sm">Member since: {new Date(user.createdAt).toLocaleDateString()}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            { label: 'Songs Played', value: '1,234', icon: '🎵' },
            { label: 'Events Attended', value: '12', icon: '🎉' },
            { label: 'Shows Watched', value: '45', icon: '🎬' },
          ].map((stat) => (
            <div key={stat.label} className="p-6 bg-gray-800 rounded-xl border border-gray-700">
              <div className="text-3xl mb-2">{stat.icon}</div>
              <div className="text-3xl font-bold text-purple-400 mb-1">{stat.value}</div>
              <div className="text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-2xl font-bold mb-4">Recent Activity</h2>
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex items-center gap-3 pb-3 border-b border-gray-700 last:border-0">
                  <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
                    🎵
                  </div>
                  <div>
                    <p className="font-medium">Played "Song Title"</p>
                    <p className="text-sm text-gray-400">2 hours ago</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-2xl font-bold mb-4">Upcoming Events</h2>
            <div className="space-y-4">
              {[1, 2].map((item) => (
                <div key={item} className="p-4 bg-gray-900 rounded-lg border border-gray-700">
                  <h3 className="font-semibold mb-1">Concert Name</h3>
                  <p className="text-sm text-gray-400">Dec 15, 2025 • 7:00 PM</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
