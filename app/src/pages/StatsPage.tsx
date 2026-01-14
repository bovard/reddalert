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
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <Layout title="Stats">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BarChart3 className="w-16 h-16 text-gray-600 mb-4" />
          <h2 className="text-xl font-medium text-gray-300 mb-2">No stats yet</h2>
          <p className="text-gray-500">
            Start responding to posts to see your stats here.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Stats">
      {/* Total responses hero */}
      <div className="bg-gradient-to-br from-green-900/50 to-green-800/30 border border-green-700 rounded-xl p-6 mb-6 text-center">
        <MessageCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
        <div className="text-4xl font-bold text-green-400 mb-1">{stats.total}</div>
        <div className="text-green-300">Total Responses</div>
      </div>

      {/* Time period stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <Calendar className="w-5 h-5 text-gray-400 mx-auto mb-1" />
          <div className="text-2xl font-bold text-white">{stats.today}</div>
          <div className="text-xs text-gray-400">Today</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <CalendarDays className="w-5 h-5 text-gray-400 mx-auto mb-1" />
          <div className="text-2xl font-bold text-white">{stats.thisWeek}</div>
          <div className="text-xs text-gray-400">This Week</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 text-center">
          <CalendarRange className="w-5 h-5 text-gray-400 mx-auto mb-1" />
          <div className="text-2xl font-bold text-white">{stats.thisMonth}</div>
          <div className="text-xs text-gray-400">This Month</div>
        </div>
      </div>

      {/* Daily chart */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-medium text-gray-300 mb-4">Last 30 Days</h3>
        <ResponseChart data={stats.dailyCounts} height={100} />
      </div>

      {/* Per-subreddit breakdown */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-4">By Subreddit</h3>
        <div className="space-y-3">
          {stats.bySubreddit.map((item) => {
            const percentage = stats.total > 0 ? (item.count / stats.total) * 100 : 0;
            return (
              <div key={item.subreddit}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-red-400 font-medium">r/{item.subreddit}</span>
                  <span className="text-gray-300">
                    {item.count} <span className="text-gray-500">({percentage.toFixed(0)}%)</span>
                  </span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-600 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
