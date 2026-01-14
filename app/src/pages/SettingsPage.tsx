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
    <div className="bg-gray-800 rounded-lg p-4 mb-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-white font-medium">r/{subscription.subreddit}</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <Eye className="w-4 h-4" />
            Show in feed
          </label>
          <select
            value={subscription.showFilter}
            onChange={(e) => onUpdate({ ...subscription, showFilter: e.target.value as FilterType })}
            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:border-red-500 focus:outline-none"
          >
            {FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <Bell className="w-4 h-4" />
            Notifications
          </label>
          <select
            value={subscription.notifyFilter}
            onChange={(e) => onUpdate({ ...subscription, notifyFilter: e.target.value as FilterType })}
            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600 focus:border-red-500 focus:outline-none"
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
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
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
      <section className="mb-6">
        <h2 className="text-lg font-medium text-gray-300 mb-3">Catan Subreddits</h2>
        {catanSubs.map((sub) => (
          <SubredditRow key={sub.subreddit} subscription={sub} onUpdate={handleUpdate} />
        ))}
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-medium text-gray-300 mb-3">Digital Platforms</h2>
        {digitalSubs.map((sub) => (
          <SubredditRow key={sub.subreddit} subscription={sub} onUpdate={handleUpdate} />
        ))}
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-medium text-gray-300 mb-3">General Board Games</h2>
        <p className="text-sm text-gray-500 mb-3">
          These subreddits are filtered by default to only show Catan-related posts.
        </p>
        {generalSubs.map((sub) => (
          <SubredditRow key={sub.subreddit} subscription={sub} onUpdate={handleUpdate} />
        ))}
      </section>
    </Layout>
  );
}
