'use client';

/**
 * Button Component (Premium Design System)
 * 
 * @description Reusable button component with multiple variants and states
 * @usage
 * <Button variant="primary" size="md">Click Me</Button>
 * <Button variant="ghost" disabled>Disabled</Button>
 * 
 * @variants primary, secondary, ghost, outline
 * @sizes sm, md, lg
 */

import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  isLoading?: boolean;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  isLoading = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = 'font-inter font-medium rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-3 focus:outline-offset-2';
  
  const variants = {
    primary: {
      backgroundColor: '#A78BFA',
      color: '#07060A',
      boxShadow: '0 0 18px rgba(167, 139, 250, 0.45)',
      border: 'none',
      ':hover': {
        backgroundColor: '#C4B5FD',
      },
      ':active': {
        transform: 'scale(0.96)',
      },
    },
    secondary: {
      backgroundColor: 'transparent',
      color: '#A78BFA',
      border: '1px solid #A78BFA',
      ':hover': {
        backgroundColor: 'rgba(167, 139, 250, 0.08)',
        borderColor: '#C4B5FD',
        color: '#C4B5FD',
      },
    },
    ghost: {
      backgroundColor: 'transparent',
      color: '#9B95B5',
      border: 'none',
      ':hover': {
        backgroundColor: 'rgba(167, 139, 250, 0.08)',
        color: '#C4B5FD',
      },
    },
    outline: {
      backgroundColor: 'transparent',
      color: '#F5F3FA',
      border: '1px solid rgba(196, 181, 253, 0.12)',
      ':hover': {
        backgroundColor: 'rgba(167, 139, 250, 0.06)',
        borderColor: 'rgba(196, 181, 253, 0.28)',
      },
    },
  };

  const sizes = {
    sm: { padding: '8px 16px', fontSize: '12px', minHeight: '32px' },
    md: { padding: '12px 24px', fontSize: '14px', minHeight: '44px' },
    lg: { padding: '14px 32px', fontSize: '16px', minHeight: '52px' },
  };

  const selectedVariant = variants[variant];
  const selectedSize = sizes[size];

  const buttonStyle: React.CSSProperties = {
    ...selectedVariant,
    ...selectedSize,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
    outline: 'none',
  };

  return (
    <button
      style={buttonStyle}
      className={`${baseStyles} ${className}`}
      disabled={disabled || isLoading}
      onMouseEnter={(e) => {
        if (variant === 'primary' && !disabled) {
          e.currentTarget.style.backgroundColor = '#C4B5FD';
        } else if (variant === 'secondary' && !disabled) {
          e.currentTarget.style.backgroundColor = 'rgba(167, 139, 250, 0.08)';
          e.currentTarget.style.borderColor = '#C4B5FD';
          e.currentTarget.style.color = '#C4B5FD';
        } else if (variant === 'ghost' && !disabled) {
          e.currentTarget.style.backgroundColor = 'rgba(167, 139, 250, 0.08)';
          e.currentTarget.style.color = '#C4B5FD';
        } else if (variant === 'outline' && !disabled) {
          e.currentTarget.style.backgroundColor = 'rgba(167, 139, 250, 0.06)';
          e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.28)';
        }
      }}
      onMouseLeave={(e) => {
        if (variant === 'primary' && !disabled) {
          e.currentTarget.style.backgroundColor = '#A78BFA';
        } else if (variant === 'secondary' && !disabled) {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.borderColor = '#A78BFA';
          e.currentTarget.style.color = '#A78BFA';
        } else if (variant === 'ghost' && !disabled) {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = '#9B95B5';
        } else if (variant === 'outline' && !disabled) {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.12)';
        }
      }}
      {...props}
    >
      {isLoading ? (
        <>
          <div style={{
            width: '14px',
            height: '14px',
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 800ms linear infinite',
          }} />
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
