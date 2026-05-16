'use client';

/**
 * Card Component (Premium Design System)
 * 
 * @description Container component with shadow, rounded corners, and sections
 * @usage
 * <Card>
 *   <CardHeader>Title Here</CardHeader>
 *   <CardBody>Content here</CardBody>
 *   <CardFooter>Footer content</CardFooter>
 * </Card>
 * 
 * @props hoverable - adds hover effect
 * @props gradient - adds gradient background
 */

import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
  gradient?: boolean;
}

export function Card({ children, className = '', hoverable = false, gradient = false }: CardProps) {
  const baseStyle: React.CSSProperties = {
    backgroundColor: '#15121D',
    border: '1px solid rgba(196, 181, 253, 0.1)',
    borderRadius: '16px',
    transition: 'all 300ms cubic-bezier(0.22, 1, 0.36, 1)',
    cursor: hoverable ? 'pointer' : 'default',
  };

  const hoverStyle = hoverable ? {
    ':hover': {
      backgroundColor: '#1E1A2B',
      borderColor: 'rgba(196, 181, 253, 0.28)',
      boxShadow: '0 24px 50px rgba(167, 139, 250, 0.35)',
      transform: 'translateY(-4px)',
    }
  } : {};

  return (
    <div
      className={className}
      style={baseStyle}
      onMouseEnter={(e) => {
        if (hoverable) {
          e.currentTarget.style.backgroundColor = '#1E1A2B';
          e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.28)';
          e.currentTarget.style.boxShadow = '0 24px 50px rgba(167, 139, 250, 0.35)';
          e.currentTarget.style.transform = 'translateY(-4px)';
        }
      }}
      onMouseLeave={(e) => {
        if (hoverable) {
          e.currentTarget.style.backgroundColor = '#15121D';
          e.currentTarget.style.borderColor = 'rgba(196, 181, 253, 0.1)';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
    >
      {gradient ? (
        <div style={{ backgroundColor: '#15121D', borderRadius: '16px', height: '100%' }}>
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
}

export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={className}
      style={{
        padding: '24px',
        borderBottom: '1px solid rgba(196, 181, 253, 0.1)',
      }}
    >
      {children}
    </div>
  );
}

export function CardBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={className}
      style={{
        padding: '24px',
      }}
    >
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={className}
      style={{
        padding: '24px',
        borderTop: '1px solid rgba(196, 181, 253, 0.1)',
      }}
    >
      {children}
    </div>
  );
}
