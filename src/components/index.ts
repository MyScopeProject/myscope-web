/**
 * MyScope Components Index
 * 
 * @description Central export file for all components across the application
 * @usage import { Button, Navbar, Footer } from '@/components';
 */

// Legacy custom UI primitives (kept during the shadcn migration).
// New code should import individual shadcn components from '@/components/ui/<name>'.
export * from './ui-legacy';

// ====== Layout Components ======
export { default as Navbar } from './navbar/Navbar';
export { default as Footer } from './footer/Footer';
