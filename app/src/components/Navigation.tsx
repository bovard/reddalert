import { Link, useLocation } from '@tanstack/react-router';
import { Inbox, MessageCircle, BarChart3, Settings, LogOut } from 'lucide-react';
import { logout, USE_EMULATORS } from '../lib/firebase';

export function Navigation() {
  const location = useLocation();

  const navItems = [
    { to: '/', icon: Inbox, label: 'Posts' },
    { to: '/history', icon: MessageCircle, label: 'Responses' },
    { to: '/stats', icon: BarChart3, label: 'Stats' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 px-4 py-2 safe-area-pb">
      {USE_EMULATORS && (
        <div className="absolute -top-6 left-0 right-0 bg-yellow-600 text-black text-xs text-center py-1">
          Development Mode - Using Emulators
        </div>
      )}
      <div className="max-w-lg mx-auto flex items-center justify-around">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'text-red-500'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => logout()}
          className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-gray-400 hover:text-gray-200 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-xs">Logout</span>
        </button>
      </div>
    </nav>
  );
}
