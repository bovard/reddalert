import { Link, useLocation } from '@tanstack/react-router';
import { Inbox, MessageCircle, BarChart3, Settings, LogOut, Bell } from 'lucide-react';
import { logout, USE_EMULATORS } from '../lib/firebase';

interface NavigationProps {
  variant: 'bottom' | 'sidebar';
}

export function Navigation({ variant }: NavigationProps) {
  const location = useLocation();

  const navItems = [
    { to: '/', icon: Inbox, label: 'Posts' },
    { to: '/history', icon: MessageCircle, label: 'Responses' },
    { to: '/stats', icon: BarChart3, label: 'Stats' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  // Sidebar variant for desktop
  if (variant === 'sidebar') {
    return (
      <nav
        className="h-full flex flex-col"
        style={{ backgroundColor: 'var(--md-surface-container-low)' }}
      >
        {/* App branding */}
        <div className="p-6 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--md-primary-container)' }}
          >
            <Bell className="w-5 h-5" style={{ color: 'var(--md-on-primary-container)' }} />
          </div>
          <span className="text-xl font-semibold" style={{ color: 'var(--md-on-surface)' }}>
            Reddalert
          </span>
        </div>

        {USE_EMULATORS && (
          <div
            className="mx-4 mb-4 text-xs text-center py-2 rounded-lg font-medium"
            style={{ backgroundColor: 'var(--md-tertiary-container)', color: 'var(--md-on-tertiary-container)' }}
          >
            Development Mode
          </div>
        )}

        {/* Nav items */}
        <div className="flex-1 px-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className="relative flex items-center gap-3 px-4 py-3 rounded-full transition-all duration-200"
                style={{
                  backgroundColor: isActive ? 'var(--md-secondary-container)' : 'transparent',
                  color: isActive ? 'var(--md-on-secondary-container)' : 'var(--md-on-surface-variant, #D0C4C2)',
                }}
              >
                <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Logout button */}
        <div className="p-3 mt-auto">
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-full transition-all duration-200 md-state-layer"
            style={{ color: 'var(--md-on-surface-variant, #D0C4C2)' }}
          >
            <LogOut className="w-6 h-6" strokeWidth={2} />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </nav>
    );
  }

  // Bottom nav variant for mobile
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 px-2 pt-2 safe-area-pb md-elevation-3"
      style={{ backgroundColor: 'var(--md-surface-container)' }}
    >
      {USE_EMULATORS && (
        <div
          className="absolute -top-7 left-0 right-0 text-xs text-center py-1.5 font-medium"
          style={{ backgroundColor: 'var(--md-tertiary-container)', color: 'var(--md-on-tertiary-container)' }}
        >
          Development Mode
        </div>
      )}
      <div className="max-w-lg mx-auto flex items-center justify-around">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className="relative flex flex-col items-center gap-1 px-3 py-2 min-w-[64px] rounded-2xl transition-all duration-200"
              style={{
                color: isActive ? 'var(--md-primary)' : 'var(--md-on-surface-variant, #D0C4C2)',
              }}
            >
              {/* Active indicator pill */}
              {isActive && (
                <div
                  className="absolute top-1 left-1/2 -translate-x-1/2 w-16 h-8 rounded-full -z-10"
                  style={{ backgroundColor: 'var(--md-secondary-container)' }}
                />
              )}
              <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-xs font-medium ${isActive ? 'font-semibold' : ''}`}>
                {label}
              </span>
            </Link>
          );
        })}
        <button
          onClick={() => logout()}
          className="relative flex flex-col items-center gap-1 px-3 py-2 min-w-[64px] rounded-2xl transition-all duration-200 md-state-layer"
          style={{ color: 'var(--md-on-surface-variant, #D0C4C2)' }}
        >
          <LogOut className="w-6 h-6" strokeWidth={2} />
          <span className="text-xs font-medium">Logout</span>
        </button>
      </div>
    </nav>
  );
}
