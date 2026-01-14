import type { ReactNode } from 'react';
import { Navigation } from './Navigation';

interface LayoutProps {
  children: ReactNode;
  title: string;
}

export function Layout({ children, title }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="sticky top-0 bg-gray-900 border-b border-gray-800 px-4 py-4 z-10">
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl font-bold text-red-500">{title}</h1>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-4 pb-24">
        {children}
      </main>
      <Navigation />
    </div>
  );
}
