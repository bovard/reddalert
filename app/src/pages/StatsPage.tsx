import { Layout } from '../components/Layout';
import { ResponseChart } from '../components/ResponseChart';
import { useResponseStats } from '../hooks/useStats';
import { useAuth } from '../hooks/useAuth';
import { BarChart3, Loader2, MessageCircle, Calendar, CalendarDays, CalendarRange } from 'lucide-react';

export function StatsPage() {
  const { user } = useAuth();
  const { stats, loading } = useResponseStats(user?.uid);

  if (loading) {
    return (
      <Layout title="Stats">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--md-primary)' }} />
        </div>
      </Layout>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <Layout title="Stats">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center mb-5"
            style={{ backgroundColor: 'var(--md-surface-container-highest)' }}
          >
            <BarChart3 className="w-10 h-10 sm:w-12 sm:h-12" style={{ color: 'var(--md-outline)' }} />
          </div>
          <h2 className="text-xl sm:text-2xl font-medium mb-2" style={{ color: 'var(--md-on-surface)' }}>
            No stats yet
          </h2>
          <p className="max-w-md" style={{ color: 'var(--md-on-surface-variant, #D0C4C2)' }}>
            Start responding to posts to see your stats here.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Stats">
      {/* Responsive grid: hero + time stats side by side on larger screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Total responses hero card */}
        <div
          className="rounded-2xl p-6 sm:p-8 text-center md-elevation-2 lg:flex lg:flex-col lg:justify-center"
          style={{ backgroundColor: 'var(--md-tertiary-container)' }}
        >
          <div
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ backgroundColor: 'var(--md-tertiary)', opacity: 0.2 }}
          >
            <MessageCircle className="w-7 h-7 sm:w-8 sm:h-8" style={{ color: 'var(--md-on-tertiary-container)' }} />
          </div>
          <div className="text-5xl sm:text-6xl font-bold mb-1" style={{ color: 'var(--md-on-tertiary-container)' }}>
            {stats.total}
          </div>
          <div className="text-sm sm:text-base font-medium" style={{ color: 'var(--md-on-tertiary-container)', opacity: 0.8 }}>
            Total Responses
          </div>
        </div>

        {/* Time period stats */}
        <div className="grid grid-cols-3 gap-3">
          <div
            className="rounded-2xl p-4 sm:p-5 text-center md-elevation-1"
            style={{ backgroundColor: 'var(--md-surface-container-high)' }}
          >
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-2" style={{ color: 'var(--md-primary)' }} />
            <div className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--md-on-surface)' }}>
              {stats.today}
            </div>
            <div className="text-xs sm:text-sm font-medium" style={{ color: 'var(--md-on-surface-variant, #D0C4C2)' }}>
              Today
            </div>
          </div>
          <div
            className="rounded-2xl p-4 sm:p-5 text-center md-elevation-1"
            style={{ backgroundColor: 'var(--md-surface-container-high)' }}
          >
            <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-2" style={{ color: 'var(--md-primary)' }} />
            <div className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--md-on-surface)' }}>
              {stats.thisWeek}
            </div>
            <div className="text-xs sm:text-sm font-medium" style={{ color: 'var(--md-on-surface-variant, #D0C4C2)' }}>
              This Week
            </div>
          </div>
          <div
            className="rounded-2xl p-4 sm:p-5 text-center md-elevation-1"
            style={{ backgroundColor: 'var(--md-surface-container-high)' }}
          >
            <CalendarRange className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-2" style={{ color: 'var(--md-primary)' }} />
            <div className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--md-on-surface)' }}>
              {stats.thisMonth}
            </div>
            <div className="text-xs sm:text-sm font-medium" style={{ color: 'var(--md-on-surface-variant, #D0C4C2)' }}>
              This Month
            </div>
          </div>
        </div>
      </div>

      {/* Responsive grid: chart + breakdown side by side on larger screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Daily chart */}
        <div
          className="rounded-2xl p-4 sm:p-5 md-elevation-1"
          style={{ backgroundColor: 'var(--md-surface-container-high)' }}
        >
          <h3
            className="text-sm sm:text-base font-medium mb-4"
            style={{ color: 'var(--md-on-surface-variant, #D0C4C2)' }}
          >
            Last 30 Days
          </h3>
          <ResponseChart data={stats.dailyCounts} height={120} />
        </div>

        {/* Per-subreddit breakdown */}
        <div
          className="rounded-2xl p-4 sm:p-5 md-elevation-1"
          style={{ backgroundColor: 'var(--md-surface-container-high)' }}
        >
          <h3
            className="text-sm sm:text-base font-medium mb-4"
            style={{ color: 'var(--md-on-surface-variant, #D0C4C2)' }}
          >
            By Subreddit
          </h3>
          <div className="space-y-4">
            {stats.bySubreddit.map((item) => {
              const percentage = stats.total > 0 ? (item.count / stats.total) * 100 : 0;
              return (
                <div key={item.subreddit}>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-medium" style={{ color: 'var(--md-primary)' }}>
                      r/{item.subreddit}
                    </span>
                    <span style={{ color: 'var(--md-on-surface)' }}>
                      {item.count}{' '}
                      <span style={{ color: 'var(--md-on-surface-variant, #D0C4C2)' }}>
                        ({percentage.toFixed(0)}%)
                      </span>
                    </span>
                  </div>
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'var(--md-surface-container-lowest)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: 'var(--md-tertiary)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
}
