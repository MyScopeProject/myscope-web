/**
 * Typography Components
 * 
 * @description Consistent text components with brand styling
 * @usage
 * <Heading level={1}>Main Title</Heading>
 * <Paragraph>Body text here</Paragraph>
 * <TextLink href="/path">Link text</TextLink>
 */

import { ReactNode, AnchorHTMLAttributes } from 'react';
import Link from 'next/link';

// Heading Component
interface HeadingProps {
  level: 1 | 2 | 3 | 4;
  children: ReactNode;
  className?: string;
  gradient?: boolean;
}

export function Heading({ level, children, className = '', gradient = false }: HeadingProps) {
  const baseStyles = "font-['Poppins',sans-serif] font-bold";
  const gradientStyles = gradient ? 'bg-linear-to-r from-emerald-400 to-indigo-400 bg-clip-text text-transparent' : 'text-gray-100';
  
  const sizes = {
    1: 'text-5xl md:text-7xl',
    2: 'text-4xl md:text-5xl',
    3: 'text-3xl md:text-4xl',
    4: 'text-2xl md:text-3xl',
  };

  const combinedClassName = `${baseStyles} ${sizes[level]} ${gradientStyles} ${className}`;

  if (level === 1) return <h1 className={combinedClassName}>{children}</h1>;
  if (level === 2) return <h2 className={combinedClassName}>{children}</h2>;
  if (level === 3) return <h3 className={combinedClassName}>{children}</h3>;
  return <h4 className={combinedClassName}>{children}</h4>;
}

// Paragraph Component
interface ParagraphProps {
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  muted?: boolean;
}

export function Paragraph({ children, className = '', size = 'md', muted = false }: ParagraphProps) {
  const baseStyles = "font-['Inter',sans-serif]";
  const colorStyles = muted ? 'text-gray-400' : 'text-gray-200';
  
  const sizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg md:text-xl',
  };

  return (
    <p className={`${baseStyles} ${sizes[size]} ${colorStyles} ${className}`}>
      {children}
    </p>
  );
}

// Link Component
interface TextLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: ReactNode;
  className?: string;
  external?: boolean;
}

export function TextLink({ href, children, className = '', external = false, ...props }: TextLinkProps) {
  const baseStyles = "text-emerald-400 hover:text-emerald-300 transition-colors duration-200 font-medium underline decoration-emerald-500/30 hover:decoration-emerald-400";

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${baseStyles} ${className}`}
        {...props}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={`${baseStyles} ${className}`} {...props}>
      {children}
    </Link>
  );
}

// Small Text Component
export function SmallText({ children, className = '', muted = true }: { children: ReactNode; className?: string; muted?: boolean }) {
  return (
    <span className={`text-xs ${muted ? 'text-gray-500' : 'text-gray-300'} ${className}`}>
      {children}
    </span>
  );
}
