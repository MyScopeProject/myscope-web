'use client';

/**
 * Footer Component (Premium Design System)
 * 
 * @description Consistent footer with brand colors, links, and social icons
 */

import Link from 'next/link';
import { Instagram, Youtube, Music, Mail } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    about: [
      { label: 'About Us', href: '/about' },
      { label: 'Careers', href: '/careers' },
      { label: 'Press', href: '/press' },
      { label: 'Blog', href: '/blog' },
    ],
    features: [
      { label: 'Events', href: '/events' },
      { label: 'Movies', href: '/movies' },
    ],
    support: [
      { label: 'Help Center', href: '/help' },
      { label: 'Contact Us', href: '/contact' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
    ],
  };

  const socialLinks = [
    { icon: Instagram, href: 'https://instagram.com', label: 'Instagram' },
    { icon: Youtube, href: 'https://youtube.com', label: 'YouTube' },
    { icon: Music, href: '#', label: 'TikTok' },
    { icon: Mail, href: 'mailto:hello@myscope.com', label: 'Email' },
  ];

  return (
    <footer style={{
      backgroundColor: '#15121D',
      borderTop: '1px solid rgba(196, 181, 253, 0.1)',
    }}>
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2 mb-4 group">
              <span className="text-3xl">🎭</span>
              <span className="text-2xl font-outfit font-bold transition-colors" style={{ color: '#F5F3FA' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#A78BFA')} onMouseLeave={(e) => (e.currentTarget.style.color = '#F5F3FA')}>
                MyScope
              </span>
            </Link>
            <p className="mb-6 max-w-sm leading-relaxed font-inter text-sm" style={{ color: '#9B95B5' }}>
              Your world of entertainment and events. 
              The next-generation multimedia social platform.
            </p>
            
            {/* Social Icons */}
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-all duration-300"
                  style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: '#1E1A2B',
                    border: '1px solid rgba(196, 181, 253, 0.1)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#9B95B5',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#A78BFA';
                    e.currentTarget.style.borderColor = '#A78BFA';
                    e.currentTarget.style.color = '#07060A';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#1E1A2B';
                    e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.1)';
                    e.currentTarget.style.color = '#9B95B5';
                  }}
                  aria-label={social.label}
                >
                  <social.icon size={20} />
                </a>
              ))}
            </div>
          </div>

          {/* About Column */}
          <div>
            <h3 className="font-semibold mb-4 font-inter text-sm uppercase tracking-widest" style={{ color: '#F5F3FA' }}>
              About
            </h3>
            <ul className="space-y-3">
              {footerLinks.about.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href} 
                    className="transition-colors duration-300 text-sm font-inter"
                    style={{ color: '#9B95B5' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#A78BFA')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#9B95B5')}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Features Column */}
          <div>
            <h3 className="font-semibold mb-4 font-inter text-sm uppercase tracking-widest" style={{ color: '#F5F3FA' }}>
              Features
            </h3>
            <ul className="space-y-3">
              {footerLinks.features.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href} 
                    className="transition-colors duration-300 text-sm font-inter"
                    style={{ color: '#9B95B5' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#A78BFA')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#9B95B5')}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Column */}
          <div>
            <h3 className="font-semibold mb-4 font-inter text-sm uppercase tracking-widest" style={{ color: '#F5F3FA' }}>
              Support
            </h3>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href} 
                    className="transition-colors duration-300 text-sm font-inter"
                    style={{ color: '#9B95B5' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#A78BFA')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#9B95B5')}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4" style={{
          borderTop: '1px solid rgba(196, 181, 253, 0.1)',
        }}>
          <p className="text-sm font-inter" style={{ color: '#9B95B5' }}>
            &copy; {currentYear} MyScope. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm font-inter" style={{ color: '#9B95B5' }}>
            <Link href="/privacy" className="transition-colors duration-300" style={{ color: '#9B95B5' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#A78BFA')} onMouseLeave={(e) => (e.currentTarget.style.color = '#9B95B5')}>
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors duration-300" style={{ color: '#9B95B5' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#A78BFA')} onMouseLeave={(e) => (e.currentTarget.style.color = '#9B95B5')}>
              Terms
            </Link>
            <Link href="/cookies" className="transition-colors duration-300" style={{ color: '#9B95B5' }} onMouseEnter={(e) => (e.currentTarget.style.color = '#A78BFA')} onMouseLeave={(e) => (e.currentTarget.style.color = '#9B95B5')}>
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
