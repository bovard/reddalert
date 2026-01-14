import { Layout } from '../components/Layout';
import { useSubscriptions, useUpdateSubscriptions } from '../hooks/useSubscriptions';
import { useAuth } from '../hooks/useAuth';
import { SUBREDDITS } from '../types';
import type { FilterType, Subscription } from '../types';
import { Loader2, Bell, Eye } from 'lucide-react';

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
