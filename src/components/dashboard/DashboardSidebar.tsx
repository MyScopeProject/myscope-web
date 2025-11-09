// src/components/dashboard/DashboardSidebar.tsx
import Link from 'next/link';
import React from 'react';

const DashboardSidebar = () => {
  return (
    <nav className="w-60 bg-gray-800 p-4 space-y-4 fixed h-screen pt-20">
      <h2 className="text-xl font-bold mb-6">MyScope Dashboard</h2>
      <ul className="space-y-2">
        <li><Link href="/dashboard" className="block py-2 px-3 rounded hover:bg-gray-700 transition-colors">Overview</Link></li>
        <li><Link href="/dashboard/profile" className="block py-2 px-3 rounded hover:bg-gray-700 transition-colors">Profile</Link></li>
        <li><Link href="/dashboard/events" className="block py-2 px-3 rounded hover:bg-gray-700 transition-colors">My Events</Link></li>
        <li><Link href="/dashboard/music" className="block py-2 px-3 rounded hover:bg-gray-700 transition-colors">My Music</Link></li>
        <li><Link href="/dashboard/analytics" className="block py-2 px-3 rounded hover:bg-gray-700 transition-colors">Analytics</Link></li>
        <li><Link href="/dashboard/settings" className="block py-2 px-3 rounded hover:bg-gray-700 transition-colors">Settings</Link></li>
      </ul>
    </nav>
  );
};

export default DashboardSidebar;
