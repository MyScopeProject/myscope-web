'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, X, Search, Bell, User, Settings, LogOut, Home, Ticket, Film, ScanLine } from 'lucide-react';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const SCANNER_ROLES = new Set(['scanner', 'organizer', 'superadmin', 'moderator', 'event-manager']);

  const navLinks = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/events', label: 'Events', icon: Ticket },
    { href: '/movies', label: 'Movies', icon: Film },
    ...(user && SCANNER_ROLES.has(user.role)
      ? [{ href: '/scanner', label: 'Scanner', icon: ScanLine }]
      : []),
  ];

  // Determine active link
  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
    router.push('/');
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Scroll effect for elevated state
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <nav
      ref={navRef}
      className="fixed top-0 w-full z-50"
      style={{
        background: 'rgba(21, 18, 29, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(196, 181, 253, 0.1)',
        boxShadow: '0 8px 24px rgba(167, 139, 250, 0.08)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-3 font-bold text-lg md:text-xl hover:opacity-80 transition-opacity duration-300"
          >
            <span className="text-2xl md:text-3xl">🎭</span>
            <span className="font-outfit font-bold hidden sm:inline" style={{ color: '#F5F3FA' }}>
              MyScope
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-inter font-medium text-sm transition-colors duration-300"
                style={{
                  color: '#9B95B5',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#C4B5FD')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#9B95B5')}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Search Bar (Desktop) */}
          <div className="hidden md:flex items-center flex-1 max-w-xs mx-4">
            <div
              className="w-full relative flex items-center gap-3"
              style={{
                background: '#1E1A2B',
                border: `1px solid ${searchFocused ? 'rgba(196, 181, 253, 0.28)' : 'rgba(196, 181, 253, 0.12)'}`,
                borderRadius: '12px',
                padding: '0 16px',
                transition: 'all 200ms ease',
              }}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              tabIndex={-1}
            >
              <Search size={18} style={{ color: '#9B95B5', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={handleSearch}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                className="w-full bg-transparent text-text border-none outline-none placeholder-text-muted font-inter text-sm"
                style={{
                  color: '#F5F3FA',
                  padding: '12px 0',
                }}
              />
            </div>
          </div>

          {/* Desktop Auth/Icons */}
          <div className="hidden md:flex items-center gap-4">
            <button
              className="p-2 hover:bg-surface-2 rounded-full transition-all duration-300"
              style={{ color: '#F5F3FA' }}
              aria-label="Notifications"
            >
              <Bell size={20} />
            </button>

            {user ? (
              <>
                <button
                  className="p-2 hover:bg-surface-2 rounded-full transition-all duration-300"
                  style={{ color: '#F5F3FA' }}
                  aria-label="Settings"
                >
                  <Settings size={20} />
                </button>
                <Link
                  href="/dashboard"
                  className="p-2 hover:bg-surface-2 rounded-full transition-all duration-300"
                  style={{ color: '#F5F3FA' }}
                  aria-label="Dashboard"
                >
                  <User size={20} />
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-5 py-2 rounded-full font-inter font-medium text-sm transition-all duration-300"
                  style={{
                    background: '#1E1A2B',
                    border: '1px solid rgba(196, 181, 253, 0.12)',
                    color: '#F5F3FA',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.28)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.12)';
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="px-5 py-2 transition-colors duration-300 font-inter font-medium text-sm"
                  style={{ color: '#A78BFA' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#C4B5FD')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#A78BFA')}
                >
                  Login
                </Link>
                <Link
                  href="/auth/register"
                  className="px-6 py-2 rounded-full font-inter font-medium text-sm transition-all duration-300"
                  style={{
                    background: '#A78BFA',
                    color: '#07060A',
                    boxShadow: '0 0 18px rgba(167, 139, 250, 0.45)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#C4B5FD';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#A78BFA';
                  }}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg transition-colors duration-300"
            style={{ color: '#9B95B5' }}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div
            className="md:hidden py-4 space-y-2"
            style={{
              background: '#1E1A2B',
              borderTop: '1px solid rgba(196, 181, 253, 0.1)',
              animation: 'slideDown 300ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            {/* Mobile Search */}
            <div className="px-4 mb-4">
              <div
                className="w-full flex items-center gap-2"
                style={{
                  background: '#15121D',
                  border: '1px solid rgba(196, 181, 253, 0.12)',
                  borderRadius: '12px',
                  padding: '0 12px',
                }}
              >
                <Search size={16} style={{ color: '#9B95B5' }} />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full bg-transparent text-text border-none outline-none placeholder-text-muted font-inter text-sm"
                  style={{
                    color: '#F5F3FA',
                    padding: '10px 0',
                  }}
                />
              </div>
            </div>

            {/* Mobile Nav Links */}
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-4 py-3 font-inter font-medium text-sm rounded-lg transition-all duration-300"
                style={{
                  color: '#9B95B5',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#C4B5FD';
                  e.currentTarget.style.background = 'rgba(167, 139, 250, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#9B95B5';
                  e.currentTarget.style.background = 'transparent';
                }}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}

            {/* Mobile Auth */}
            <div className="px-4 py-3 border-t space-y-3" style={{ borderColor: 'rgba(196, 181, 253, 0.1)' }}>
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="block font-inter font-medium text-sm transition-colors duration-300"
                    style={{ color: '#A78BFA' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#C4B5FD')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#A78BFA')}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 rounded-full font-inter font-medium text-sm transition-all duration-300"
                    style={{
                      background: '#1E1A2B',
                      border: '1px solid rgba(196, 181, 253, 0.12)',
                      color: '#F5F3FA',
                    }}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="block font-inter font-medium text-sm transition-colors duration-300"
                    style={{ color: '#A78BFA' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#C4B5FD')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#A78BFA')}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    href="/auth/register"
                    className="block w-full text-center px-4 py-2 rounded-full font-inter font-medium text-sm transition-all duration-300"
                    style={{
                      background: '#A78BFA',
                      color: '#07060A',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#C4B5FD')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#A78BFA')}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
