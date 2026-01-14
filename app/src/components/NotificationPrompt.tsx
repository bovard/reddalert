import { Bell, BellOff, X } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { useState } from 'react';

interface NotificationPromptProps {
  userId: string | undefined;
}

export function NotificationPrompt({ userId }: NotificationPromptProps) {
  const { status, loading, requestPermission, canRequest, isSupported } = useNotifications(userId);
  const [dismissed, setDismissed] = useState(false);

  // Don't show if not supported, already granted, or dismissed
  if (!isSupported || status === 'granted' || dismissed) {
    return null;
  }

  if (status === 'denied') {
    return (
      <div
        className="rounded-2xl p-4 mb-4 md-elevation-1"
        style={{ backgroundColor: 'var(--md-surface-container-high)' }}
      >
        <div className="flex items-start gap-3">
          <BellOff className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--md-outline)' }} />
          <div className="flex-1">
            <p className="text-sm" style={{ color: 'var(--md-on-surface-variant, #D0C4C2)' }}>
              Notifications are blocked. To enable them, update your browser settings for this site.
            </p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="rounded-full p-1 transition-colors md-state-layer"
            style={{ color: 'var(--md-on-surface-variant, #D0C4C2)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (!canRequest) {
    return null;
  }

  return (
    <div
      className="rounded-2xl p-4 mb-4 md-elevation-1"
      style={{
        backgroundColor: 'var(--md-surface-container-high)',
        border: '1px solid var(--md-primary-container)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'var(--md-primary-container)' }}
        >
          <Bell className="w-5 h-5" style={{ color: 'var(--md-on-primary-container)' }} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--md-on-surface)' }}>
            Enable push notifications?
          </p>
          <p className="text-sm mb-3" style={{ color: 'var(--md-on-surface-variant, #D0C4C2)' }}>
            Get notified when new posts match your notification filters.
          </p>
          <div className="flex gap-2">
            <button
              onClick={requestPermission}
              disabled={loading}
              className="text-sm font-medium px-5 py-2 rounded-full transition-all disabled:opacity-50"
              style={{
                backgroundColor: 'var(--md-primary)',
                color: 'var(--md-on-primary)',
              }}
            >
              {loading ? 'Enabling...' : 'Enable'}
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="text-sm font-medium px-4 py-2 rounded-full transition-colors"
              style={{ color: 'var(--md-on-surface-variant, #D0C4C2)' }}
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
