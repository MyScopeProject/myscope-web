'use client';

/**
 * Badge Component (Premium Design System)
 * 
 * @description Colored badges for status, categories, and tags
 * @usage
 * <Badge variant="success">Active</Badge>
 * <Badge variant="ai">AI Feature</Badge>
 * 
 * @variants success, warning, danger, info, primary, ai
 * @sizes sm, md, lg
 */

import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'ai';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  rounded?: boolean;
}

export default function Badge({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  rounded = false,
}: BadgeProps) {
  const variants = {
    success: {
      backgroundColor: 'rgba(16, 185, 129, 0.12)',
      color: '#10b981',
      border: '1px solid rgba(16, 185, 129, 0.3)',
    },
    warning: {
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
      color: '#f59e0b',
      border: '1px solid rgba(245, 158, 11, 0.3)',
    },
    danger: {
      backgroundColor: 'rgba(239, 68, 68, 0.12)',
      color: '#ef4444',
      border: '1px solid rgba(239, 68, 68, 0.3)',
    },
    info: {
      backgroundColor: 'rgba(59, 130, 246, 0.12)',
      color: '#3b82f6',
      border: '1px solid rgba(59, 130, 246, 0.3)',
    },
    primary: {
      backgroundColor: 'rgba(167, 139, 250, 0.12)',
      color: '#A78BFA',
      border: '1px solid rgba(167, 139, 250, 0.35)',
    },
    ai: {
      backgroundColor: 'rgba(196, 181, 253, 0.12)',
      color: '#C4B5FD',
      border: '1px solid rgba(196, 181, 253, 0.35)',
    },
  };

  const sizes = {
    sm: { padding: '6px 12px', fontSize: '10px' },
    md: { padding: '8px 16px', fontSize: '12px' },
    lg: { padding: '10px 20px', fontSize: '14px' },
  };

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '500',
    fontFamily: '"Inter", sans-serif',
    transition: 'all 300ms ease',
    borderRadius: rounded ? '999px' : '8px',
    textTransform: variant === 'ai' ? 'uppercase' : 'none',
    letterSpacing: variant === 'ai' ? '0.05em' : 'normal',
    ...variants[variant],
    ...sizes[size],
  };

  return (
    <span style={baseStyle} className={className}>
      {children}
    </span>
  );
}
