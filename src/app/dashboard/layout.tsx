// src/app/dashboard/layout.tsx
import React from 'react';
import DashboardSidebar from '../../components/dashboard/DashboardSidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-900 text-white pt-16">
      <DashboardSidebar />
      <main className="ml-60 p-6">
        {children}
      </main>
    </div>
  );
}
