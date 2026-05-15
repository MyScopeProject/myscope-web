// src/app/dashboard/layout.tsx
import React from 'react';
import DashboardSidebar from '../../components/dashboard/DashboardSidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen pt-16" style={{ backgroundColor: '#07060A' }}>
      <DashboardSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
