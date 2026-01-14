import type { ReactNode } from 'react';
import { Navigation } from './Navigation';

interface LayoutProps {
  children: ReactNode;
  title: string;
}

export function Layout({ children, title }: LayoutProps) {
  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--md-background)', color: 'var(--md-on-background)' }}>
      {/* Desktop sidebar navigation - hidden on mobile, flex item on desktop */}
      <aside className="hidden md:flex md:flex-shrink-0" style={{ width: '256px' }}>
        <div className="fixed inset-y-0 left-0 z-20" style={{ width: '256px' }}>
          <Navigation variant="sidebar" />
        </div>
      </aside>

      {/* Main content area - takes remaining width */}
      <div className="flex-1 min-w-0">
        {/* Material Design Top App Bar */}
        <header
          className="sticky top-0 z-10 md-elevation-2"
          style={{ backgroundColor: 'var(--md-surface-container)' }}
        >
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
            <h1
              className="text-[22px] font-medium tracking-tight"
              style={{ color: 'var(--md-primary)' }}
            >
              {title}
            </h1>
          </div>
        </header>

        {/* Page content */}
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-5 pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation - hidden on desktop */}
      <div className="md:hidden">
        <Navigation variant="bottom" />
      </div>
    </div>
  );
}
