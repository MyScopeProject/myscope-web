/**
 * Badge Component
 * 
 * @description Colored badges for status, categories, and tags
 * @usage
 * <Badge variant="success">Active</Badge>
 * <Badge variant="warning" size="sm">Pending</Badge>
 * 
 * @variants success, warning, danger, info, primary, secondary
 * @sizes sm, md, lg
 */

import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'secondary';
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
  const baseStyles = 'inline-flex items-center justify-center font-semibold transition-colors';
  
  const variants = {
    success: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    danger: 'bg-red-500/20 text-red-400 border border-red-500/30',
    info: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    primary: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    secondary: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  const roundedStyles = rounded ? 'rounded-full' : 'rounded-md';

  return (
    <span className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${roundedStyles} ${className}`}>
      {children}
    </span>
  );
}
