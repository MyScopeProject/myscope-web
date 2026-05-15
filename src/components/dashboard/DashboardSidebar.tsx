'use client';

import Link from 'next/link';
import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X, LayoutDashboard, User, Calendar, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

const DashboardSidebar = () => {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/profile', label: 'Profile', icon: User },
    { href: '/dashboard/events', label: 'My Events', icon: Calendar },
    
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed bottom-6 right-6 z-50 p-3 rounded-full transition-all duration-300"
        style={{
          background: '#B794F6',
          color: '#07060A',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#C5A3FF';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#B794F6';
        }}
      >
        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar - Desktop (Static) */}
      <nav
        className="hidden md:flex md:flex-col w-64 h-[calc(100vh-64px)] shrink-0 overflow-y-auto"
        style={{
          background: '#15121D',
          borderRight: '1px solid rgba(196, 181, 253, 0.1)',
        }}
      >
      <div className="p-6 space-y-8">
          {/* Logo Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-outfit font-bold mb-1" style={{ color: '#F5F3FA' }}>Dashboard</h2>
            <p className="text-sm font-inter" style={{ color: '#9B95B5' }}>Manage your account</p>
          </div>

          {/* Navigation Items */}
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg font-inter font-medium transition-all duration-300"
                    style={{
                      background: active ? 'rgba(183, 148, 246, 0.15)' : 'transparent',
                      color: active ? '#B794F6' : '#9B95B5',
                      borderLeft: active ? '3px solid #B794F6' : '3px solid transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = 'rgba(167, 139, 250, 0.08)';
                        e.currentTarget.style.color = '#C4B5FD';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#9B95B5';
                      }
                    }}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Sidebar - Mobile (Animated) */}
      <motion.nav
        initial={{ x: '-100%' }}
        animate={{ x: mobileOpen ? 0 : '-100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="md:hidden fixed left-0 top-16 w-64 h-[calc(100vh-64px)] z-40 overflow-y-auto"
        style={{
          background: '#15121D',
          borderRight: '1px solid rgba(196, 181, 253, 0.1)',
        }}
      >
        <div className="p-6 space-y-8">
          {/* Logo Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-outfit font-bold mb-1" style={{ color: '#F5F3FA' }}>Dashboard</h2>
            <p className="text-sm font-inter" style={{ color: '#9B95B5' }}>Manage your account</p>
          </div>

          {/* Navigation Items */}
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg font-inter font-medium transition-all duration-300"
                    style={{
                      background: active ? 'rgba(183, 148, 246, 0.15)' : 'transparent',
                      color: active ? '#B794F6' : '#9B95B5',
                      borderLeft: active ? '3px solid #B794F6' : '3px solid transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = 'rgba(167, 139, 250, 0.08)';
                        e.currentTarget.style.color = '#C4B5FD';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#9B95B5';
                      }
                    }}
                    onClick={() => setMobileOpen(false)}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </motion.nav>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
};

export default DashboardSidebar;
