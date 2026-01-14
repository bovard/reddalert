import { Layout } from '../components/Layout';
import { PostCard } from '../components/PostCard';
import { useRespondedPosts, useUserStats } from '../hooks/usePosts';
import { useAuth } from '../hooks/useAuth';
import { MessageCircle, Loader2 } from 'lucide-react';

export function HistoryPage() {
  const { user } = useAuth();
  const { posts, loading } = useRespondedPosts(user?.uid);
  const { stats } = useUserStats(user?.uid);

  if (loading) {
    return (
      <Layout title="Responses">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--md-primary)' }} />
        </div>
      </Layout>
    );
  }

  if (posts.length === 0) {
    return (
      <Layout title="Responses">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center mb-5"
            style={{ backgroundColor: 'var(--md-surface-container-highest)' }}
          >
            <MessageCircle className="w-10 h-10 sm:w-12 sm:h-12" style={{ color: 'var(--md-outline)' }} />
          </div>
          <h2 className="text-xl sm:text-2xl font-medium mb-2" style={{ color: 'var(--md-on-surface)' }}>
            No responses yet
          </h2>
          <p className="max-w-md" style={{ color: 'var(--md-on-surface-variant, #D0C4C2)' }}>
            Posts you respond to will appear here.<br />
            Swipe right after commenting on a post.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Responses">
      <div
        className="rounded-2xl p-4 sm:p-5 mb-4 flex items-center gap-3 md-elevation-1"
        style={{ backgroundColor: 'var(--md-tertiary-container)' }}
      >
        <MessageCircle className="w-6 h-6" style={{ color: 'var(--md-on-tertiary-container)' }} />
        <div>
          <span className="font-bold text-lg" style={{ color: 'var(--md-on-tertiary-container)' }}>
            {stats?.totalResponses ?? posts.length}
          </span>
          <span className="ml-2" style={{ color: 'var(--md-on-tertiary-container)' }}>
            total responses
          </span>
        </div>
      </div>
      <p className="text-sm mb-4" style={{ color: 'var(--md-on-surface-variant, #D0C4C2)' }}>
        {posts.length} post{posts.length !== 1 ? 's' : ''} you've responded to
      </p>
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onDismiss={() => {}}
          onMarkResponded={() => {}}
          showActions={false}
        />
      ))}
    </Layout>
  );
}
