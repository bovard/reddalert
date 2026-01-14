import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useSubscriptions, useUpdateSubscriptions } from '../hooks/useSubscriptions';
import { useAuth } from '../hooks/useAuth';
import { SUBREDDITS } from '../types';
import type { FilterType, Subscription } from '../types';
import { Loader2, Bell, Eye, Download, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All posts' },
  { value: 'catan', label: 'Catan mentions' },
  { value: 'twosheep', label: 'TwoSheep mentions' },
  { value: 'custom', label: 'Custom' },
  { value: 'none', label: 'None' },
];

interface SubredditRowProps {
  subscription: Subscription;
  onUpdate: (updated: Subscription) => void;
}

function SubredditRow({ subscription, onUpdate }: SubredditRowProps) {
  return (
    <div
      className="rounded-2xl p-4 sm:p-5 md-elevation-1"
      style={{ backgroundColor: 'var(--md-surface-container-high)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="font-medium text-base" style={{ color: 'var(--md-on-surface)' }}>
          r/{subscription.subreddit}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            className="flex items-center gap-2 text-sm mb-2"
            style={{ color: 'var(--md-on-surface-variant, #D0C4C2)' }}
          >
            <Eye className="w-4 h-4" />
            Show in feed
          </label>
          <select
            value={subscription.showFilter}
            onChange={(e) => onUpdate({ ...subscription, showFilter: e.target.value as FilterType })}
            className="w-full rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none"
            style={{
              backgroundColor: 'var(--md-surface-container-highest)',
              color: 'var(--md-on-surface)',
              border: '1px solid var(--md-outline-variant)',
            }}
          >
            {FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            className="flex items-center gap-2 text-sm mb-2"
            style={{ color: 'var(--md-on-surface-variant, #D0C4C2)' }}
          >
            <Bell className="w-4 h-4" />
            Notifications
          </label>
          <select
            value={subscription.notifyFilter}
            onChange={(e) => onUpdate({ ...subscription, notifyFilter: e.target.value as FilterType })}
            className="w-full rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none"
            style={{
              backgroundColor: 'var(--md-surface-container-highest)',
              color: 'var(--md-on-surface)',
              border: '1px solid var(--md-outline-variant)',
            }}
          >
            {FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function InstallSection() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for install prompt (Android/Desktop Chrome)
    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div
        className="rounded-2xl p-4 sm:p-5 md-elevation-1 mb-8"
        style={{ backgroundColor: 'var(--md-surface-container-high)' }}
      >
        <div className="flex items-center gap-3">
          <Smartphone className="w-5 h-5" style={{ color: 'var(--md-primary)' }} />
          <span style={{ color: 'var(--md-on-surface)' }}>App installed</span>
        </div>
      </div>
    );
  }

  return (
    <section className="mb-8">
      <h2
        className="text-base sm:text-lg font-medium mb-4"
        style={{ color: 'var(--md-primary)' }}
      >
        Install App
      </h2>
      <div
        className="rounded-2xl p-4 sm:p-5 md-elevation-1"
        style={{ backgroundColor: 'var(--md-surface-container-high)' }}
      >
        {deferredPrompt ? (
          <button
            onClick={handleInstall}
            className="flex items-center gap-3 w-full text-left"
          >
            <Download className="w-5 h-5" style={{ color: 'var(--md-primary)' }} />
            <span style={{ color: 'var(--md-on-surface)' }}>Install Reddalert</span>
          </button>
        ) : isIOS ? (
          <div>
            <p className="text-sm mb-3" style={{ color: 'var(--md-on-surface)' }}>
              To install on iOS:
            </p>
            <ol className="text-sm space-y-2" style={{ color: 'var(--md-on-surface-variant)' }}>
              <li>1. Tap the Share button <span className="inline-block px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--md-surface-container-highest)' }}>&#x2B07;&#xFE0F;</span></li>
              <li>2. Scroll down and tap "Add to Home Screen"</li>
              <li>3. Tap "Add" in the top right</li>
            </ol>
          </div>
        ) : (
          <div>
            <p className="text-sm mb-3" style={{ color: 'var(--md-on-surface)' }}>
              To install on Android:
            </p>
            <ol className="text-sm space-y-2" style={{ color: 'var(--md-on-surface-variant)' }}>
              <li>1. Tap the menu button (three dots)</li>
              <li>2. Tap "Add to Home Screen" or "Install app"</li>
            </ol>
          </div>
        )}
      </div>
    </section>
  );
}

export function SettingsPage() {
  const { user } = useAuth();
  const { subscriptions, loading } = useSubscriptions(user?.uid);
  const updateSubscriptions = useUpdateSubscriptions(user?.uid);

  const handleUpdate = (updated: Subscription) => {
    const newSubscriptions = subscriptions.map((sub) =>
      sub.subreddit === updated.subreddit ? updated : sub
    );
    updateSubscriptions.mutate(newSubscriptions);
  };

  if (loading) {
    return (
      <Layout title="Settings">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--md-primary)' }} />
        </div>
      </Layout>
    );
  }

  const catanSubs = subscriptions.filter((s) =>
    SUBREDDITS.catan.some((sub) => sub.name === s.subreddit)
  );
  const digitalSubs = subscriptions.filter((s) =>
    SUBREDDITS.digital.some((sub) => sub.name === s.subreddit)
  );
  const generalSubs = subscriptions.filter((s) =>
    SUBREDDITS.general.some((sub) => sub.name === s.subreddit)
  );

  return (
    <Layout title="Settings">
      <InstallSection />

      <section className="mb-8">
        <h2
          className="text-base sm:text-lg font-medium mb-4"
          style={{ color: 'var(--md-primary)' }}
        >
          Catan Subreddits
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {catanSubs.map((sub) => (
            <SubredditRow key={sub.subreddit} subscription={sub} onUpdate={handleUpdate} />
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2
          className="text-base sm:text-lg font-medium mb-4"
          style={{ color: 'var(--md-primary)' }}
        >
          Digital Platforms
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {digitalSubs.map((sub) => (
            <SubredditRow key={sub.subreddit} subscription={sub} onUpdate={handleUpdate} />
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2
          className="text-base sm:text-lg font-medium mb-3"
          style={{ color: 'var(--md-primary)' }}
        >
          General Board Games
        </h2>
        <p
          className="text-sm mb-4"
          style={{ color: 'var(--md-on-surface-variant, #D0C4C2)' }}
        >
          These subreddits are filtered by default to only show Catan-related posts.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {generalSubs.map((sub) => (
            <SubredditRow key={sub.subreddit} subscription={sub} onUpdate={handleUpdate} />
          ))}
        </div>
      </section>
    </Layout>
  );
}
