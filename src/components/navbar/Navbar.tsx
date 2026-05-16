'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, X, Search, Bell, User, Settings, LogOut, Home, Ticket, Film, ScanLine, ChevronDown, CalendarDays, Banknote, Briefcase, ClipboardList } from 'lucide-react';

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
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setUserMenuOpen(o => !o); }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300"
                  style={{
                    background: '#1E1A2B',
                    border: '1px solid rgba(196, 181, 253, 0.12)',
                    color: '#F5F3FA',
                  }}
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: 'linear-gradient(135deg, #A78BFA 0%, #FF7AC6 100%)', color: '#0a0712' }}
                  >
                    {(user.name?.[0] || 'U').toUpperCase()}
                  </div>
                  <span className="hidden lg:inline text-sm font-inter">{user.name?.split(' ')[0] || 'Account'}</span>
                  <ChevronDown size={14} />
                </button>

                {userMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-60 rounded-xl border shadow-2xl overflow-hidden z-50"
                    style={{ background: '#15121D', borderColor: 'rgba(196, 181, 253, 0.15)' }}
                  >
                    <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(196,181,253,0.08)' }}>
                      <div className="text-sm font-semibold" style={{ color: '#F5F3FA' }}>{user.name}</div>
                      <div className="text-xs truncate" style={{ color: '#9B95B5' }}>{user.email}</div>
                      <div className="mt-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ background: 'rgba(167,139,250,0.15)', color: '#A78BFA' }}>
                        {user.role}
                      </div>
                    </div>

                    <MenuLink href="/dashboard" icon={<User size={16} />} onClick={() => setUserMenuOpen(false)}>Dashboard</MenuLink>
                    <MenuLink href="/bookings" icon={<Ticket size={16} />} onClick={() => setUserMenuOpen(false)}>My Bookings</MenuLink>

                    {/* Organizer section — only visible to organizer/superadmin */}
                    {(user.role === 'organizer' || user.role === 'superadmin') && (
                      <>
                        <MenuDivider label="Organizer" />
                        <MenuLink href="/organizer" icon={<Briefcase size={16} />} onClick={() => setUserMenuOpen(false)}>Dashboard</MenuLink>
                        <MenuLink href="/organizer/events" icon={<CalendarDays size={16} />} onClick={() => setUserMenuOpen(false)}>My Events</MenuLink>
                        <MenuLink href="/organizer/events/create" icon={<ClipboardList size={16} />} onClick={() => setUserMenuOpen(false)}>Create Event</MenuLink>
                        <MenuLink href="/organizer/payouts" icon={<Banknote size={16} />} onClick={() => setUserMenuOpen(false)}>Payouts</MenuLink>
                      </>
                    )}

                    {/* Non-organizers get a "Become an organizer" CTA */}
                    {user.role === 'user' && (
                      <MenuLink href="/become-organizer" icon={<Briefcase size={16} />} onClick={() => setUserMenuOpen(false)}>
                        Become an organizer
                      </MenuLink>
                    )}

                    <MenuDivider />
                    <MenuLink href="/dashboard/profile" icon={<Settings size={16} />} onClick={() => setUserMenuOpen(false)}>Settings</MenuLink>
                    <button
                      type="button"
                      onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-white/5 transition-colors text-left"
                      style={{ color: '#FCA5A5' }}
                    >
                      <LogOut size={16} />
                      Logout
                    </button>
                  </div>
                )}
              </div>
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
            type="button"
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
                    className="block font-inter font-medium text-sm"
                    style={{ color: '#A78BFA' }}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/bookings"
                    className="block font-inter font-medium text-sm"
                    style={{ color: '#A78BFA' }}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    My Bookings
                  </Link>
                  {(user.role === 'organizer' || user.role === 'superadmin') && (
                    <>
                      <Link
                        href="/organizer/events"
                        className="block font-inter font-medium text-sm"
                        style={{ color: '#A78BFA' }}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        My Events
                      </Link>
                      <Link
                        href="/organizer/payouts"
                        className="block font-inter font-medium text-sm"
                        style={{ color: '#A78BFA' }}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Payouts
                      </Link>
                    </>
                  )}
                  {user.role === 'user' && (
                    <Link
                      href="/become-organizer"
                      className="block font-inter font-medium text-sm"
                      style={{ color: '#A78BFA' }}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Become an organizer
                    </Link>
                  )}
                  <button
                    type="button"
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

// ---------------------------------------------------------------------------
// Dropdown helpers
// ---------------------------------------------------------------------------

function MenuLink({
  href, icon, children, onClick,
}: { href: string; icon: React.ReactNode; children: React.ReactNode; onClick?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-white/5 transition-colors"
      style={{ color: '#F5F3FA' }}
      role="menuitem"
    >
      {icon}
      {children}
    </Link>
  );
}

function MenuDivider({ label }: { label?: string }) {
  return label ? (
    <div className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-wide" style={{ color: '#6B7280' }}>
      {label}
    </div>
  ) : (
    <div className="my-1 border-t" style={{ borderColor: 'rgba(196,181,253,0.08)' }} />
  );
}
