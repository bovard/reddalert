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
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <BellOff className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-gray-400">
              Notifications are blocked. To enable them, update your browser settings for this site.
            </p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-gray-500 hover:text-gray-300"
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
    <div className="bg-gray-800 border border-red-600/30 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <Bell className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-white font-medium mb-1">
            Enable push notifications?
          </p>
          <p className="text-sm text-gray-400 mb-3">
            Get notified when new posts match your notification filters.
          </p>
          <div className="flex gap-2">
            <button
              onClick={requestPermission}
              disabled={loading}
              className="bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Enabling...' : 'Enable'}
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="text-gray-400 text-sm px-4 py-2 rounded-lg hover:text-white transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
