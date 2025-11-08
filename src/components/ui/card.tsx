/**
 * Card Component
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
 * @props gradient - adds gradient border
 */

import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
  gradient?: boolean;
}

export function Card({ children, className = '', hoverable = false, gradient = false }: CardProps) {
  const baseStyles = 'bg-gray-800 rounded-xl border border-gray-700';
  const hoverStyles = hoverable ? 'hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20 transition-all duration-300 cursor-pointer' : '';
  const gradientStyles = gradient ? 'border-transparent bg-linear-to-r from-emerald-500/20 to-indigo-500/20 p-[1px]' : '';
  
  return (
    <div className={`${baseStyles} ${hoverStyles} ${gradientStyles} ${className}`}>
      {gradient ? (
        <div className="bg-gray-800 rounded-xl h-full">
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
    <div className={`px-6 py-4 border-b border-gray-700 ${className}`}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`px-6 py-4 ${className}`}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`px-6 py-4 border-t border-gray-700 ${className}`}>
      {children}
    </div>
  );
}
